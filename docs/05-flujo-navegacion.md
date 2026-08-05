# 5. Flujo de navegación

## 5.1 Sitemap

```mermaid
flowchart TD
    Login["/login"] --> App["Layout autenticado"]
    App --> Dashboard["/dashboard\n(admin, marketing, responsable_comercial, responsable_diseno)"]
    App --> Solicitudes["/solicitudes\n(comercial: propias · responsable_comercial: su canal)"]
    Solicitudes --> SolicitudDetalle["/solicitudes/:id"]
    App --> Panel["/panel\n(admin, marketing — todas + export)"]
    App --> Diseno["/diseno\n(disenador: asignadas · responsable_diseno: todas)"]
    App --> Campanas["/campanas\n(admin, marketing)"]
    Campanas --> CampanaDetalle["/campanas/:id"]
    App --> Usuarios["/usuarios\n(admin, marketing)"]
    App --> Perfil["/perfil\n(todos, vía header)"]

    SolicitudDetalle -.contiene.-> SD_Catalogos["Secciones por catálogo activo"]
    SolicitudDetalle -.contiene.-> SD_Adjuntos["Logo cliente + diseños"]
    SolicitudDetalle -.contiene.-> SD_Historial["Historial / comentarios / menciones"]
    Diseno -.enlaza.-> SolicitudDetalle
    Panel -.enlaza.-> SolicitudDetalle
```

Cada rol solo ve en el nav las páginas para las que tiene permiso (ver tabla de la sección 1.4 de `01-analisis-funcional.md`); esto es la misma restricción que hoy aplica `buildNav()`, pero reforzada por RLS en cada consulta subyacente, no solo en qué enlaces se pintan.

## 5.2 Flujo crítico: ciclo de vida de una solicitud

```mermaid
sequenceDiagram
    actor C as Comercial
    actor D as Diseñador
    participant App
    participant DB as PostgreSQL

    C->>App: Crea solicitud (campaña + cliente + catálogos)
    App->>DB: insert solicitudes (estado=borrador), insert solicitud_catalogos
    C->>App: Enviar solicitud
    App->>DB: update estado=enviada, enviada_at=now(), insert logs(cambio_estado)
    App->>DB: insert notificaciones (destinatario: marketing/admin)

    Note over App: Revisión de marketing
    App->>DB: update estado=en_revision_marketing
    App->>DB: update estado=en_diseno (enviarADiseno, sin asignado_id)

    D->>App: Abre la solicitud sin asignar
    App->>DB: update asignado_id = D (autoasignación)
    D->>App: Sube diseño final (o via carga masiva)
    App->>DB: insert adjuntos, update solicitud_catalogos.portada_elegida
    D->>App: Diseño listo
    App->>DB: update estado=diseno_en_revision_comercial
    App->>DB: insert notificaciones (destinatario: comercial)

    Note over App,C: Revisión del cliente
    alt Confirma
        C->>App: Confirmar diseño
        App->>DB: update estado=confirmada
    else Pide modificación
        C->>App: Solicitar modificación (comentario + adjunto opcional)
        App->>DB: update estado=modificar_diseno, insert logs
        App->>DB: insert notificaciones (destinatario: diseño)
    else Archiva
        C->>App: Archivar
        App->>DB: update estado=archivada (terminal, deja de contar en KPIs)
    end
```

## 5.3 Máquina de estados de una solicitud

```mermaid
stateDiagram-v2
    [*] --> borrador
    borrador --> enviada: Comercial envía
    enviada --> borrador: Marketing/Admin devuelve
    enviada --> en_revision_marketing: Marketing/Admin inicia revisión
    en_revision_marketing --> borrador: Marketing/Admin devuelve
    en_revision_marketing --> en_diseno: Marketing/Admin envía a diseño
    en_diseno --> diseno_en_revision_comercial: Diseño marca listo
    modificar_diseno --> diseno_en_revision_comercial: Diseño marca listo
    diseno_en_revision_comercial --> modificar_diseno: Comercial pide modificación
    diseno_en_revision_comercial --> confirmada: Comercial confirma
    diseno_en_revision_comercial --> archivada: Comercial/Admin archiva
    confirmada --> [*]
    archivada --> [*]

    note right of archivada
        Terminal: una solicitud archivada
        no vuelve a cambiar de estado.
        Se excluye de KPIs y exportaciones,
        pero no se borra.
    end note
```

Cada flecha de este diagrama es una Server Action distinta (`enviarADiseno`, `marcarDisenoListo`, `confirmarDiseno`, `solicitarModificacion`, `archivarSolicitud`...), nunca un `UPDATE estado = ...` genérico — así la validación de "quién puede hacer esta transición" vive en un solo sitio por transición, no repartida en un `switch` grande.

## 5.4 Flujo: carga masiva de diseños

```mermaid
flowchart LR
    A["Diseñador sube N archivos"] --> B["parseCargaFilename por archivo:\nSAP + catálogo (opcional)"]
    B --> C["matchCargaFile contra solicitudes\nen en_diseno/modificar_diseno"]
    C --> D{"¿Match?"}
    D -->|"OK"| E["Preview ✅ — confirmar"]
    D -->|"SAP no encontrado"| F["Preview ❌ — no bloquea el resto"]
    D -->|"Catálogo sin portada_personalizada"| G["Preview ⚠️ — no bloquea el resto"]
    E --> H["Subir a Storage + insert adjuntos\n+ update portada_elegida"]
    H --> I["Agrupar por solicitud →\nun solo cambio de estado por solicitud"]
    I --> J["estado = diseno_en_revision_comercial"]
```

Este flujo se mantiene exactamente igual que hoy (es como el equipo de diseño ya trabaja) — lo que cambia es que `matchCargaFile` consulta contra RLS igual que cualquier otra lectura, y la actualización final pasa por la misma Server Action `marcarDisenoListo` que se usaría subiendo un archivo individual, evitando lógica duplicada entre los dos caminos.

## 5.5 Flujo: notificación por mención

```mermaid
flowchart LR
    A["Usuario escribe @nombre en un comentario"] --> B["Autocompletado busca en perfiles activos"]
    B --> C["Selecciona usuario → se inserta @Nombre en el texto"]
    C --> D["Al guardar comentario: regex extrae menciones"]
    D --> E["insert logs (accion=comentario)"]
    D --> F["insert notificaciones por cada usuario mencionado"]
    F --> G["Badge del destinatario se actualiza vía Realtime"]
```
