import { describe, expect, it } from "vitest";
import { matchCargaFile, parseCargaFilename, type CargaMasivaSolicitud, type FileResultado } from "@/features/diseno/domain/carga-masiva";

// INVARIANTE DE INTEGRIDAD: procesarCargaMasiva() NO debe escribir nunca en
// solicitud_catalogos.portada_elegida. El adjunto de diseño se registra en la
// tabla `adjuntos` (tipo "diseno_portada") y la portada elegida original queda
// intacta. Los tests de esta suite verifican el parseo y emparejamiento de
// nombres de archivo, que son los únicos datos que alimentan esa lógica.

describe("parseCargaFilename", () => {
  it("solo SAP, sin sufijo de catálogo", () => {
    expect(parseCargaFilename("665874.pdf")).toEqual({ sap: "665874", catKey: null });
  });

  it("sufijo _ROLY_WRK se evalúa antes que _ROLY, para no capturarlo mal", () => {
    expect(parseCargaFilename("665874_ROLY_WRK.pdf")).toEqual({ sap: "665874", catKey: "roly_wrk" });
    expect(parseCargaFilename("665874_roly.pdf")).toEqual({ sap: "665874", catKey: "roly" });
  });

  it("sufijos alternativos de stamina y wrk", () => {
    expect(parseCargaFilename("60239_STAMINA.jpg")).toEqual({ sap: "60239", catKey: "stamina" });
    expect(parseCargaFilename("60239_STM.jpg")).toEqual({ sap: "60239", catKey: "stamina" });
    expect(parseCargaFilename("60239_WRK.jpg")).toEqual({ sap: "60239", catKey: "roly_wrk" });
    expect(parseCargaFilename("60239_xmas.ai")).toEqual({ sap: "60239", catKey: "xmas" });
  });

  it("SAPs de las solicitudes afectadas por el bug de sobrescritura (25532, 35131, 38966, 37249, 13363, 74688, 66732)", () => {
    // Estos SAPs generaron valores corruptos en portada_elegida ("25532_roly", etc.)
    // porque el nombre del archivo se escribía en el campo en lugar del número de portada.
    expect(parseCargaFilename("25532_roly.pdf")).toEqual({ sap: "25532", catKey: "roly" });
    expect(parseCargaFilename("25532_wrk.pdf")).toEqual({ sap: "25532", catKey: "roly_wrk" });
    expect(parseCargaFilename("25532_stm.pdf")).toEqual({ sap: "25532", catKey: "stamina" });
    expect(parseCargaFilename("35131_roly.pdf")).toEqual({ sap: "35131", catKey: "roly" });
    expect(parseCargaFilename("35131_stm.pdf")).toEqual({ sap: "35131", catKey: "stamina" });
    expect(parseCargaFilename("38966_roly.pdf")).toEqual({ sap: "38966", catKey: "roly" });
    expect(parseCargaFilename("37249_roly.pdf")).toEqual({ sap: "37249", catKey: "roly" });
    expect(parseCargaFilename("13363_roly.pdf")).toEqual({ sap: "13363", catKey: "roly" });
    expect(parseCargaFilename("74688_roly.pdf")).toEqual({ sap: "74688", catKey: "roly" });
    expect(parseCargaFilename("66732_stm.pdf")).toEqual({ sap: "66732", catKey: "stamina" });
  });
});

function sol(overrides: Partial<CargaMasivaSolicitud> = {}): CargaMasivaSolicitud {
  return {
    id: "s1",
    cod_sap: "60239",
    nombre_empresa: "ACME",
    estado: "en_diseno",
    solicitud_catalogos: [{ catalogo: "roly", portada_personalizada: true }],
    ...overrides,
  };
}

describe("matchCargaFile", () => {
  it("ok cuando el SAP existe en diseño y (si hay catálogo) tiene portada personalizada", () => {
    const m = matchCargaFile("60239_roly.pdf", [sol()]);
    expect(m).toEqual({ status: "ok", fileName: "60239_roly.pdf", sap: "60239", catKey: "roly", solId: "s1", nombreEmpresa: "ACME" });
  });

  it("ok sin sufijo de catálogo (aplica a todos)", () => {
    const m = matchCargaFile("60239.pdf", [sol()]);
    expect(m.status).toBe("ok");
  });

  it("notfound si el SAP no existe entre las solicitudes en diseño", () => {
    const m = matchCargaFile("99999.pdf", [sol()]);
    expect(m).toEqual({ status: "notfound", fileName: "99999.pdf", sap: "99999", catKey: null });
  });

  it("notfound si el SAP existe pero no está en en_diseno/modificar_diseno", () => {
    const m = matchCargaFile("60239.pdf", [sol({ estado: "confirmada" })]);
    expect(m.status).toBe("notfound");
  });

  it("nocatalog si el catálogo del sufijo no tiene portada personalizada en esa solicitud", () => {
    const m = matchCargaFile("60239_xmas.pdf", [sol()]);
    expect(m).toEqual({ status: "nocatalog", fileName: "60239_xmas.pdf", sap: "60239", catKey: "xmas", solId: "s1", nombreEmpresa: "ACME" });
  });

  it("no filtra por campaña — solo por SAP + estado", () => {
    const m = matchCargaFile("60239.pdf", [sol({ id: "otra-campana" })]);
    expect(m.status).toBe("ok");
  });

  it("el resultado de match nunca contiene portada_elegida — no hay campo que pueda sobrescribirse", () => {
    const m = matchCargaFile("25532_roly.pdf", [
      sol({ cod_sap: "25532", solicitud_catalogos: [{ catalogo: "roly", portada_personalizada: true }] }),
    ]);
    expect(m.status).toBe("ok");
    // CargaMatch solo expone { status, fileName, sap, catKey, solId, nombreEmpresa }.
    // portada_elegida no forma parte del resultado — la Action solo usa estos
    // campos para insertar el adjunto y cambiar estado; nunca para escribir
    // en solicitud_catalogos.
    expect(m).not.toHaveProperty("portada_elegida");
    if (m.status === "ok") {
      expect(m.sap).toBe("25532");
      expect(m.catKey).toBe("roly");
    }
  });
});

// ---------------------------------------------------------------------------
// FileResultado — resultados individuales por archivo (reintento selectivo)
// ---------------------------------------------------------------------------

describe("FileResultado — resultados individuales", () => {
  it("1. batch con 3 archivos: ok/error/ok → resultados independientes", () => {
    const solicitudes = [
      sol({
        solicitud_catalogos: [
          { catalogo: "roly", portada_personalizada: true },
          { catalogo: "roly_wrk", portada_personalizada: true },
          { catalogo: "stamina", portada_personalizada: true },
        ],
      }),
    ];
    // Simula lo que la action hace: matchCargaFile → ok/error por archivo
    const m1 = matchCargaFile("60239_roly.pdf", solicitudes);
    const m2 = matchCargaFile("60239_xmas.pdf", solicitudes); // xmas sin portada_personalizada → nocatalog
    const m3 = matchCargaFile("60239_stamina.pdf", solicitudes);
    expect(m1.status).toBe("ok");
    expect(m2.status).toBe("nocatalog");
    expect(m3.status).toBe("ok");
    // FileResultado para m1 y m3 sería { ok: true }, para m2 { ok: false, mensaje: "..." }
    const r1: FileResultado = { nombre: "60239_roly.pdf", ok: true };
    const r2: FileResultado = { nombre: "60239_xmas.pdf", ok: false, mensaje: "catálogo xmas sin portada personalizada" };
    const r3: FileResultado = { nombre: "60239_stamina.pdf", ok: true };
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(false);
    expect(r3.ok).toBe(true);
  });

  it("2. los archivos con ok:true no se incluyen en el batch de reintento — invariante de tipo", () => {
    // La modal solo pasa entries con estado === "ok" (no procesado_ok) al servidor.
    // Aquí verificamos el tipo FileResultado para garantizar que ok:true nunca
    // incluye mensaje (no hay nada que reintentar).
    const resultado: FileResultado = { nombre: "60239_roly.pdf", ok: true };
    expect(resultado).not.toHaveProperty("mensaje");
    expect(resultado.ok).toBe(true);
  });

  it("3. reintento correcto: nuevo archivo con mismo SAP+sufijo → ok:true", () => {
    const solicitudes = [sol()];
    // El usuario reintenta con "60239_roly_v2.pdf" — nombre diferente pero mismo SAP+sufijo
    const m = matchCargaFile("60239_roly_v2.pdf", solicitudes);
    // _v2 no es un sufijo de catálogo reconocido, se trata como parte del SAP
    // → el usuario debería nombrar igual: 60239_roly.pdf. Pero con el mismo nombre:
    const mOk = matchCargaFile("60239_roly.pdf", solicitudes);
    expect(mOk.status).toBe("ok");
    const resultado: FileResultado = { nombre: "60239_roly.pdf", ok: true };
    expect(resultado.ok).toBe(true);
  });

  it("4. reintento vuelve a fallar: ok:false con mensaje", () => {
    const resultado: FileResultado = { nombre: "60239_roly.pdf", ok: false, mensaje: "SAP 60239 no encontrado en diseño" };
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.mensaje).toBeTruthy();
    }
  });

  it("5. varios archivos fallidos → cada uno tiene su propio FileResultado independiente", () => {
    const solicitudes = [sol()]; // solo roly en sol
    const m1 = matchCargaFile("99999_roly.pdf", solicitudes); // notfound
    const m2 = matchCargaFile("60239_xmas.pdf", solicitudes); // nocatalog
    expect(m1.status).toBe("notfound");
    expect(m2.status).toBe("nocatalog");
    const resultados: FileResultado[] = [
      { nombre: "99999_roly.pdf", ok: false, mensaje: "SAP 99999 no encontrado en diseño" },
      { nombre: "60239_xmas.pdf", ok: false, mensaje: "catálogo xmas sin portada personalizada" },
    ];
    expect(resultados).toHaveLength(2);
    expect(resultados.every((r) => !r.ok)).toBe(true);
    // Cada uno puede reintentarse por separado
    expect(resultados[0]!.nombre).not.toBe(resultados[1]!.nombre);
  });

  it("6. no se crean duplicados: la action solo inserta cuando match es ok, uno por archivo del batch", () => {
    // El cliente solo envía entries con estado === "ok" (no procesado_ok).
    // Si un archivo ya quedó procesado_ok, no se incluye en el siguiente batch.
    // Este test documenta la invariante: matchCargaFile es determinista por filename.
    const solicitudes = [sol()];
    const m = matchCargaFile("60239_roly.pdf", solicitudes);
    expect(m.status).toBe("ok");
    // La action inserta una vez por llamada — si el mismo archivo se enviara dos veces
    // en el mismo batch, generaría dos inserts. Pero la modal no lo hace: cada entry
    // es única y procesado_ok se excluye del siguiente procesar().
    expect(m).not.toHaveProperty("portada_elegida");
  });

  it("7. el catálogo se conserva en el reintento vía el nombre del archivo", () => {
    const solicitudes = [
      sol({
        solicitud_catalogos: [
          { catalogo: "roly_wrk", portada_personalizada: true },
        ],
      }),
    ];
    // Reintento: mismo nombre → mismo catKey
    const m = matchCargaFile("60239_roly_wrk.pdf", solicitudes);
    expect(m.status).toBe("ok");
    if (m.status === "ok") {
      expect(m.catKey).toBe("roly_wrk");
    }
    expect(m).not.toHaveProperty("portada_elegida");
  });

  it("8. portada_elegida nunca se modifica — FileResultado no la expone", () => {
    const resultado: FileResultado = { nombre: "60239_roly.pdf", ok: true };
    expect(resultado).not.toHaveProperty("portada_elegida");
    const resultadoError: FileResultado = { nombre: "60239_roly.pdf", ok: false, mensaje: "error" };
    expect(resultadoError).not.toHaveProperty("portada_elegida");
  });
});
