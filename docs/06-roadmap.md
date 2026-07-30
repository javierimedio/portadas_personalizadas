# 6. Roadmap por fases

Cada fase tiene un criterio de salida objetivo. A diferencia de un proyecto nuevo, aquí el criterio final no es solo "está construido" sino "sustituye a `index.html` sin que nadie note una regresión funcional" — el sistema actual sigue en producción y en uso durante toda la migración.

## Fase 0 — Fundaciones y reconciliación de esquema (sin funcionalidad visible todavía)

**Objetivo**: que exista un esqueleto seguro conectado al Supabase real, sin tocar el `index.html` en producción.

- `supabase db pull` contra el proyecto existente; comparar contra `03-modelo-datos.md` y decidir las migraciones incrementales necesarias (tipos enumerados, `campana_documentos` reemplazando los JSON de covers, normalización de roles legacy, `read_at` en `notificaciones`).
- Repositorio Next.js 15 + TypeScript + Tailwind + shadcn/ui, `@supabase/supabase-js` + `@supabase/ssr`.
- RLS activada tabla por tabla siguiendo el patrón de `03-modelo-datos.md` § 3.7, verificada contra un usuario de prueba de cada rol.
- CI (lint, typecheck) + despliegue en Vercel conectado al repo, en un dominio/subdominio de pruebas — el `index.html` actual sigue siendo lo que ve el usuario final.

**Criterio de salida**: cada rol de prueba ve exactamente lo que debería ver (y nada más) al consultar la base de datos directamente con su JWT, no solo a través de la UI nueva.

## Fase 1 — Paridad del núcleo: solicitudes y su flujo de estados

**Objetivo**: que un comercial pueda crear, enviar y seguir una solicitud real de principio a fin en el sistema nuevo.

- Login, recuperación de contraseña, impersonación de rol (admin).
- Módulo **Solicitudes**: crear, editar borrador, secciones por catálogo, envío, `missingFields` como validación de completitud.
- Máquina de estados completa (`05-flujo-navegacion.md` § 5.3) como Server Actions.
- **Diseño**: cola de trabajo, autoasignación, subida de diseño final (sin carga masiva todavía).
- **Dashboard** básico: KPIs de estado y unidades (sin los 7 gráficos completos todavía).

**Criterio de salida**: una campaña de prueba real se gestiona de principio a fin (comercial → diseño → confirmación) en el sistema nuevo, en paralelo al `index.html` actual, con los mismos datos.

## Fase 2 — Paridad operativa: campañas, carga masiva, panel y exportación

**Objetivo**: que el equipo de diseño y marketing dejen de necesitar el `index.html` para su trabajo diario.

- Módulo **Campañas** completo: creación, catálogos activos, subida de `campana_documentos` (covers e instrucciones).
- **Carga masiva de diseños** con el mismo parseo de nombre de archivo (`05-flujo-navegacion.md` § 5.4).
- **Panel global** (admin/marketing) y exportación a Excel.
- **Importación masiva** de solicitudes desde Excel.
- Módulo **Usuarios**: alta (vía Edge Function `create-user` existente), edición, alta/baja lógica.

**Criterio de salida**: se gestiona una campaña completa (decenas de solicitudes, carga masiva de diseños, exportación final) sin abrir `index.html` en ningún momento.

## Fase 3 — Comentarios, notificaciones y dashboard completo

**Objetivo**: cerrar las brechas de las preguntas abiertas de `00-resumen-ejecutivo.md` y llegar a paridad visual/funcional total.

- Comentarios con `@menciones` y su autocompletado.
- Notificaciones con `read_at` en base de datos (ya no localStorage) + Supabase Realtime para el badge.
- Envío real de email, **solo si** la pregunta abierta correspondiente se resuelve que sí (Edge Function + proveedor de email).
- Los 7 gráficos del dashboard completo.

**Criterio de salida**: paridad funcional total frente a `index.html`, verificada con una checklist módulo por módulo.

## Fase 4 — Cutover

**Objetivo**: apagar `index.html` como sistema en producción.

- QA end-to-end con usuarios reales de cada rol durante un periodo de convivencia (ambos sistemas contra la misma base de datos).
- Redirección del dominio de producción al sistema nuevo.
- `index.html` se archiva (no se borra) como referencia histórica; se documenta la fecha de corte.

**Criterio de salida**: `index.html` deja de recibir tráfico de producción; todo el equipo (comercial, marketing, diseño, admin) trabaja exclusivamente en el sistema nuevo.

---

No se empieza a picar código de ninguna fase hasta que los documentos 0-5 y las preguntas abiertas de `00-resumen-ejecutivo.md` estén aprobados.
