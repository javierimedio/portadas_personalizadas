# Checklist de validación — Fase 0: Fundaciones

Fecha: 2026-07-31
Entorno de desarrollo comparado: proyecto Supabase `portadas-personalizadas-dev` (Reference ID `xjyftgvyzyzmccobynzt`), SQL Editor del Dashboard
Entorno de producción comparado: proyecto Supabase `paqtohmxagfebeyyurlq` (SQL Editor, solo lectura) + lectura directa de `index.html`

## Funcionalidades migradas

Fase 0 no migra funcionalidad de negocio (por diseño, `06-roadmap.md`) — lo que se "migra" aquí es la base técnica sobre la que se construirán las Fases 1-5:

- [x] Repositorio Next.js 15 + TypeScript + Tailwind en `webapp/`, verificado localmente (`install`, `typecheck`, `lint`, `test`, `build`).
- [x] Tag de referencia de producción (`pre-next-migration` / `v1.0-html-estable`) creado sobre el commit real de `index.html`/`vercel.json`.
- [x] Proyecto Supabase de desarrollo creado, independiente de producción.
- [x] Esquema real de producción leído (solo lectura, SQL Editor) y reconciliado contra `docs/03-modelo-datos.md`.
- [x] Esquema aplicado al proyecto de desarrollo (7 tablas, 2 enums, mismas columnas/constraints que producción).
- [x] RLS y políticas reales aplicadas al proyecto de desarrollo (23 políticas — ver detalle en "Resultado de las pruebas").
- [ ] Edge Function `create-user` desplegada en desarrollo — pendiente para el arranque de la Fase 4 (usuarios), no bloquea la Fase 1.
- [ ] Bucket `portadas-adjuntos` creado en desarrollo — pendiente para cuando la Fase 2 necesite subir archivos, no bloquea la Fase 1.
- [ ] Segundo proyecto Vercel apuntando a `webapp/` — pendiente, no bloquea el desarrollo de la Fase 1 en local, pero sí su validación en la URL de desarrollo.

## Funcionalidades pendientes

- Edge Function, bucket de Storage y proyecto Vercel de desarrollo: no eran bloqueantes para cerrar la Fase 0 (el objetivo de esta fase era el esquema + RLS), se completan al arrancar las fases que los necesitan.

## Diferencias detectadas (documentación vs esquema real de producción)

Todas corregidas en `docs/03-modelo-datos.md` § 3.4 antes de aplicar nada a desarrollo:

- `perfiles.rol` y `solicitudes.estado` son enums reales (`rol_usuario`, `estado_solicitud`), no texto libre.
- Varias columnas asumidas `NOT NULL` son en realidad nullable: `solicitudes.campana_id/comercial_id/nombre_empresa/idioma/canal`, `adjuntos.subido_por`, `logs.solicitud_id`, `notificaciones.solicitud_id`.
- `campanas.catalogos` es JSONB, no un array de texto.
- No existe el constraint `unique(campana_id, cod_sap)` en `solicitudes` — la validación de duplicados es solo del cliente.
- 6 columnas reales no documentadas hasta ahora: `perfiles.notif_preferencia`, `solicitudes.confirmada_at`, `solicitud_catalogos.diseno_url`/`diseno_at`, `adjuntos.subido_por_nombre`, `notificaciones.enviado_at`.
- El enum `estado_solicitud` tiene un valor adicional (`diseno_en_revision`) no documentado, confirmado inerte por lectura de `index.html`.
- RLS ya estaba habilitada en las 7 tablas de producción, pero neutralizada por políticas `allow_all` (aplicables incluso sin login) — el efecto práctico (ninguna restricción real a nivel de BD) coincidía con la premisa de partida, pero el mecanismo técnico no.
- El diseño original de políticas RLS (mío) omitía las políticas `DELETE` — corregido antes de considerar la Fase 0 completa (ver "Posibles regresiones").

## Posibles regresiones

Una detectada **y corregida antes de que llegara a manifestarse en ningún entorno real**: el primer diseño de políticas RLS no incluía ninguna política `DELETE`, lo que habría bloqueado `eliminarSolicitud`/`eliminarCampana` para todos los roles, incluido admin, en el momento de aplicarse. Corregida en el Paso 4c, verificada en desarrollo. No llegó a aplicarse nunca a producción — no ha habido regresión real, solo el riesgo de que la hubiera si no se hubiera preguntado antes de dar el paso por bueno.

## Resultado de las pruebas

- Esquema de desarrollo: 7 tablas, 2 enums — verificado por consulta SQL, coincide con `docs/03-modelo-datos.md` § 3.4.
- RLS: 7/7 tablas con `rowsecurity = true`.
- Políticas: 23/23 — sin `allow_all` ni `comercial_solo_sus_solicitudes`, con las 4 operaciones (`select`/`insert`/`update`/`delete`) cubiertas donde `index.html` las usa, y sin `delete` en `perfiles` (confirmado que no se usa).
- Tests automatizados del código Next.js: `npm run build`/`test`/`lint`/`typecheck` — todos en verde (sin lógica de dominio propia todavía, es la Fase 1 la que empieza a añadirla).

## Riesgos detectados de cara a la Fase 1

1. **Rol legacy `responsable`**: su comportamiento real (¿ve todo, o nada, dentro de su canal?) sigue sin verificarse contra `index.html` — pendiente, no bloquea la Fase 1 pero sí antes de aplicar RLS a producción en el Cutover.
2. **H-01 a H-06** (`09-matriz-paridad-funcional.md`): siguen con Decisión "Pendiente" — ninguno bloquea la Fase 1, pero H-03 (preferencia de notificación) es relevante para la Fase 2.
3. **Storage con URLs públicas** en producción: decisión ya tomada de no tocarlo en esta migración (`00-resumen-ejecutivo.md`), sigue siendo una brecha conocida y aceptada.

## Veredicto

- [x] **Paridad funcional validada — apto para iniciar la Fase 1**

No hay funcionalidad de negocio que comparar todavía (por diseño de esta fase), pero el entorno de desarrollo es real, independiente de producción, y su esquema + seguridad a nivel de base de datos están verificados y son correctos.

## Aprobación

Aprobado por: el usuario, en la conversación de esta fase (confirmación explícita: "por mi parte doy por completado el Paso 4 y la Fase 0, y podemos continuar con la Fase 1").
Fecha: 2026-07-31
