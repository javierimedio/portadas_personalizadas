# 8. Protocolo de validación por fases

Regla de bloqueo, sin excepciones: **no se empieza a implementar la fase N+1 hasta que el checklist de la fase N esté aprobado explícitamente**. Si el checklist detecta una regresión, esa fase no se considera terminada — se corrige y se repite la comparación, cuantas veces sea necesario, antes de pedir aprobación de nuevo.

## 8.1 Cuándo se ejecuta

Al terminar de implementar el alcance de una fase en el entorno de desarrollo (`06-roadmap.md`), antes de tocar el código de la fase siguiente. Nunca se valida "por encima" ni se acumulan dos fases sin checklist intermedio, aunque parezca que se avanza más rápido así.

## 8.2 Cómo se compara

1. Se define un conjunto de escenarios de prueba que cubran el alcance completo de la fase (cada rol implicado, cada estado relevante, los casos límite documentados en `01-analisis-funcional.md` y `05-flujo-navegacion.md`).
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
- [ ] <funcionalidad concreta> — verificada en escenario: <cuál>
- [ ] ...

## Funcionalidades pendientes
- <funcionalidad del alcance de la fase que no llegó a implementarse, y por qué>
(si no hay ninguna, indicar "Ninguna — alcance completo")

## Diferencias detectadas
Cualquier discrepancia observada entre ambos entornos, aunque no afecte a la funcionalidad (p. ej. un mensaje de error con distinta redacción por venir de una librería distinta).
- <diferencia> — Impacto: ninguno / cosmético / funcional
- ...

## Posibles regresiones
Subconjunto de las diferencias anteriores que sí implican pérdida de funcionalidad respecto a `index.html` — ver definición en § 8.4. Si hay alguna, esta fase **no puede aprobarse** hasta corregirla.
- <regresión> — Estado: corregida / pendiente de corregir

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

## 8.5 Aprobación

El checklist lo redacta quien implementa la fase, pero **la aprobación final es tuya**, no una autocertificación. El veredicto "apto para iniciar la fase siguiente" no se marca hasta que confirmes explícitamente, en la conversación o en el propio archivo, que revisaste el checklist y estás de acuerdo. Sin esa aprobación, la fase siguiente no se empieza.

## 8.6 Validación de gestión documental (Storage) antes del cutover

El bucket `portadas-adjuntos` del entorno de desarrollo permanece aislado (archivos de prueba, sin relación con producción) durante las Fases 0-4, tal como se decidió. Antes del cutover, sin embargo, hace falta validar subida, descarga, visualización y referencias a archivos con un comportamiento fiel al real — y eso exige un mecanismo específico, añadido como una fase propia en `06-roadmap.md` ("Fase 5.5 — Validación documental"). Los detalles de esa estrategia (snapshot de solo lectura desde producción, sin ningún riesgo de escritura sobre datos reales) están descritos ahí, en el momento del roadmap en que corresponde ejecutarla — no antes.
