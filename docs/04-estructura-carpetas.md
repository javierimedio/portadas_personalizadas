# 4. Estructura de carpetas

Feature-based, con separación explícita entre dominio, aplicación, infraestructura y UI (ver `02-arquitectura.md`). Esto describe el esqueleto que se crea en la Fase 0 del roadmap — nada de esto existe todavía.

Por el principio inamovible (`00-resumen-ejecutivo.md`), esta estructura organiza el código de forma distinta pero opera exactamente sobre el mismo esquema que hoy: sin tablas nuevas, sin columnas nuevas salvo RLS. Donde el nombre de un archivo podría sugerir una funcionalidad nueva, la nota junto a él aclara que replica el comportamiento actual.

Todo lo siguiente vive dentro de `/webapp` en el mismo repositorio — `index.html` y `vercel.json` permanecen en la raíz, intactos, y siguen siendo lo que despliega el proyecto Vercel de producción. `/webapp` es el Root Directory del proyecto Vercel de desarrollo (ver `06-roadmap.md` § "Estrategia de entornos").

```
portadas-personalizadas/
├── index.html                                    # Producción — sin tocar durante toda la migración
├── vercel.json                                   # Producción — sin tocar
├── docs/                                         # Esta documentación de diseño
│
└── webapp/                                       # Proyecto Vercel de desarrollo (Root Directory)
    ├── supabase/
    │   ├── migrations/                           # Incrementales sobre el esquema clonado (ver 03-modelo-datos.md § 3.1)
    │   └── config.toml
    │
    ├── src/
    │   ├── app/                                  # Next.js App Router — solo orquestación de página
    │   │   ├── (auth)/
    │   │   │   ├── login/page.tsx
    │   │   │   ├── recuperar/page.tsx
    │   │   │   └── layout.tsx
    │   │   ├── (app)/                            # Layout autenticado con nav lateral + header
    │   │   │   ├── layout.tsx
    │   │   │   ├── dashboard/page.tsx
    │   │   │   ├── solicitudes/
    │   │   │   │   ├── page.tsx                  # "Mis solicitudes" (comercial/responsable) o listado propio
    │   │   │   │   └── [solicitudId]/page.tsx
    │   │   │   ├── panel/page.tsx                # Panel global (admin/marketing) + export
    │   │   │   ├── diseno/page.tsx               # Cola de trabajo del diseñador
    │   │   │   ├── campanas/
    │   │   │   │   ├── page.tsx
    │   │   │   │   └── [campanaId]/page.tsx
    │   │   │   ├── usuarios/page.tsx
    │   │   │   └── perfil/page.tsx
    │   │   └── api/
    │   │       └── export/
    │   │           └── solicitudes/route.ts      # Genera el .xlsx del panel global
    │   │
    │   ├── features/
    │   │   ├── auth/
    │   │   │   ├── application/
    │   │   │   │   ├── login.action.ts
    │   │   │   │   ├── request-password-reset.action.ts
    │   │   │   │   └── impersonate-role.ts       # solo cliente, no toca DB — cambia el rol visible en la sesión de admin
    │   │   │   └── ui/
    │   │   │       ├── login-form.tsx
    │   │   │       └── recovery-form.tsx
    │   │   │
    │   │   ├── solicitudes/
    │   │   │   ├── domain/
    │   │   │   │   ├── solicitud.schema.ts
    │   │   │   │   ├── solicitud.rules.ts        # missingFields(), catSummary(), transiciones válidas
    │   │   │   │   └── carga-masiva.rules.ts     # parseCargaFilename(), matchCargaFile()
    │   │   │   ├── application/
    │   │   │   │   ├── create-solicitud.action.ts
    │   │   │   │   ├── update-solicitud.action.ts
    │   │   │   │   ├── enviar-a-diseno.action.ts
    │   │   │   │   ├── asignar-disenador.action.ts
    │   │   │   │   ├── marcar-diseno-listo.action.ts
    │   │   │   │   ├── confirmar-diseno.action.ts
    │   │   │   │   ├── solicitar-modificacion.action.ts
    │   │   │   │   ├── archivar-solicitud.action.ts
    │   │   │   │   ├── add-comentario.action.ts
    │   │   │   │   ├── upload-adjunto.action.ts
    │   │   │   │   └── procesar-carga-masiva.action.ts
    │   │   │   ├── infrastructure/
    │   │   │   │   ├── solicitudes.repository.ts
    │   │   │   │   ├── solicitud-catalogos.repository.ts
    │   │   │   │   ├── adjuntos.repository.ts
    │   │   │   │   └── logs.repository.ts
    │   │   │   └── ui/
    │   │   │       ├── solicitudes-table.tsx
    │   │   │       ├── solicitud-form.tsx
    │   │   │       ├── catalogo-section.tsx
    │   │   │       ├── carga-masiva-modal.tsx
    │   │   │       ├── comentarios-thread.tsx
    │   │   │       └── mencion-autocomplete.tsx
    │   │   │
    │   │   ├── diseno/
    │   │   │   ├── domain/
    │   │   │   │   └── cola-diseno.rules.ts      # qué ve un disenador vs un responsable_diseno
    │   │   │   ├── application/
    │   │   │   └── ui/
    │   │   │       ├── cola-diseno-table.tsx
    │   │   │       └── diseno-upload-zone.tsx
    │   │   │
    │   │   ├── campanas/
    │   │   │   ├── domain/
    │   │   │   │   └── campana.schema.ts
    │   │   │   ├── application/
    │   │   │   │   ├── create-campana.action.ts
    │   │   │   │   ├── update-campana.action.ts
    │   │   │   │   └── upload-campana-cover.action.ts # escribe en campanas.covers/covers_instrucciones (JSON), igual que hoy — sin tabla nueva
    │   │   │   ├── infrastructure/
    │   │   │   │   └── campanas.repository.ts
    │   │   │   └── ui/
    │   │   │       ├── campanas-table.tsx
    │   │   │       └── campana-form.tsx
    │   │   │
    │   │   ├── usuarios/
    │   │   │   ├── domain/
    │   │   │   │   ├── perfil.schema.ts
    │   │   │   │   └── import-usuarios.rules.ts   # validación de filas del Excel importado (roles válidos, campos obligatorios)
    │   │   │   ├── application/
    │   │   │   │   ├── create-usuario.action.ts   # invoca la Edge Function create-user (copia en el proyecto de desarrollo)
    │   │   │   │   ├── update-usuario.action.ts
    │   │   │   │   ├── toggle-usuario.action.ts
    │   │   │   │   └── import-usuarios.action.ts  # importación masiva — es de usuarios, no de solicitudes (ver 01-analisis-funcional.md § 1.4.11); verificar primero si el endpoint que usa hoy (/auth/v1/admin/users) funciona con la clave pública
    │   │   │   ├── infrastructure/
    │   │   │   │   └── perfiles.repository.ts
    │   │   │   └── ui/
    │   │   │       ├── usuarios-table.tsx
    │   │   │       ├── usuario-form.tsx
    │   │   │       └── import-usuarios-modal.tsx
    │   │   │
    │   │   ├── notificaciones/
    │   │   │   ├── application/
    │   │   │   │   └── enviar-notificacion.ts    # invocada desde los casos de uso de solicitudes/diseño
    │   │   │   ├── infrastructure/
    │   │   │   │   └── notificaciones.repository.ts
    │   │   │   └── ui/
    │   │   │       ├── notificaciones-panel.tsx
    │   │   │       ├── notificaciones-badge.tsx  # Client Component + Realtime
    │   │   │       └── use-read-state.ts         # hook cliente sobre localStorage (portadas_notifs_read), igual que hoy — sin Server Action ni columna read_at
    │   │   │
    │   │   ├── dashboard/
    │   │   │   ├── application/                  # agregaciones de solo lectura
    │   │   │   │   └── get-dashboard-stats.ts
    │   │   │   └── ui/
    │   │   │       ├── kpi-cards.tsx
    │   │   │       └── charts/                   # los 7 gráficos actuales, 1 componente por gráfico
    │   │   │
    │   │   └── panel-global/
    │   │       ├── application/
    │   │       │   └── export-solicitudes.ts       # usado por el Route Handler de export, ver app/api/export
    │   │       └── ui/
    │   │           └── panel-table.tsx
    │   │
    │   ├── shared/
    │   │   ├── domain/                            # tipos comunes (Result, Pagination...)
    │   │   ├── infrastructure/
    │   │   │   └── supabase/
    │   │   │       ├── server-client.ts           # cliente con JWT de sesión, proyecto de desarrollo (RSC/Server Actions)
    │   │   │       ├── admin-client.ts            # service_role — solo Edge Function create-user
    │   │   │       └── middleware.ts
    │   │   └── ui/                                # wrappers de shadcn/ui, layout primitives
    │   │
    │   └── components/
    │       └── ui/                                # shadcn/ui generado (no se edita a mano salvo tokens)
    │
    ├── tests/
    │   ├── unit/                                  # dominio, sin red: solicitud.rules, carga-masiva.rules, import-usuarios.rules
    │   ├── integration/                           # repositorios + RLS contra el proyecto Supabase de desarrollo
    │   └── e2e/                                   # Playwright: crear→enviar→diseño→confirmar
    │
    ├── .env.local                                 # NEXT_PUBLIC_SUPABASE_URL/ANON_KEY del proyecto de DESARROLLO — nunca el de producción
    └── tailwind.config.ts
```

## Reglas de dependencia entre carpetas

- `domain/` no importa nada de `infrastructure/`, `ui/` ni de Next.js/React.
- `application/` (Server Actions) es el único lugar que orquesta `domain/` + `infrastructure/`.
- `ui/` solo llama a `application/` (Server Actions) o lee vía Server Components que usan `infrastructure/` directamente para lecturas simples.
- `notificaciones/enviar-notificacion.ts` es invocado desde los casos de uso de `solicitudes/` y `diseno/` (dirección de dependencia: features → notificaciones, nunca al revés), igual que hoy una notificación es un efecto secundario de un cambio de estado, no un flujo independiente.
- `webapp/` nunca referencia rutas fuera de sí mismo (ni lee ni escribe `index.html`/`vercel.json` de la raíz) — los dos proyectos Vercel son independientes aunque compartan repositorio.
