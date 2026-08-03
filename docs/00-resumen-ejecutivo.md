# Portadas Personalizadas — de SPA monolítica a arquitectura SaaS

## Principio inamovible

> **La funcionalidad existente debe mantenerse al 100%.** Este proyecto no añade funcionalidades nuevas ni rediseña la experiencia de usuario. Su único objetivo es:
> - sustituir el `index.html` monolítico por Next.js;
> - separar dominio, aplicación, infraestructura y UI;
> - mejorar mantenibilidad, tipado, seguridad y capacidad de evolución;
> - conservar la misma base de datos, migrándola únicamente cuando sea **estrictamente necesario** para que la migración funcione;
> - mantener la misma experiencia de usuario, los mismos flujos y las mismas funcionalidades durante toda la migración — incluidos los defectos conocidos de hoy (p. ej. la sesión no se refresca sola), que no se corrigen de paso simplemente porque "ya que estamos".

Cualquier oportunidad de mejora funcional o de UX detectada durante el diseño o la implementación **se documenta en `07-propuestas-futuras.md` y no se implementa** en esta migración. Este documento y los que le siguen aplican este principio de forma estricta: donde en una versión anterior de este diseño se proponía normalizar algo (roles, notificaciones, documentos de campaña), ahora se documenta como propuesta diferida y el esquema/comportamiento se mantiene tal cual existe hoy.

Corolario operativo: **ninguna fase del roadmap empieza sin que la anterior tenga paridad funcional validada y aprobada explícitamente**, mediante el checklist descrito en `08-protocolo-validacion.md`. No es una fase de QA opcional al final — es la condición para avanzar.

## Principio complementario: no replicar bugs a ciegas

"Paridad funcional al 100%" no significa "copiar cualquier comportamiento sin cuestionarlo". Si durante la implementación se detecta que algo de `index.html` parece incorrecto, incompleto o potencialmente defectuoso (como la importación de usuarios de `09-matriz-paridad-funcional.md`, que podría no funcionar hoy en producción), el procedimiento es siempre el mismo, sin excepción:

1. **Documentar el comportamiento actual** tal como es, con referencia a la línea de `index.html`.
2. **Explicar por qué se sospecha que es un bug** o un comportamiento no intencionado, no solo "esto se ve raro".
3. **Pedir una decisión explícita antes de implementar nada** — nunca corregirlo por iniciativa propia, y nunca migrarlo asumiendo silenciosamente que es correcto.

El registro vivo de estos casos está en `09-matriz-paridad-funcional.md` § "Hallazgos a verificar" (que se amplía según aparezcan nuevos durante la implementación) y el procedimiento formal en `08-protocolo-validacion.md` § 8.7. Ninguna fase se da por completa mientras tenga un hallazgo de este tipo sin una decisión registrada — ni "sin decidir" ni "decidido por defecto a favor de replicarlo" son válidos; hace falta una respuesta explícita.

## Principio de trabajo: navegador primero, terminal solo si es imprescindible

Toda tarea que requiera acceso a un servicio externo (GitHub, Supabase, Vercel) la ejecuta siempre el usuario, nunca Claude directamente (ver acuerdo de la Fase 0). Dentro de eso, el criterio para decidir cómo se le pide es:

1. **Por defecto, GitHub (web), Supabase Dashboard y Vercel Dashboard** — incluido el SQL Editor de Supabase para leer o aplicar esquema, que cuenta como "Dashboard" a estos efectos (es solo lectura/escritura de SQL desde el navegador, sin instalar nada).
2. **Terminal o herramientas locales (CLI, `pg_dump`, clientes de Postgres, etc.) solo cuando no exista una alternativa razonable desde el navegador** — y en ese caso, antes de pedirlo se explica por qué ese caso concreto lo requiere y qué se pierde si no se usa.
3. Si en algún punto la vía elegida se complica más de lo que el resultado justifica, se plantea al usuario y se reevalúa la estrategia antes de seguir adelante — no se persiste en un camino complejo por inercia.
4. **Minimizar el número de acciones manuales, no solo evitar la terminal.** Cuando se le pide algo desde una interfaz web (típicamente el SQL Editor), se agrupa en el menor número de pasos posible — idealmente una sola consulta cuyo resultado se pueda copiar y pegar de una vez — en vez de varias consultas o pantallas sueltas que haya que ir copiando una por una. El objetivo es que la intervención del usuario se reduzca a "ejecutar, pulsar Run, compartir el resultado"; el análisis y la preparación del siguiente paso los hace Claude.

Esto no aplica al propio desarrollo del código de Next.js: cuando Claude escribe, instala dependencias o ejecuta `npm run build`/`test` en sus propias sesiones de trabajo sobre el repositorio, sigue usando herramientas locales con normalidad — el principio es sobre qué se le pide hacer al usuario en su máquina, no sobre cómo Claude trabaja el código.

## Índice de documentos

| # | Documento | Contenido |
|---|-----------|-----------|
| 1 | [`01-analisis-funcional.md`](./01-analisis-funcional.md) | Diagnóstico del sistema actual, actores, módulos y reglas de negocio — tal como funcionan hoy |
| 2 | [`02-arquitectura.md`](./02-arquitectura.md) | Capas, stack, decisiones técnicas y su justificación |
| 3 | [`03-modelo-datos.md`](./03-modelo-datos.md) | Esquema tal como existe hoy en Supabase + RLS añadida encima, sin restructurar tablas |
| 4 | [`04-estructura-carpetas.md`](./04-estructura-carpetas.md) | Organización del repositorio Next.js (feature-based) |
| 5 | [`05-flujo-navegacion.md`](./05-flujo-navegacion.md) | Sitemap por rol y flujos de usuario críticos — sin cambios de comportamiento |
| 6 | [`06-roadmap.md`](./06-roadmap.md) | Migración por módulos en fases, cada una validada antes de empezar la siguiente |
| 7 | [`07-propuestas-futuras.md`](./07-propuestas-futuras.md) | Mejoras identificadas durante el diseño, explícitamente fuera de esta migración |
| 8 | [`08-protocolo-validacion.md`](./08-protocolo-validacion.md) | Checklist de comparación `index.html` vs Next.js al final de cada fase, y regla de bloqueo entre fases |
| 9 | [`09-matriz-paridad-funcional.md`](./09-matriz-paridad-funcional.md) | Inventario exhaustivo de las ~230 funcionalidades existentes en `index.html`, con su estado y fase de migración — la referencia objetiva de que nada se pierde |

## Cómo leer esto

Esto **no es un rediseño de producto**, ni siquiera un "rediseño técnico oportunista". Es una migración de arquitectura: mismo comportamiento, mismos datos, mismos flujos, distinta forma de construirlo por debajo. Si un documento describe algo que hoy no existe en `index.html`, es un error del documento, no una decisión de diseño — repórtalo.

## Punto de partida — esto no es greenfield

Ya existe un proyecto Supabase en producción (`paqtohmxagfebeyyurlq.supabase.co`) con datos reales: `perfiles`, `solicitudes`, `solicitud_catalogos`, `campanas`, `logs`, `notificaciones`, `adjuntos`, y la Edge Function `create-user`. La Fase 0 del roadmap empieza auditando ese esquema real desde el SQL Editor del Dashboard (consultas de solo lectura, sin CLI) y las migraciones son incrementales sobre él. Ver `03-modelo-datos.md` § 3.1.

## Migración por módulos (resumen — detalle completo en `06-roadmap.md`)

```
Fase 0  Fundaciones (sin funcionalidad visible)
   ↓
Fase 1  Login + Layout + Dashboard
   ↓
Fase 2  Solicitudes (creación/envío, flujo completo de diseño, comentarios y notificaciones)
   ↓
Fase 3  Campañas
   ↓
Fase 4  Usuarios
   ↓
Fase 5  Panel global, exportación e importación de Excel
   ↓
Fase 5.5  Validación documental con una muestra realista de producción (solo lectura)
   ↓
Cutover  Se apaga index.html
```

Cada fase deja el módulo correspondiente validado al 100% en el **entorno de desarrollo** — nunca se expone a los usuarios reales de forma parcial. La aplicación de producción (`index.html`) permanece intacta y es lo único que usan los usuarios hasta el corte final. La estrategia completa de convivencia se detalla en `06-roadmap.md` § "Estrategia de entornos".

## Decisiones de entornos (resueltas)

1. **Dos proyectos Supabase**: producción (el existente, `paqtohmxagfebeyyurlq.supabase.co`, intacto durante toda la migración) y uno nuevo de desarrollo (`portadas-personalizadas-dev`, Reference ID `xjyftgvyzyzmccobynzt`, creado desde el Dashboard — clon del esquema real obtenido y aplicado vía SQL Editor, con datos sintéticos y usuarios de prueba propios — nunca credenciales ni datos reales). Todo el trabajo de las Fases 0-5, incluida la activación de RLS, se hace y se valida contra el proyecto de desarrollo. RLS **no se activa en producción hasta el corte final** — ver `06-roadmap.md` § "Cutover".
2. **Dos proyectos Vercel sobre el mismo repositorio, cada uno con su propia rama — no confundir las dos**:
   - El proyecto **de producción** (el que ya existe) sigue desplegando `index.html` desde la raíz del repo, tomando como origen la rama `main`, hacia la **URL de producción**. No se toca.
   - El proyecto **de desarrollo** (nuevo) despliega el código Next.js de `/webapp`, tomando como origen **la rama de trabajo de esta migración** (`claude/custom-covers-saas-structure-lmxigd` mientras dure; nunca `main`), hacia la **URL de desarrollo** (dominio fijado a esa rama, estable durante todo el proyecto).
3. **Corte final en dos pasos independientes y reversibles**: (a) aplicar las políticas RLS —ya validadas en desarrollo— al proyecto Supabase de producción mientras `index.html` sigue siendo lo que ven los usuarios, y observar sin incidencias; (b) solo después, reasignar el dominio de producción del proyecto Vercel antiguo al nuevo. Cada paso es reversible por sí solo sin tocar el otro.

## Storage: decisión resuelta

El bucket `portadas-adjuntos` del entorno de desarrollo permanece aislado (archivos de prueba, sin relación con producción) durante las Fases 0-4. Antes del cutover, la **Fase 5.5** valida la gestión documental completa (subida, descarga, visualización, referencias a archivos) con una muestra realista: una copia de solo lectura de un subconjunto representativo de archivos y metadatos reales de producción, importada al entorno de desarrollo — sin escribir nunca sobre el proyecto Supabase ni el bucket de producción. Detalle completo del mecanismo en `06-roadmap.md` § "Fase 5.5" y `08-protocolo-validacion.md` § 8.6.

Las URLs del bucket de **producción** siguen siendo públicas durante toda la migración, sin restricción (ver `07-propuestas-futuras.md` § 6) — es una brecha de seguridad conocida que esta migración no cierra por no ser estrictamente necesaria para el cambio de arquitectura.

Con esto, todas las decisiones de entorno están resueltas. Queda aprobado el diseño completo (documentos 0-9); se empieza a construir la Fase 0.

## Principio añadido durante la Fase 1: paridad visual, no solo funcional

Desde el bloque de Dashboard de la Fase 1 (2026-08-03), además de la paridad funcional (principio inamovible, arriba), se persigue también **paridad visual** con `index.html` **siempre que el recurso gráfico ya exista en el repositorio** (`webapp/public/images/`: logo GOR Factory en sus variantes, fondo del login, favicon; los logos de Roly/Roly WRK/Stamina siguen siendo las mismas URLs externas que usa hoy la producción). No se retrasa a un bloque final de "pulido visual": cada bloque que use uno de estos recursos lo integra en el momento de construirse, no después.

Esto no cambia el principio inamovible ni el protocolo de "no replicar bugs a ciegas" — sigue aplicando igual a lo visual: por ejemplo, `index.html` usa la variante blanca del logo GOR Factory dentro de una tarjeta blanca en la pantalla de recuperación de contraseña (~502-503), donde queda invisible; en la migración se ha usado ahí la variante oscura en su lugar, documentado como una corrección obvia de bajo riesgo (sin efecto funcional, un logo decorativo invisible no es un comportamiento que preservar), no como una decisión que requiera el protocolo completo de `08-protocolo-validacion.md` § 8.7.

El sistema de diseño real de `index.html` (variables de color, radios, sombras, tipografía Inter, y las clases `.card`/`.stat-card`/`.topbar`/`.nav-btn`/`.btn`/`.form-group`/etc.) quedó portado a `webapp/src/app/globals.css` durante el bloque de Layout+Dashboard, con paridad visual aprobada por el usuario el 2026-08-03 sobre esas dos pantallas.

**Matiz acordado el mismo día, tras validar ese bloque**: de aquí en adelante, cada módulo nuevo debe **usar ese mismo sistema de diseño desde el primer momento** (las clases ya existentes, ampliándolas si falta alguna que `index.html` sí tiene) — no vale construir con utilidades sueltas "por ahora" y prometer alinearlo después. Lo que sí se aplaza es el **pulido fino** (ajustes de píxel sueltos: márgenes, alineaciones o tamaños puntuales que no dependen de una clase concreta): en vez de perseguir la paridad milimétrica pantalla por pantalla a medida que se construye cada una, se completa primero toda la funcionalidad de las Fases 2-5 sobre esta misma base visual, y se reserva una pasada final de pulido visual global sobre todas las pantallas ya construidas antes del Cutover.
