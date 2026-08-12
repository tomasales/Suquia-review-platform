# AI Memory

## Objetivo

AI Memory es una capa de conocimiento estructurado generada a partir del feedback histórico.

Forma parte del MVP como proceso activo en segundo plano. El valor propio del sistema debe estar en la base de conocimiento que se construye a partir del trabajo real.

## Decisiones tomadas

- AI Memory sí forma parte del MVP.
- Cada feedback authored by Tomi debe conservarse íntegramente.
- Cada feedback authored by Tomi debe procesarse en segundo plano.
- El procesamiento debe generar información estructurada.
- Esa información estructurada alimenta una base de conocimiento.
- No entrenar un modelo propio en el MVP.
- La aplicación podrá utilizar un LLM externo en el futuro.
- No hacer que la IA guarde lo que quiera.
- Definir una estructura consistente.
- Nunca eliminar el feedback original luego del análisis.
- La información estructurada es una capa adicional, no un reemplazo del feedback original.

## Regla crítica

Para recomendaciones y aprendizaje del criterio creativo, solamente utilizar feedback authored by Tomi.

Feedback de Dirección no entra en AI Memory como criterio de diseño.

## Información mínima a conservar

Cada feedback de Tomi debe conservarse íntegramente y además poder procesarse en segundo plano para producir información estructurada.

La memoria debe poder guardar, como mínimo:

- feedback original;
- resumen;
- categorías/tags;
- tipo de pieza;
- entrega;
- versión;
- fecha;
- referencias visuales;
- usuario autor;
- contexto;
- recurrencia;
- relación con feedbacks similares.

## Uso visible de IA en MVP

La IA debe ser consultiva, no intrusiva.

Reglas:

- No mostrar recomendaciones obligatorias mientras se carga una entrega.
- No interrumpir el proceso de revisión.
- En Dashboard puede existir un pequeño bloque con 2-3 aprendizajes/recomendaciones.
- La consulta completa vive cerca de Guidelines/documentación.
- La diseñadora decide si quiere entrar a consultarla.
- La IA debe resumir patrones reales del feedback de Tomi.

La IA no debe:

- inventar principios;
- inventar Guidelines;
- recomendar cosas sin respaldo histórico;
- actuar como autoridad creativa.

Ejemplos válidos, siempre que provengan del historial real:

- Dar más aire entre bloques.
- Evitar centrar textos en este tipo de composición.
- Usar un solo recurso gráfico cuando la imagen ya tiene suficiente peso.

## Fuera del MVP

La arquitectura debe quedar preparada para que en el futuro esta memoria pueda alimentar capacidades más avanzadas.

No forma parte del MVP:

- agente autónomo de revisión;
- pre-revisión automática de piezas;
- reemplazar a Tomi en la revisión;
- entrenamiento de un modelo propio.

## Pendiente de definición

- Proveedor definitivo del LLM.
- Esquema definitivo de AI Memory.

## Referencias cruzadas

- Feedback: `04-feedback.md`.
- Dirección: `01-users-and-access.md`.
- Guidelines: `06-guidelines.md`.
- Dashboard: `11-dashboard.md`.
