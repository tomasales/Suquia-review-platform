# Arquitectura de AI Memory

## Regla crítica

Solamente feedback authored by Tomi puede generar aprendizaje creativo.

Feedback de diseñadora, Dirección u otros usuarios se conserva normalmente, pero no alimenta el criterio de AI Memory.

## Objetivo MVP

AI Memory forma parte del MVP como proceso activo en segundo plano:

1. conservar feedback original;
2. procesarlo con LLM externo configurable;
3. generar información estructurada;
4. guardar esa información como base de conocimiento;
5. mostrarla de forma consultiva.

No forma parte del MVP:

- agente autónomo de revisión;
- pre-revisión automática de piezas;
- reemplazar a Tomi;
- entrenar modelo propio.

## Flujo

1. Tomi escribe feedback.
2. Feedback se guarda como fuente canónica.
3. Backend detecta que `authorUser.isAiLearningSource=true`.
4. Se crea `AIProcessingJob` en estado `PENDING`.
5. Worker toma el job y marca `PROCESSING`.
6. Se envía al LLM solo el feedback nuevo y contexto mínimo.
7. El LLM devuelve datos estructurados según schema versionado.
8. Backend valida la respuesta.
9. Se guarda `AIKnowledgeEntry`.
10. Job pasa a `PROCESSED`.
11. Si falla, job pasa a `FAILED` y queda disponible para reintento técnico/manual.

Nunca modificar ni reemplazar el feedback original.

## Contexto enviado al LLM

Enviar solo lo necesario:

- feedback original;
- tipo de pieza;
- entrega;
- versión;
- nota de pieza si aporta contexto;
- referencias visuales como metadata o URLs temporales si se decide soportar análisis visual;
- categorías permitidas/schema.

No enviar todo el historial en cada procesamiento.

## AIKnowledgeEntry

Schema recomendado:

- `id`;
- `sourceFeedbackId`;
- `sourceDeliveryId`;
- `sourcePieceId`;
- `sourceVersionId`;
- `rawFeedbackSnapshot`;
- `summary`;
- `categories`;
- `tags`;
- `topics`;
- `inferredImportance`;
- `visualReferenceIds`;
- `recurrence`;
- `relatedEntryIds`;
- `provider`;
- `model`;
- `schemaVersion`;
- `confidence`;
- `createdAt`;
- `processedAt`.

## Embeddings

No agregarlos por defecto en MVP.

Razón:

- la necesidad inicial es estructurar feedback y mostrar aprendizajes consultivos;
- PostgreSQL Full Text Search cubre búsqueda textual;
- embeddings agregan costo, diseño de storage y decisiones de retrieval que pueden esperar.

Agregar embeddings más adelante si se confirma búsqueda semántica o recomendaciones por similitud que no se resuelvan bien con tags/categorías.

## Salida estructurada

Usar una respuesta estructurada con schema estricto cuando el proveedor lo permita, o validar la respuesta con un schema propio antes de guardar.

La arquitectura debe permitir cambiar proveedor. OpenAI es compatible con salidas estructuradas por JSON Schema en modelos soportados, pero el proveedor definitivo sigue abierto.

## Control de costos

- Procesar incrementalmente solo feedback nuevo de Tomi.
- No reprocesar si ya existe `AIKnowledgeEntry` para `sourceFeedbackId + schemaVersion`.
- Guardar resultado y reutilizarlo.
- Limitar contexto.
- Usar modelo económico suficiente.
- Registrar provider/model/schemaVersion.
- Usar schema versioning para reprocesar en lote solo cuando cambie el schema.
- Evitar análisis visual automático salvo que se defina valor claro.

## Consulta y recomendaciones

Para Dashboard:

- seleccionar 2-3 aprendizajes desde AIKnowledgeEntry;
- priorizar recurrencia, fecha y relevancia;
- mostrar como consulta, no como obligación.

Para consulta completa:

- filtrar por tags, tipo de pieza, fecha, recurrencia;
- devolver entradas con enlace al feedback fuente;
- permitir ver el feedback original.

## Relación con Guidelines

Guidelines son manuales estáticos. AI Memory no crea ni modifica Guidelines automáticamente.

La consulta completa puede vivir cerca de Guidelines, pero debe distinguir fuente estática/manual de conocimiento derivado del feedback real de Tomi.

## Fallos

Si falla procesamiento:

- no afecta el feedback original;
- no bloquea la revisión;
- job queda `FAILED`;
- registrar error técnico;
- permitir reintento;
- no generar aprendizaje parcial no validado.

## Referencias oficiales verificadas

- OpenAI Structured Outputs: https://openai.com/index/introducing-structured-outputs-in-the-api/
- OpenAI API response format JSON Schema: https://platform.openai.com/docs/api-reference/chat/create
