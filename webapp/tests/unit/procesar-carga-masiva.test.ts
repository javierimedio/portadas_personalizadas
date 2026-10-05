import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UploadedFile } from "@/shared/storage/types";

// ---------------------------------------------------------------------------
// Mocks — deben declararse antes de los imports que los usan
// ---------------------------------------------------------------------------
vi.mock("@/shared/infrastructure/supabase/server-client", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/shared/storage/server", () => ({
  borrarArchivosStorage: vi.fn(),
  storagePathDesdeUrl: vi.fn().mockReturnValue(null),
}));
vi.mock("@/features/solicitudes/application/detalle-actions", () => ({
  cambiarEstado: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/features/solicitudes/domain/portadas-validation", () => ({
  portadasObligatoriasPendientes: vi.fn().mockReturnValue([]),
  mensajePortadasPendientes: vi.fn().mockReturnValue(""),
}));

import { procesarCargaMasiva } from "@/features/diseno/application/procesar-carga-masiva.action";
import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { borrarArchivosStorage } from "@/shared/storage/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Builds a chainable Supabase query builder whose terminal value (maybySingle
// or await) resolves to `data`. Chainable via .select/.eq/.is/.in.
function qbData(data: any) {
  const leaf = {
    maybeSingle: () => Promise.resolve({ data }),
    // thenable: makes `await qb` resolve to { data }
    then: (resolve: (v: any) => void, reject: (e: any) => void) =>
      Promise.resolve({ data }).then(resolve, reject),
  };
  function chain(): any {
    return { select: (_: any) => chain(), eq: (_: any, __: any) => chain(), is: (_: any, __: any) => chain(), in: (_: any, __: any) => chain(), ...leaf };
  }
  return chain();
}

type AdjuntosScenario = {
  existente?: any;
  updateError?: any;
  insertError?: any;
  validacion?: any[];
};

// Creates a minimal Supabase mock for procesarCargaMasiva.
// `solicitudesData` must include the solicitudes the test wants to match.
function makeSupa({
  solicitudesData = [] as any[],
  adjuntos = {} as AdjuntosScenario,
  solicitudCatalogosData = [] as any[],
} = {}) {
  const perfil = { nombre: "Diseñador" };
  const user = { id: "u-test" };
  const { existente = null, updateError = null, insertError = null, validacion = [] } = adjuntos;

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn((table: string) => {
      if (table === "perfiles") return qbData(perfil);
      if (table === "solicitudes") return qbData(solicitudesData);
      if (table === "solicitud_catalogos") return qbData(solicitudCatalogosData);
      if (table === "adjuntos") {
        return {
          select: (fields: string) => {
            if (fields.includes("tipo")) {
              // Validation SELECT — directly awaited
              return qbData(validacion);
            }
            // Existente SELECT — terminates with .maybeSingle()
            return qbData(existente);
          },
          update: (_payload: any) => ({
            eq: (_col: string, _val: any) => Promise.resolve({ error: updateError }),
          }),
          insert: (_payload: any) => Promise.resolve({ error: insertError }),
        };
      }
      return qbData(null);
    }),
    storage: { from: vi.fn() },
  };
}

function makeSolicitud(codSap: string, id: string, catalogos: { catalogo: string; portada_personalizada: boolean }[] = []) {
  return { id, cod_sap: codSap, nombre_empresa: "EMPRESA", estado: "modificar_diseno", solicitud_catalogos: catalogos };
}

function makeArchivo(nombre: string, path: string): UploadedFile {
  return { nombre, path, url: `https://host/storage/v1/object/public/portadas-adjuntos/${path}`, tipo: "application/pdf", size: 100 };
}

function makeAdj(overrides: Partial<{ id: string; storage_path: string; url: string; catalogo: string | null; nombre: string }> = {}) {
  return {
    id: "adj-1",
    storage_path: "diseno/old/old-file.pdf",
    url: "https://host/storage/v1/object/public/portadas-adjuntos/diseno/old/old-file.pdf",
    catalogo: "roly",
    nombre: "65878_roly.pdf",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(borrarArchivosStorage).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// 1. UPDATE OK + borrar antiguo OK → nuevo queda, antiguo se elimina,
//    nuevo NO entra en sinUso
// ---------------------------------------------------------------------------
describe("1. UPDATE OK + borrar antiguo OK", () => {
  it("resultado ok:1 errors:0, nuevo NO en sinUso, antiguo eliminado", async () => {
    const OLD_PATH = "diseno/old/1700_xyz_65878_roly.pdf";
    const NEW_PATH = "diseno/carga-masiva/1800_abc_65878_roly.pdf";

    vi.mocked(createClient).mockResolvedValue(
      makeSupa({
        solicitudesData: [makeSolicitud("65878", "sol-1", [{ catalogo: "roly", portada_personalizada: true }])],
        adjuntos: { existente: makeAdj({ storage_path: OLD_PATH, catalogo: "roly", nombre: "65878_roly.pdf" }), updateError: null },
      }) as any
    );

    const result = await procesarCargaMasiva([makeArchivo("65878_roly.pdf", NEW_PATH)]);

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.ok).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.resultados[0]!.ok).toBe(true);

    const allDeletedPaths = vi.mocked(borrarArchivosStorage).mock.calls.flatMap(([, paths]) => paths as string[]);
    expect(allDeletedPaths).not.toContain(NEW_PATH);
    // antiguo se elimina (borrar callback lo intenta)
    expect(allDeletedPaths).toContain(OLD_PATH);
  });
});

// ---------------------------------------------------------------------------
// 2. UPDATE OK + borrar antiguo FALLA → nuevo queda, nuevo NO entra en sinUso
//    Este es el bug exacto del caso 65878: borrar lanzaba → catch → sinUso →
//    borrarArchivosStorage(nuevo) → 404 NoSuchKey.
//    Con el fix: borrar está envuelto en try/catch → excepción ignorada →
//    reemplazarDisenoSeguro retorna {} → catch exterior no ejecuta → nuevo intacto.
// ---------------------------------------------------------------------------
describe("2. UPDATE OK + borrar antiguo FALLA (P22 bug — caso 65878)", () => {
  it("resultado ok:1 errors:0, nuevo NO en sinUso aunque borrar antiguo lance excepción", async () => {
    const OLD_PATH = "diseno/old/1700_xyz_65878_roly.pdf";
    const NEW_PATH = "diseno/carga-masiva/1800_abc_65878_roly.pdf";

    // borrarArchivosStorage lanza para cualquier path no-vacío (simula fallo de Storage)
    vi.mocked(borrarArchivosStorage).mockImplementation((_supa: any, paths: string[]) => {
      if (!paths.length) return Promise.resolve(undefined);
      throw new Error("storage deletion failed");
    });

    vi.mocked(createClient).mockResolvedValue(
      makeSupa({
        solicitudesData: [makeSolicitud("65878", "sol-1", [{ catalogo: "roly", portada_personalizada: true }])],
        adjuntos: { existente: makeAdj({ storage_path: OLD_PATH, catalogo: "roly", nombre: "65878_roly.pdf" }), updateError: null },
      }) as any
    );

    const result = await procesarCargaMasiva([makeArchivo("65878_roly.pdf", NEW_PATH)]);

    // La función debe terminar con éxito (ok:1) a pesar del fallo de borrar
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.ok).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.resultados[0]!.ok).toBe(true);

    // INVARIANTE P22: el archivo nuevo nunca fue eliminado de Storage
    const allDeletedPaths = vi.mocked(borrarArchivosStorage).mock.calls.flatMap(([, paths]) => paths as string[]);
    expect(allDeletedPaths).not.toContain(NEW_PATH);
  });

  it("tres archivos simultáneos — ninguno de los nuevos entra en sinUso aunque borrar falle", async () => {
    const PATHS = {
      roly: { old: "diseno/old/1700_r.pdf", new: "diseno/cm/1800_r.pdf" },
      stm: { old: "diseno/old/1700_s.pdf", new: "diseno/cm/1800_s.pdf" },
      wrk: { old: "diseno/old/1700_w.pdf", new: "diseno/cm/1800_w.pdf" },
    };

    vi.mocked(borrarArchivosStorage).mockImplementation((_supa: any, paths: string[]) => {
      if (!paths.length) return Promise.resolve(undefined);
      throw new Error("storage error");
    });

    vi.mocked(createClient).mockResolvedValue(
      makeSupa({
        solicitudesData: [
          makeSolicitud("65878", "sol-1", [
            { catalogo: "roly", portada_personalizada: true },
            { catalogo: "stamina", portada_personalizada: true },
            { catalogo: "roly_wrk", portada_personalizada: true },
          ]),
        ],
        // existente simplificado: misma respuesta para los tres SELECT
        adjuntos: { existente: makeAdj({ storage_path: PATHS.roly.old, catalogo: "roly", nombre: "65878_roly.pdf" }), updateError: null },
      }) as any
    );

    const archivos = [
      makeArchivo("65878_roly.pdf", PATHS.roly.new),
      makeArchivo("65878_stm.pdf", PATHS.stm.new),
      makeArchivo("65878_wrk.pdf", PATHS.wrk.new),
    ];

    const result = await procesarCargaMasiva(archivos);

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.ok).toBe(3);
    expect(result.errors).toBe(0);

    const allDeletedPaths = vi.mocked(borrarArchivosStorage).mock.calls.flatMap(([, paths]) => paths as string[]);
    expect(allDeletedPaths).not.toContain(PATHS.roly.new);
    expect(allDeletedPaths).not.toContain(PATHS.stm.new);
    expect(allDeletedPaths).not.toContain(PATHS.wrk.new);
  });
});

// ---------------------------------------------------------------------------
// 3. UPDATE falla → BD antigua permanece, nuevo SE LIMPIA, errors:1
// ---------------------------------------------------------------------------
describe("3. UPDATE falla", () => {
  it("resultado ok:0 errors:1, nuevo entra en sinUso y se limpia", async () => {
    const NEW_PATH = "diseno/carga-masiva/1800_abc_65878_roly.pdf";

    vi.mocked(createClient).mockResolvedValue(
      makeSupa({
        solicitudesData: [makeSolicitud("65878", "sol-1", [{ catalogo: "roly", portada_personalizada: true }])],
        adjuntos: { existente: makeAdj({ catalogo: "roly", nombre: "65878_roly.pdf" }), updateError: { message: "permission denied" } },
      }) as any
    );

    const result = await procesarCargaMasiva([makeArchivo("65878_roly.pdf", NEW_PATH)]);

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.ok).toBe(0);
    expect(result.errors).toBe(1);
    expect(result.resultados[0]!.ok).toBe(false);

    // sinUso contiene el nuevo path → se elimina vía borrarArchivosStorage(sinUso)
    const sinUsoCall = vi.mocked(borrarArchivosStorage).mock.calls.find(([, paths]) => (paths as string[]).includes(NEW_PATH));
    expect(sinUsoCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. INSERT OK → nuevo queda referenciado en BD, NO en sinUso
// ---------------------------------------------------------------------------
describe("4. INSERT OK (archivo nuevo sin adjunto previo)", () => {
  it("resultado ok:1 errors:0, nuevo NO en sinUso", async () => {
    const NEW_PATH = "diseno/carga-masiva/1800_abc_65878_roly.pdf";

    vi.mocked(createClient).mockResolvedValue(
      makeSupa({
        solicitudesData: [makeSolicitud("65878", "sol-1", [{ catalogo: "roly", portada_personalizada: true }])],
        adjuntos: { existente: null, insertError: null },
      }) as any
    );

    const result = await procesarCargaMasiva([makeArchivo("65878_roly.pdf", NEW_PATH)]);

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.ok).toBe(1);
    expect(result.errors).toBe(0);

    const allDeletedPaths = vi.mocked(borrarArchivosStorage).mock.calls.flatMap(([, paths]) => paths as string[]);
    expect(allDeletedPaths).not.toContain(NEW_PATH);
  });
});

// ---------------------------------------------------------------------------
// 5. INSERT falla → nuevo no tiene dueño en BD, SE LIMPIA
// ---------------------------------------------------------------------------
describe("5. INSERT falla", () => {
  it("resultado ok:0 errors:1, nuevo entra en sinUso y se limpia", async () => {
    const NEW_PATH = "diseno/carga-masiva/1800_abc_65878_roly.pdf";

    vi.mocked(createClient).mockResolvedValue(
      makeSupa({
        solicitudesData: [makeSolicitud("65878", "sol-1", [{ catalogo: "roly", portada_personalizada: true }])],
        adjuntos: { existente: null, insertError: { message: "unique constraint" } },
      }) as any
    );

    const result = await procesarCargaMasiva([makeArchivo("65878_roly.pdf", NEW_PATH)]);

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.ok).toBe(0);
    expect(result.errors).toBe(1);

    const sinUsoCall = vi.mocked(borrarArchivosStorage).mock.calls.find(([, paths]) => (paths as string[]).includes(NEW_PATH));
    expect(sinUsoCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 6. notfound / nocatalog → nuevo nunca llega a BD, SE LIMPIA
// ---------------------------------------------------------------------------
describe("6. notfound / nocatalog → nuevo se limpia", () => {
  it("notfound: SAP inexistente → errors:1, nuevo en sinUso", async () => {
    const NEW_PATH = "diseno/carga-masiva/1800_abc_99999_roly.pdf";
    vi.mocked(createClient).mockResolvedValue(makeSupa({ solicitudesData: [] }) as any);

    const result = await procesarCargaMasiva([makeArchivo("99999_roly.pdf", NEW_PATH)]);

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.ok).toBe(0);
    expect(result.errors).toBe(1);

    const sinUsoCall = vi.mocked(borrarArchivosStorage).mock.calls.find(([, paths]) => (paths as string[]).includes(NEW_PATH));
    expect(sinUsoCall).toBeDefined();
  });

  it("nocatalog: catálogo sin portada_personalizada → errors:1, nuevo en sinUso", async () => {
    const NEW_PATH = "diseno/carga-masiva/1800_abc_65878_roly.pdf";
    vi.mocked(createClient).mockResolvedValue(
      makeSupa({
        solicitudesData: [makeSolicitud("65878", "sol-1", [{ catalogo: "roly", portada_personalizada: false }])],
      }) as any
    );

    const result = await procesarCargaMasiva([makeArchivo("65878_roly.pdf", NEW_PATH)]);

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.ok).toBe(0);
    expect(result.errors).toBe(1);

    const sinUsoCall = vi.mocked(borrarArchivosStorage).mock.calls.find(([, paths]) => (paths as string[]).includes(NEW_PATH));
    expect(sinUsoCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. Tres archivos simultáneos (caso real solicitud 65878) — todos UPDATE OK
//    Ninguno de los nuevos paths debe entrar en sinUso.
// ---------------------------------------------------------------------------
describe("7. Tres archivos simultáneos — todos OK", () => {
  it("ok:3 errors:0, ninguno de los nuevos paths eliminado de Storage", async () => {
    const NUEVOS = [
      "diseno/cm/1800_a_65878_roly.pdf",
      "diseno/cm/1800_b_65878_stm.pdf",
      "diseno/cm/1800_c_65878_wrk.pdf",
    ] as const;

    vi.mocked(createClient).mockResolvedValue(
      makeSupa({
        solicitudesData: [
          makeSolicitud("65878", "sol-65878", [
            { catalogo: "roly", portada_personalizada: true },
            { catalogo: "stamina", portada_personalizada: true },
            { catalogo: "roly_wrk", portada_personalizada: true },
          ]),
        ],
        adjuntos: {
          existente: makeAdj({ storage_path: "diseno/old/old.pdf", catalogo: "roly", nombre: "65878_roly.pdf" }),
          updateError: null,
        },
      }) as any
    );

    const archivos = [
      makeArchivo("65878_roly.pdf", NUEVOS[0]),
      makeArchivo("65878_stm.pdf", NUEVOS[1]),
      makeArchivo("65878_wrk.pdf", NUEVOS[2]),
    ];

    const result = await procesarCargaMasiva(archivos);

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.ok).toBe(3);
    expect(result.errors).toBe(0);
    for (const r of result.resultados) expect(r.ok).toBe(true);

    const allDeletedPaths = vi.mocked(borrarArchivosStorage).mock.calls.flatMap(([, paths]) => paths as string[]);
    expect(allDeletedPaths).not.toContain(NUEVOS[0]);
    expect(allDeletedPaths).not.toContain(NUEVOS[1]);
    expect(allDeletedPaths).not.toContain(NUEVOS[2]);
  });
});

// ---------------------------------------------------------------------------
// 8. portada_elegida — nunca se modifica
//    procesarCargaMasiva solo escribe en: adjuntos (INSERT/UPDATE) y
//    llama a cambiarEstado (que solo toca solicitudes.estado).
//    solicitud_catalogos.portada_elegida nunca recibe un UPDATE.
// ---------------------------------------------------------------------------
describe("8. portada_elegida no se modifica", () => {
  it("from() nunca se llama con UPDATE sobre solicitud_catalogos", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupa({
        solicitudesData: [makeSolicitud("65878", "sol-1", [{ catalogo: "roly", portada_personalizada: true }])],
        adjuntos: { existente: null, insertError: null },
      }) as any
    );

    await procesarCargaMasiva([makeArchivo("65878_roly.pdf", "diseno/cm/new.pdf")]);

    const supabase = await vi.mocked(createClient).mock.results[0]!.value;
    const fromCalls: string[] = vi.mocked(supabase.from).mock.calls.map(([t]: [string]) => t);

    // solicitud_catalogos puede aparecer en SELECT (validación), pero nunca en UPDATE
    const solCatReturns = vi.mocked(supabase.from).mock.results.filter(
      (_r: any, i: number) => fromCalls[i] === "solicitud_catalogos"
    );
    for (const ret of solCatReturns) {
      // El builder retornado no debería tener update llamado con portada_elegida
      expect(ret.value).not.toHaveProperty("portada_elegida");
    }

    // Más directo: el adjunto UPDATE solo toca campos de adjuntos
    const adjReturns = vi.mocked(supabase.from).mock.results.filter(
      (_r: any, i: number) => fromCalls[i] === "adjuntos"
    );
    for (const ret of adjReturns) {
      const builder = ret.value;
      if (typeof builder.update === "function") {
        // Verificar que si se llama a update, no pasa portada_elegida
        const updateArg = vi.mocked(builder.update as any).mock?.calls?.[0]?.[0];
        if (updateArg) expect(updateArg).not.toHaveProperty("portada_elegida");
      }
      if (typeof builder.insert === "function") {
        const insertArg = vi.mocked(builder.insert as any).mock?.calls?.[0]?.[0];
        if (insertArg) expect(insertArg).not.toHaveProperty("portada_elegida");
      }
    }
  });
});
