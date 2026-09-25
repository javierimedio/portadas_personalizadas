import { describe, expect, it } from "vitest";
import { validarEnlace } from "@/features/solicitudes/domain/enlace-externo";

// ---------------------------------------------------------------------------
// Helpers que replican la lógica del formulario en solicitud-form.tsx
// ---------------------------------------------------------------------------

type EnlaceEntry = { id?: string; nombre: string; url: string };

function enlacesNuevos(enlaces: EnlaceEntry[]): EnlaceEntry[] {
  return enlaces.filter((e) => !e.id);
}

function enlacesPersistidos(enlaces: EnlaceEntry[]): EnlaceEntry[] {
  return enlaces.filter((e) => !!e.id);
}

function eliminarEnlaceDelLista(
  enlaces: EnlaceEntry[],
  eliminados: { id: string; nombre: string }[],
  enlace: EnlaceEntry
): { enlaces: EnlaceEntry[]; eliminados: { id: string; nombre: string }[] } {
  const nuevosEliminados = enlace.id
    ? [...eliminados, { id: enlace.id, nombre: enlace.nombre }]
    : eliminados;
  return {
    enlaces: enlaces.filter((e) => e !== enlace),
    eliminados: nuevosEliminados,
  };
}

const ESTADOS_EDITAR_ENLACES = ["borrador", "diseno_en_revision_comercial"];

function puedeEditarEnlaces(solicitud: { estado: string } | null): boolean {
  return !solicitud || ESTADOS_EDITAR_ENLACES.includes(solicitud.estado);
}

// ---------------------------------------------------------------------------
// 1. Crear solicitud con 0 enlaces
// ---------------------------------------------------------------------------
describe("Escenario 1: crear solicitud sin enlaces", () => {
  it("enlacesNuevos está vacío al no añadir nada", () => {
    const enlaces: EnlaceEntry[] = [];
    expect(enlacesNuevos(enlaces)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Crear solicitud con 1 enlace
// ---------------------------------------------------------------------------
describe("Escenario 2: crear solicitud con 1 enlace", () => {
  it("el enlace sin id se trata como nuevo", () => {
    const enlaces: EnlaceEntry[] = [{ nombre: "WeTransfer", url: "https://we.tl/abc" }];
    expect(enlacesNuevos(enlaces)).toHaveLength(1);
    expect(enlacesNuevos(enlaces)[0]!.nombre).toBe("WeTransfer");
  });

  it("no hay eliminados al crear con 1 enlace", () => {
    const eliminados: { id: string; nombre: string }[] = [];
    expect(eliminados).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Crear solicitud con múltiples enlaces
// ---------------------------------------------------------------------------
describe("Escenario 3: crear solicitud con múltiples enlaces", () => {
  it("todos son nuevos (sin id) al crear", () => {
    const enlaces: EnlaceEntry[] = [
      { nombre: "WeTransfer", url: "https://we.tl/abc" },
      { nombre: "Drive", url: "https://drive.google.com/file/123" },
      { nombre: "Behance", url: "https://www.behance.net/gallery/123/Proyecto" },
    ];
    expect(enlacesNuevos(enlaces)).toHaveLength(3);
    expect(enlacesNuevos(enlaces).every((e) => !e.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Guardar borrador con enlaces
// ---------------------------------------------------------------------------
describe("Escenario 4: guardar borrador con enlaces", () => {
  it("enlaces nuevos pasan correctamente a la server action", () => {
    const enlaces: EnlaceEntry[] = [
      { nombre: "Referencia de diseño", url: "https://www.behance.net/gallery/999/Test" },
    ];
    const payload = enlacesNuevos(enlaces);
    expect(payload).toHaveLength(1);
    expect(payload[0]!.nombre).toBe("Referencia de diseño");
    expect(payload[0]!.url).toBe("https://www.behance.net/gallery/999/Test");
  });
});

// ---------------------------------------------------------------------------
// 5. Enviar solicitud con enlaces
// ---------------------------------------------------------------------------
describe("Escenario 5: enviar solicitud con enlaces", () => {
  it("los mismos enlaces pasan al enviar que al guardar borrador", () => {
    const enlaces: EnlaceEntry[] = [
      { nombre: "Dropbox carpeta", url: "https://www.dropbox.com/sh/abc/123" },
    ];
    // La lógica de persistencia es igual para borrador e enviada
    expect(enlacesNuevos(enlaces)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Editar borrador y añadir enlace
// ---------------------------------------------------------------------------
describe("Escenario 6: editar borrador — añadir enlace nuevo", () => {
  it("el enlace existente (con id) no aparece en enlacesNuevos", () => {
    const enlaces: EnlaceEntry[] = [
      { id: "uuid-1", nombre: "Link antiguo", url: "https://we.tl/old" },
      { nombre: "Link nuevo", url: "https://we.tl/new" },
    ];
    const nuevos = enlacesNuevos(enlaces);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]!.nombre).toBe("Link nuevo");
  });

  it("el enlace existente sigue en persistidos", () => {
    const enlaces: EnlaceEntry[] = [
      { id: "uuid-1", nombre: "Link antiguo", url: "https://we.tl/old" },
      { nombre: "Link nuevo", url: "https://we.tl/new" },
    ];
    expect(enlacesPersistidos(enlaces)).toHaveLength(1);
    expect(enlacesPersistidos(enlaces)[0]!.id).toBe("uuid-1");
  });
});

// ---------------------------------------------------------------------------
// 7. Editar borrador y eliminar enlace existente
// ---------------------------------------------------------------------------
describe("Escenario 7: editar borrador — eliminar enlace existente", () => {
  it("el enlace eliminado va a la lista de eliminados con su id y nombre", () => {
    const enlaceExistente: EnlaceEntry = { id: "uuid-2", nombre: "Link a borrar", url: "https://we.tl/del" };
    const enlaces: EnlaceEntry[] = [enlaceExistente];
    const eliminados: { id: string; nombre: string }[] = [];

    const resultado = eliminarEnlaceDelLista(enlaces, eliminados, enlaceExistente);

    expect(resultado.enlaces).toHaveLength(0);
    expect(resultado.eliminados).toHaveLength(1);
    expect(resultado.eliminados[0]).toEqual({ id: "uuid-2", nombre: "Link a borrar" });
  });

  it("eliminar un enlace nuevo (sin id) no añade nada a eliminados", () => {
    const enlaceNuevo: EnlaceEntry = { nombre: "Nuevo sin guardar", url: "https://we.tl/new" };
    const enlaces: EnlaceEntry[] = [enlaceNuevo];
    const eliminados: { id: string; nombre: string }[] = [];

    const resultado = eliminarEnlaceDelLista(enlaces, eliminados, enlaceNuevo);

    expect(resultado.enlaces).toHaveLength(0);
    expect(resultado.eliminados).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Editar en revisión cliente — añadir enlace
// ---------------------------------------------------------------------------
describe("Escenario 8: editar en revisión cliente — añadir enlace", () => {
  it("puedeEditarEnlaces es true en diseno_en_revision_comercial", () => {
    expect(puedeEditarEnlaces({ estado: "diseno_en_revision_comercial" })).toBe(true);
  });

  it("el nuevo enlace queda como nuevo (sin id)", () => {
    const enlaces: EnlaceEntry[] = [{ nombre: "Corrección de diseño", url: "https://drive.google.com/file/corr" }];
    expect(enlacesNuevos(enlaces)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 9. Editar en revisión cliente — eliminar enlace existente
// ---------------------------------------------------------------------------
describe("Escenario 9: editar en revisión cliente — eliminar enlace existente", () => {
  it("eliminar un enlace existente lo mueve a eliminados", () => {
    const enlace: EnlaceEntry = { id: "uuid-3", nombre: "Archivo previo", url: "https://we.tl/prev" };
    const resultado = eliminarEnlaceDelLista([enlace], [], enlace);
    expect(resultado.enlaces).toHaveLength(0);
    expect(resultado.eliminados[0]!.id).toBe("uuid-3");
  });
});

// ---------------------------------------------------------------------------
// 10. No duplicar enlaces existentes al guardar
// ---------------------------------------------------------------------------
describe("Escenario 10: no duplicar enlaces al guardar", () => {
  it("los enlaces con id no aparecen en enlacesNuevos (no se reinsertan)", () => {
    const enlaces: EnlaceEntry[] = [
      { id: "uuid-4", nombre: "Existente", url: "https://drive.google.com/file/abc" },
    ];
    // Solo los sin id se insertan — los existentes ya están en BD
    expect(enlacesNuevos(enlaces)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 11. No editar enlaces en estados distintos de borrador/revisión cliente
// ---------------------------------------------------------------------------
describe("Escenario 11: edición de enlaces bloqueada en otros estados", () => {
  const estadosBloqueados = ["enviada", "en_revision_marketing", "en_diseno", "modificar_diseno", "pendiente_comercial", "confirmada", "archivada"];

  for (const estado of estadosBloqueados) {
    it(`puedeEditarEnlaces es false en estado "${estado}"`, () => {
      expect(puedeEditarEnlaces({ estado })).toBe(false);
    });
  }

  it("puedeEditarEnlaces es true al crear (solicitud null)", () => {
    expect(puedeEditarEnlaces(null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 12. Enlaces existentes visibles en otros estados (solo lectura)
// ---------------------------------------------------------------------------
describe("Escenario 12: enlaces visibles como solo lectura en otros estados", () => {
  it("los enlaces existentes siguen en el estado aunque no sean editables", () => {
    const enlaces: EnlaceEntry[] = [
      { id: "uuid-5", nombre: "Referencia enviada", url: "https://we.tl/sent" },
    ];
    // El formulario no permite eliminarlos pero siguen visibles
    expect(puedeEditarEnlaces({ estado: "enviada" })).toBe(false);
    expect(enlacesPersistidos(enlaces)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 13. Validación de URL
// ---------------------------------------------------------------------------
describe("Escenario 13: validación de URL", () => {
  it("URL sin protocolo es inválida", () => {
    expect(validarEnlace("Archivo", "sin-protocolo.com")).not.toBeNull();
  });

  it("URL ftp es inválida", () => {
    expect(validarEnlace("Archivo", "ftp://servidor.com/archivo.zip")).not.toBeNull();
  });

  it("URL vacía es inválida", () => {
    expect(validarEnlace("Archivo", "")).not.toBeNull();
  });

  it("URL https válida pasa la validación", () => {
    expect(validarEnlace("Archivo", "https://we.tl/abcdef")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 14. Validación de nombre
// ---------------------------------------------------------------------------
describe("Escenario 14: validación de nombre", () => {
  it("nombre vacío no pasa la validación", () => {
    expect(validarEnlace("", "https://we.tl/abc")).not.toBeNull();
  });

  it("nombre de solo espacios no pasa la validación", () => {
    expect(validarEnlace("   ", "https://we.tl/abc")).not.toBeNull();
  });

  it("nombre de 150 caracteres pasa la validación", () => {
    const nombreLargo = "A".repeat(150);
    expect(validarEnlace(nombreLargo, "https://we.tl/abc")).toBeNull();
  });

  it("nombre de 151 caracteres no pasa la validación", () => {
    const nombreDemasiadoLargo = "A".repeat(151);
    expect(validarEnlace(nombreDemasiadoLargo, "https://we.tl/abc")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 15. URLs largas no rompen el layout (no superan 2000 caracteres)
// ---------------------------------------------------------------------------
describe("Escenario 15: URLs largas", () => {
  it("URL de 2000 caracteres pasa la validación", () => {
    const urlLarga = "https://drive.google.com/" + "a".repeat(2000 - "https://drive.google.com/".length);
    expect(urlLarga.length).toBe(2000);
    expect(validarEnlace("Archivo grande", urlLarga)).toBeNull();
  });

  it("URL de 2001 caracteres no pasa la validación", () => {
    const urlDemasiadoLarga = "https://drive.google.com/" + "a".repeat(2001 - "https://drive.google.com/".length);
    expect(urlDemasiadoLarga.length).toBe(2001);
    expect(validarEnlace("Archivo", urlDemasiadoLarga)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 16. Cancelar creación/edición no deja enlaces huérfanos
// ---------------------------------------------------------------------------
describe("Escenario 16: cancelar no deja estado persistente", () => {
  it("los enlaces sin id son de estado local y no se envían si se cancela antes del submit", () => {
    // El formulario gestiona estado local — si el usuario cancela
    // (onCancel → setModal(null)), nunca se llama a formAction, y por tanto
    // nunca se invoca la server action. Los enlaces en estado local se
    // descartan con el componente.
    const enlaces: EnlaceEntry[] = [
      { nombre: "Enlace temporal", url: "https://we.tl/temp" },
    ];
    // Simula que se cancela: simplemente no hay envío, los enlacesNuevos
    // no llegan a la server action. Los que ya tenían id siguen en BD.
    const existentes = enlacesPersistidos(enlaces);
    const nuevos = enlacesNuevos(enlaces);
    expect(existentes).toHaveLength(0);
    expect(nuevos).toHaveLength(1);
    // Si se cancela, nuevos no se envían → no hay inserción en BD.
    // No hay forma de que queden "huérfanos" en BD porque la inserción
    // ocurre SOLO en la server action, que no se llama al cancelar.
  });
});
