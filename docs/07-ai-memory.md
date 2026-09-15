# AI Memory

## Objetivo

AI Memory resume y organiza feedback histórico de Tomi sin convertirlo en reglas nuevas.

En el MVP, su uso visible principal es mostrar qué temas aparecieron con más frecuencia en las reviews recientes.

## Decisiones tomadas

- El feedback original de Tomi es siempre la fuente de verdad.
- Solo feedback authored by Tomi alimenta AI Memory.
- El sistema puede resumir, etiquetar y agrupar feedback repetido.
- Todo resumen debe poder rastrearse a feedback real.
- No entrenar un modelo propio en el MVP.
- Puede utilizarse un LLM externo para procesar feedback.

Feedback de Dirección u otros usuarios no debe mezclarse con esta memoria.

## Uso visible en el MVP

El bloque principal debe responder:

**¿Qué cosas marcó más Tomi en las últimas reviews?**

Ejemplo:

**Lo más marcado en las últimas reviews**

- Dar más protagonismo a la fotografía.
- Reducir recursos gráficos cuando la imagen ya tiene mucho peso.
- Evitar que el texto compita con el producto.

Estos puntos solo pueden aparecer si resumen de forma fiel feedback explícito de Tomi.

La interfaz puede mostrar recurrencia y permitir acceder a los comentarios fuente.

## Límites

La IA puede:

- resumir lo que Tomi dijo;
- agrupar feedbacks que expresan la misma idea;
- detectar repetición explícita en reviews recientes;
- reformular de manera breve sin cambiar el significado.

La IA no debe:

- inventar principios;
- generar o modificar Guidelines;
- convertir un patrón reciente en una regla permanente;
- concluir qué debería hacerse en una pieza nueva;
- analizar automáticamente una pieza contra el historial;
- extrapolar una devolución a contextos donde Tomi no la aplicó.

Ejemplo válido:

> En las últimas reviews marcaste varias veces que la fotografía debería tener más protagonismo.

Ejemplo inválido:

> En SUQUIA siempre hay que priorizar la fotografía.

## Relación con Guidelines

- **Guidelines**: documentación oficial, estática y administrada manualmente.
- **AI Memory**: resumen descriptivo y trazable del feedback real de Tomi.

AI Memory nunca publica, crea ni actualiza Guidelines automáticamente.

## Información a conservar

Como mínimo:

- feedback original;
- autor;
- entrega;
- pieza;
- versión;
- fecha;
- referencias visuales;
- resumen estructurado;
- categorías/tags cuando ayuden a agrupar;
- relación con feedbacks similares;
- vínculo con el feedback fuente.

## Fuera del MVP

- agente autónomo de revisión;
- pre-revisión automática;
- evaluación automática de piezas contra feedback histórico;
- generación automática de Guidelines;
- reemplazar a Tomi en la revisión;
- entrenamiento de modelo propio.

## Pendiente de definición

- Proveedor definitivo del LLM.
- Ventana exacta de `reviews recientes`.
- Esquema definitivo y mecanismo de agrupamiento.
- Forma de mostrar evidencia sin sobrecargar el Dashboard.

## Referencias cruzadas

- Feedback: `04-feedback.md`.
- Dirección: `01-users-and-access.md`.
- Guidelines: `06-guidelines.md`.
- Dashboard: `11-dashboard.md`.
