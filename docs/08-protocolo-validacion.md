# 8. Protocolo de validación por fases

Regla de bloqueo, sin excepciones: **no se empieza a implementar la fase N+1 hasta que el checklist de la fase N esté aprobado explícitamente**. Si el checklist detecta una regresión, esa fase no se considera terminada — se corrige y se repite la comparación, cuantas veces sea necesario, antes de pedir aprobación de nuevo.

Este protocolo trabaja siempre junto con `09-matriz-paridad-funcional.md`: el checklist de una fase resume el resultado, pero la matriz es el inventario fila a fila que hay que actualizar de verdad. Antes de dar por buena una fase: todas las filas de la matriz correspondientes a esa fase deben pasar a `Validada` (o quedar explícitamente en `Regresión detectada` si algo bloquea, lo que impide aprobar el checklist).

## 8.1 Cuándo se ejecuta

Al terminar de implementar el alcance de una fase en el entorno de desarrollo (`06-roadmap.md`), antes de tocar el código de la fase siguiente. Nunca se valida "por encima" ni se acumulan dos fases sin checklist intermedio, aunque parezca que se avanza más rápido así.

## 8.2 Cómo se compara

1. Se filtran en `09-matriz-paridad-funcional.md` todas las filas cuya columna Fase corresponda a la fase en curso — esa lista de IDs es el alcance exacto a cubrir, sin añadir ni olvidar nada respecto a lo ya inventariado.
2. Cada escenario se reproduce **en los dos entornos** con datos equivalentes: en producción (`index.html`, datos reales o de prueba ya existentes) y en desarrollo (Next.js, sobre el clon con datos sintéticos de la Fase 0, ampliados si la fase lo requiere).
3. Se compara el resultado observable, no el código: misma pantalla, mismo dato, mismo comportamiento ante la misma acción. Cualquier discrepancia se anota, sin filtrarla por "parece poco importante".
4. Se ejecutan además los tests automatizados de la fase (unitarios de dominio, integración de repositorios/RLS contra el proyecto de desarrollo, y end-to-end si el flujo lo justifica).

## 8.3 Plantilla de checklist

Cada fase genera un archivo `docs/checklists/fase-N-<nombre>.md` con esta estructura:

```markdown
# Checklist de validación — Fase N: <nombre>

Fecha: <AAAA-MM-DD>
Entorno de desarrollo comparado: <URL de desarrollo, commit/rama>
Entorno de producción comparado: <URL de producción>

## Funcionalidades migradas
- [ ] <ID de 09-matriz-paridad-funcional.md, p. ej. SOL-07> <funcionalidad> — verificada en escenario: <cuál> — matriz actualizada a "Validada"
- [ ] ...

## Funcionalidades pendientes
- <ID de la matriz> <funcionalidad del alcance de la fase que no llegó a implementarse, y por qué>
(si no hay ninguna, indicar "Ninguna — alcance completo, todos los ID de la matriz para esta fase están en Validada")

## Diferencias detectadas
Cualquier discrepancia observada entre ambos entornos, aunque no afecte a la funcionalidad (p. ej. un mensaje de error con distinta redacción por venir de una librería distinta).
- <diferencia> — Impacto: ninguno / cosmético / funcional
- ...

## Posibles regresiones
Subconjunto de las diferencias anteriores que sí implican pérdida de funcionalidad respecto a `index.html` — ver definición en § 8.4. Si hay alguna, esta fase **no puede aprobarse** hasta corregirla.
- <regresión> — Estado: corregida / pendiente de corregir

## Comportamientos dudosos de index.html detectados (posibles bugs heredados)
Distinto de una regresión: aquí no es que el sistema nuevo se comporte peor, es que el comportamiento de `index.html` en sí mismo parece incorrecto. Ver § 8.7. Ninguno de estos se implementa en el sistema nuevo sin una decisión explícita registrada.
- <ID de la matriz> — Comportamiento actual: <...> — Por qué se sospecha bug: <...> — Decisión: pendiente / replicar tal cual / corregir / posponer a 07-propuestas-futuras.md
- (si no hay ninguno nuevo en esta fase, indicar "Ninguno nuevo — los ya registrados en 09-matriz-paridad-funcional.md siguen con su decisión vigente")

## Resultado de las pruebas
- Tests unitarios: <X/Y pasan>
- Tests de integración (RLS incluida): <X/Y pasan>
- Tests end-to-end: <X/Y pasan>
- Escenarios manuales comparados 1:1: <X/Y coinciden>

## Veredicto
- [ ] **Paridad funcional validada — apto para iniciar la fase siguiente**
- [ ] **Bloqueado** — pendiente de corregir: <lista>

## Aprobación
Aprobado por: <nombre> — Fecha: <AAAA-MM-DD>
```

## 8.4 Definiciones (para no discutir esto fase tras fase)

- **Diferencia**: cualquier discrepancia observada entre `index.html` y el sistema nuevo para el mismo escenario, sea o no relevante para el usuario. Se documenta siempre, incluso si es cosmética.
- **Regresión**: una diferencia que supone que algo deja de funcionar, funciona distinto de forma perceptible por el usuario, o deja de estar disponible para un rol que antes lo tenía. Por el principio inamovible (`00-resumen-ejecutivo.md`), **ninguna regresión es aceptable** — no hay una categoría de "regresión menor tolerable". Si aparece una, bloquea el veredicto de la fase.
- Una diferencia que no es regresión (p. ej. una animación de carga distinta, un identificador interno de componente) no bloquea el veredicto, pero se documenta igualmente para que no se pierda el rastro de qué cambió y por qué.
- **Comportamiento dudoso / posible bug heredado**: una categoría distinta de las dos anteriores — no compara `index.html` contra el sistema nuevo, cuestiona si el propio comportamiento de `index.html` es el que se debería migrar. Ver § 8.7.

## 8.7 Comportamientos dudosos de `index.html` (posibles bugs heredados)

"Paridad funcional al 100%" no equivale a "replicar cualquier cosa sin cuestionarla". Cuando durante la implementación de una fase aparece un comportamiento de `index.html` que parece incorrecto, incompleto o no intencionado (el ejemplo ya detectado: la importación de usuarios llamando a un endpoint que exige `service_role` con la clave pública, `09-matriz-paridad-funcional.md` USR-15), el procedimiento es siempre:

1. **Documentar el comportamiento actual tal cual es**, con referencia a la línea de `index.html` — sin interpretarlo todavía.
2. **Explicar por qué se sospecha que es un bug**: qué evidencia concreta lo sugiere (un endpoint que requiere permisos que el código no tiene, una condición que nunca se cumple, un cálculo que usa la variable equivocada, una inconsistencia entre dos partes del propio código que hacen lo mismo de forma distinta) — no basta con "esto me parece raro".
3. **Pedir una decisión explícita antes de escribir ningún código** que dependa de la respuesta. Nunca corregirlo por iniciativa propia, y nunca migrarlo asumiendo en silencio que es correcto — ambas son decisiones, y las decisiones sobre alcance las tomas tú.

Las opciones de decisión son siempre tres: **replicar tal cual** (incluido el defecto, porque el principio de paridad así lo exige salvo que se diga lo contrario), **corregir explícitamente** (se documenta como una excepción consciente al principio inamovible, con su motivo), o **posponer** (se traslada a `07-propuestas-futuras.md` y mientras tanto se replica tal cual). No hay una cuarta opción de "decidir no decidir": una fase no se cierra con un hallazgo de este tipo sin decisión registrada en su checklist.

Todo hallazgo nuevo se añade a `09-matriz-paridad-funcional.md` § "Hallazgos a verificar" en cuanto se detecta, no se espera al cierre de la fase para documentarlo.

## 8.5 Aprobación

El checklist lo redacta quien implementa la fase, pero **la aprobación final es tuya**, no una autocertificación. El veredicto "apto para iniciar la fase siguiente" no se marca hasta que confirmes explícitamente, en la conversación o en el propio archivo, que revisaste el checklist y estás de acuerdo. Sin esa aprobación, la fase siguiente no se empieza.

## 8.6 Validación de gestión documental (Storage) antes del cutover

El bucket `portadas-adjuntos` del entorno de desarrollo permanece aislado (archivos de prueba, sin relación con producción) durante las Fases 0-4, tal como se decidió. Antes del cutover, sin embargo, hace falta validar subida, descarga, visualización y referencias a archivos con un comportamiento fiel al real — y eso exige un mecanismo específico, añadido como una fase propia en `06-roadmap.md` ("Fase 5.5 — Validación documental"). Los detalles de esa estrategia (snapshot de solo lectura desde producción, sin ningún riesgo de escritura sobre datos reales) están descritos ahí, en el momento del roadmap en que corresponde ejecutarla — no antes.
