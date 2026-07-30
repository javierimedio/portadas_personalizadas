# 6. Roadmap por fases

Migración por módulos, tal como se pidió: en todo momento hay una aplicación 100% funcional. Cada fase termina con un criterio de salida verificable por comparación directa contra `index.html` (mismos datos, mismo resultado), no por "parece que funciona".

## Estrategia de convivencia (index.html + Next.js compartiendo el mismo Supabase)

Ambos sistemas leen y escriben las mismas tablas del mismo proyecto Supabase — esto es lo que hace posible migrar módulo por módulo sin romper nada: una solicitud creada en el sistema nuevo es una fila normal que `index.html` puede seguir mostrando, y viceversa.

Mecanismo por fase:
1. El módulo migrado se despliega en Next.js y se verifica en paralelo (mismos datos, mismo resultado que `index.html`).
2. El nav de `index.html` sustituye el enlace de ese módulo por un enlace al sistema nuevo (misma sesión de Supabase Auth si comparten dominio — ver pregunta abierta 1 de `00-resumen-ejecutivo.md`; si no comparten dominio, se necesita un puente de sesión o un segundo login hasta el cutover).
3. El resto de módulos sigue funcionando exactamente igual en `index.html`, sin tocarse.
4. Solo en el cutover final (tras la Fase 5) se retira `index.html` de producción por completo.

Esto significa que, por ejemplo, durante la Fase 2 un comercial puede crear y enviar una solicitud desde el sistema nuevo mientras el equipo de diseño la trabaja todavía... no, en este caso concreto Diseño está dentro de la misma Fase 2 (ver alcance abajo), así que el ejemplo real es: durante la Fase 2, todo el ciclo de vida de una solicitud (comercial → diseño → revisión cliente) ya vive en el sistema nuevo, mientras Campañas y Usuarios se siguen gestionando en `index.html`.

## Fase 0 — Fundaciones (sin funcionalidad visible)

**Objetivo**: esqueleto seguro conectado al Supabase real, sin tocar lo que ve el usuario final.

- `supabase db pull` y reconciliación con `03-modelo-datos.md` § 3.4 (confirmar tipos exactos, especialmente los marcados "a confirmar").
- Repositorio Next.js 15 + TypeScript + Tailwind + shadcn/ui, `@supabase/supabase-js` + `@supabase/ssr`.
- RLS activada tabla por tabla según `03-modelo-datos.md` § 3.5, verificada con un usuario de prueba de cada rol (incluido el caso legacy `responsable` sin canal, que requiere confirmación explícita antes de escribir su policy).
- CI (lint, typecheck) + despliegue en Vercel en un dominio/subdominio de pruebas.
- Decisión tomada sobre la pregunta abierta 1 (dominio/sesión compartida) antes de continuar a la Fase 1.

**Criterio de salida**: cada rol de prueba ve en una consulta directa (JWT de ese usuario) exactamente lo mismo que ve hoy a través de `index.html` — ni una fila más, ni una fila menos.

## Fase 1 — Login + Layout + Dashboard

**Objetivo**: el usuario puede entrar al sistema nuevo, navegar por el layout con el mismo nav condicionado por rol, y ver el Dashboard con los mismos KPIs y los mismos 7 gráficos.

- Login, recuperación de contraseña, impersonación de rol (admin) — mismas pantallas y mensajes que hoy.
- Layout autenticado: nav lateral con las mismas páginas visibles por rol que `buildNav()` decide hoy (aunque las páginas de Solicitudes/Campañas/Usuarios/Panel todavía redirijan a `index.html` hasta sus propias fases).
- Dashboard completo: KPIs de estado/unidades/precios y los 7 gráficos, filtrable por campaña, acotado por canal para `responsable_nacional`/`responsable_exportacion`.

**Criterio de salida**: los números y gráficos del Dashboard nuevo coinciden exactamente con los de `index.html` para la misma campaña, en todo momento (se pueden dejar ambos abiertos lado a lado).

## Fase 2 — Solicitudes (incluye diseño, comentarios y notificaciones)

**Objetivo**: el ciclo de vida completo de una solicitud —desde que un comercial la crea hasta que se confirma o archiva— se gestiona en el sistema nuevo sin volver a `index.html` en ningún punto intermedio.

Alcance confirmado (una solicitud es una sola entidad; separar su flujo entre dos sistemas obligaría a mantener ambos escribiendo sobre las mismas filas sin necesidad real):

- Crear/editar/enviar solicitud, secciones por catálogo, validación de completitud (`missingFields`).
- Máquina de estados completa: `borrador → enviada → en_revision_marketing → en_diseno ⇄ modificar_diseno → diseno_en_revision_comercial → confirmada/archivada`.
- Cola de trabajo de diseño (autoasignación, subida de diseño final) y carga masiva con el mismo parseo de nombre de archivo.
- Comentarios con `@menciones` y su autocompletado.
- Notificaciones (in-app, estado de lectura en `localStorage` igual que hoy — no se traslada a base de datos, ver `07-propuestas-futuras.md` § 2).

**Criterio de salida**: una campaña real completa (creación → diseño → confirmación de varias solicitudes) se gestiona de principio a fin en el sistema nuevo, con los mismos comerciales, diseñadores y responsables trabajando sin diferencia perceptible frente a `index.html`.

## Fase 3 — Campañas

**Objetivo**: `admin`/`marketing` crean y gestionan campañas desde el sistema nuevo.

- Listado y ficha de campaña: nombre, descripción, fecha de cierre, catálogos activos.
- Subida de `covers`/`covers_instrucciones` por catálogo (se mantienen como JSON en la fila de `campanas`, sin tabla nueva).
- Cálculo de "campaña activa por defecto" igual que hoy.

**Criterio de salida**: crear una campaña nueva en el sistema nuevo produce exactamente el mismo efecto (visible en `index.html` si todavía se usa en paralelo, y en la Fase 2 ya migrada) que crearla en `index.html`.

## Fase 4 — Usuarios

**Objetivo**: `admin`/`marketing` gestionan usuarios desde el sistema nuevo.

- Alta de usuario (invoca la Edge Function `create-user` existente, sin modificarla).
- Edición de datos y alta/baja lógica (`activo`), sin borrado — igual que hoy.

**Criterio de salida**: un usuario dado de alta desde el sistema nuevo puede iniciar sesión y tiene exactamente los permisos que su rol le da hoy en `index.html`.

## Fase 5 — Panel global, exportación e importación de Excel

**Objetivo**: `admin`/`marketing` dejan de necesitar `index.html` para la vista global y el intercambio de datos por Excel.

- Panel global: todas las solicitudes de todas las campañas, con los mismos filtros que hoy.
- Exportación a `.xlsx` de una campaña, con el mismo formato de columnas que genera `exceljs` hoy.
- Importación masiva de solicitudes desde Excel/CSV, con la misma validación de filas.

**Criterio de salida**: el Excel exportado desde el sistema nuevo es indistinguible (columna por columna) del que genera `index.html` hoy para la misma campaña.

## Cutover

**Objetivo**: apagar `index.html` como sistema en producción.

- QA end-to-end con usuarios reales de cada rol, verificando cada módulo migrado contra el criterio de salida de su fase, todos a la vez.
- Redirección del dominio de producción al sistema nuevo.
- `index.html` se archiva (no se borra) como referencia histórica, con la fecha de corte documentada.

**Criterio de salida**: `index.html` deja de recibir tráfico de producción; todos los roles trabajan exclusivamente en el sistema nuevo, sin ninguna funcionalidad perdida respecto al día anterior al corte.

---

No se empieza a picar código de ninguna fase hasta que los documentos 0-7 y las preguntas abiertas de `00-resumen-ejecutivo.md` estén aprobados. Ninguna fase incluye mejoras funcionales — cualquier idea que surja durante la implementación se añade a `07-propuestas-futuras.md`, no al alcance de la fase en curso.
