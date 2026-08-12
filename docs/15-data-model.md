# Modelo de datos

## Principios

- PostgreSQL es la fuente operativa de la aplicación.
- Google Drive es backup persistente y recuperable.
- Usar IDs inmutables.
- Nunca depender del título de una entrega como identificador.
- Las relaciones Delivery -> Piece -> PieceVersion deben preservar orden e historia.
- Journal es append-only conceptualmente.
- Feedback debe quedar vinculado a la versión donde fue escrito.

## Convenciones

- IDs: `uuid` o `cuid` estable generado por la aplicación.
- Timestamps: `createdAt`, `updatedAt` cuando aplique; eventos append-only no se editan.
- Eliminación de entregas: lógica en DB; no borrar backup Drive.
- Campos JSONB: solo para metadata flexible, no para reemplazar relaciones centrales.

## User

- **Propósito**: identidad de cada persona autenticada.
- **ID**: inmutable.
- **Campos principales**: email único, nombre, avatar, `isActive`, `isAiLearningSource`, `lastLoginAt`.
- **Relaciones**: deliveries creadas, feedback, replies, journal events, uploads.
- **Timestamps**: `createdAt`, `updatedAt`.
- **Índices relevantes**: email único, `isAiLearningSource`.
- **Canónico**: DB.
- **Reconstruible desde Drive**: parcialmente, por referencias históricas en manifest/Journal.

`isAiLearningSource` identifica centralmente a Tomi para AI Memory sin hardcodear emails en la lógica distribuida.

## AuthorizedEmail

- **Propósito**: allowlist simple de emails que pueden entrar.
- **ID**: inmutable.
- **Campos principales**: email único, invitedByUserId opcional, note, active.
- **Relaciones**: usuario invitador opcional.
- **Timestamps**: `createdAt`, `updatedAt`.
- **Índices relevantes**: email único, active.
- **Canónico**: DB.
- **Reconstruible desde Drive**: no.

## Delivery

- **Propósito**: paquete de piezas enviado para revisión.
- **ID**: inmutable; también se guarda en Drive manifest.
- **Campos principales**: generatedTitle, type (`STORIES`/`FEED`), status, generalNote, createdByUserId, submittedAt, closedAt, deletedAt, deletedByUserId, driveFolderId, driveManifestFileId.
- **Relaciones**: pieces, feedback general, journal events, sync operations, deleted entry.
- **Timestamps**: `createdAt`, `updatedAt`.
- **Índices relevantes**: type, status, submittedAt, createdByUserId, deletedAt.
- **Canónico**: DB.
- **Reconstruible desde Drive**: sí, si existe manifest completo.

El estado técnico debe soportar:

- `SENT_FOR_REVIEW`
- `IN_REVIEW`
- `CHANGES_REQUESTED`
- `APPROVED`
- `CLOSED`

Estos estados no son una máquina rígida. Se puede volver atrás y cada cambio se registra en Journal.

## Piece

- **Propósito**: pieza ordenada dentro de una entrega.
- **ID**: inmutable; también se guarda en manifest.
- **Campos principales**: deliveryId, position, initialNote, reviewState nullable, latestVersionId.
- **Relaciones**: delivery, versions, feedback, journal events.
- **Timestamps**: `createdAt`, `updatedAt`.
- **Índices relevantes**: `(deliveryId, position)` único, reviewState.
- **Canónico**: DB.
- **Reconstruible desde Drive**: sí, desde manifest.

Después del primer envío de la entrega, `position` no debe cambiar y no se agregan ni eliminan piezas. Solo se agregan versiones.

`reviewState` debe admitir al menos `OK`, `NEEDS_CHANGES` y valor nulo/sin evaluar. No resolver todavía si una nueva versión reinicia automáticamente ese estado.

## PieceVersion

- **Propósito**: versión no destructiva de una pieza.
- **ID**: inmutable.
- **Campos principales**: pieceId, versionNumber, uploadedByUserId, originalFilename, mimeType, fileSizeBytes, storageKey, driveFileId, driveFolderId, checksum opcional, uploadedAt.
- **Relaciones**: piece, feedback, attachments, journal events.
- **Timestamps**: `createdAt`.
- **Índices relevantes**: `(pieceId, versionNumber)` único, uploadedAt.
- **Canónico**: DB para metadata; archivo operativo según almacenamiento elegido; backup en Drive.
- **Reconstruible desde Drive**: metadata y archivo sí, si manifest y archivos existen.

## Feedback

- **Propósito**: devolución general o específica.
- **ID**: inmutable.
- **Campos principales**: deliveryId, pieceId nullable, pieceVersionId nullable, authorUserId, sourceType (`TOMI`, `DIRECTION`, `OTHER`), level (`DELIVERY`/`PIECE`), body, createdAt.
- **Relaciones**: attachments, replies, AI processing job, AI knowledge entry.
- **Timestamps**: `createdAt`, `updatedAt` solo si se permite edición futura; por defecto histórico.
- **Índices relevantes**: authorUserId, sourceType, deliveryId, pieceVersionId, texto para búsqueda.
- **Canónico**: DB.
- **Reconstruible desde Drive**: sí, desde manifest/feedback files.

Solo feedback cuyo autor tenga `isAiLearningSource=true` puede alimentar criterio creativo en AI Memory.

## FeedbackAttachment

- **Propósito**: referencias visuales adjuntas a feedback.
- **ID**: inmutable.
- **Campos principales**: feedbackId, uploadedByUserId, originalFilename, mimeType, fileSizeBytes, storageKey, driveFileId, createdAt.
- **Relaciones**: feedback.
- **Timestamps**: `createdAt`.
- **Índices relevantes**: feedbackId.
- **Canónico**: DB para metadata; archivo operativo según almacenamiento; backup en Drive.
- **Reconstruible desde Drive**: sí, si manifest referencia el archivo.

## ConversationReply

- **Propósito**: respuestas/conversación asociada a un feedback.
- **ID**: inmutable.
- **Campos principales**: feedbackId, authorUserId, body, createdAt.
- **Relaciones**: feedback, user.
- **Timestamps**: `createdAt`.
- **Índices relevantes**: feedbackId, authorUserId, texto para búsqueda.
- **Canónico**: DB.
- **Reconstruible desde Drive**: sí, si manifest/conversación se sincroniza.

No crear estado manual de comentario.

## JournalEvent

- **Propósito**: registro append-only de eventos del sistema.
- **ID**: inmutable.
- **Campos principales**: deliveryId nullable, actorUserId nullable, eventType, entityType, entityId, metadata JSONB, createdAt.
- **Relaciones**: delivery, user.
- **Timestamps**: `createdAt`.
- **Índices relevantes**: deliveryId, actorUserId, eventType, entityType/entityId, createdAt.
- **Canónico**: DB.
- **Reconstruible desde Drive**: sí, si Journal se exporta en backup.

No copiar conversaciones completas en Journal.

## Guideline

- **Propósito**: documento estático/manual consultable.
- **ID**: inmutable.
- **Campos principales**: title, description, type, uploadedByUserId, originalFilename, mimeType, fileSizeBytes, storageKey, driveFileId opcional, active.
- **Relaciones**: user.
- **Timestamps**: `createdAt`, `updatedAt`.
- **Índices relevantes**: title, type, active.
- **Canónico**: DB para metadata; archivo operativo/Drive según decisión de implementación.
- **Reconstruible desde Drive**: pendiente de política final de Guidelines.

## DriveSyncState

- **Propósito**: estado agregado de conexión/sincronización Drive.
- **ID**: inmutable o singleton lógico.
- **Campos principales**: status (`CONNECTED`, `CHECKING`, `PROBLEM`), lastCheckedAt, lastSuccessAt, lastErrorCode, lastErrorMessage.
- **Relaciones**: sync operations.
- **Timestamps**: `createdAt`, `updatedAt`.
- **Índices relevantes**: status.
- **Canónico**: DB.
- **Reconstruible desde Drive**: no.

## SyncOperation

- **Propósito**: operación técnica recuperable para Drive.
- **ID**: inmutable.
- **Campos principales**: type, status (`PENDING`, `SYNCING`, `FAILED`, `SYNCED`), deliveryId, entityType, entityId, payload JSONB, attempts, lastError, nextManualRetryAvailableAt opcional, createdByUserId.
- **Relaciones**: delivery, user, journal events.
- **Timestamps**: `createdAt`, `updatedAt`, `startedAt`, `finishedAt`.
- **Índices relevantes**: status, type, deliveryId, createdAt.
- **Canónico**: DB.
- **Reconstruible desde Drive**: no.

Estos estados son técnicos y no reemplazan estados visibles de producto.

## DeletedEntry

- **Propósito**: metadata local para entregas eliminadas y restaurables.
- **ID**: inmutable.
- **Campos principales**: deliveryId, deletedByUserId, deletedAt, driveFolderId, manifestFileId, deletedEntriesFileId, restoreStatus.
- **Relaciones**: delivery, user.
- **Timestamps**: `createdAt`, `updatedAt`.
- **Índices relevantes**: deliveryId único, deletedAt.
- **Canónico**: DB y `deleted_entries.json` en Drive deben mantenerse coherentes.
- **Reconstruible desde Drive**: sí, desde `deleted_entries.json`.

## AIKnowledgeEntry

- **Propósito**: conocimiento estructurado derivado de feedback de Tomi.
- **ID**: inmutable.
- **Campos principales**: sourceFeedbackId, sourceDeliveryId, sourcePieceId, sourceVersionId, rawFeedbackSnapshot, summary, categories, tags, topics, inferredImportance, recurrence, relatedEntryIds, visualReferenceIds, provider, model, schemaVersion, confidence, processedAt.
- **Relaciones**: feedback, delivery, piece, version.
- **Timestamps**: `createdAt`, `updatedAt` solo para reprocesamiento controlado.
- **Índices relevantes**: sourceFeedbackId único por schemaVersion, categories, tags, topics, processedAt.
- **Canónico**: DB.
- **Reconstruible desde Drive**: parcialmente si se decide incluir AI Memory en manifest; feedback original siempre debe bastar para reprocesar.

## AIProcessingJob

- **Propósito**: procesamiento incremental de AI Memory.
- **ID**: inmutable.
- **Campos principales**: feedbackId, status (`PENDING`, `PROCESSING`, `FAILED`, `PROCESSED`), provider, model, schemaVersion, attempts, lastError, costEstimateMetadata JSONB.
- **Relaciones**: feedback, AIKnowledgeEntry.
- **Timestamps**: `createdAt`, `updatedAt`, `startedAt`, `finishedAt`.
- **Índices relevantes**: status, feedbackId, schemaVersion.
- **Canónico**: DB.
- **Reconstruible desde Drive**: no, se puede regenerar desde feedback original.

## SystemConfiguration

- **Propósito**: configuración central mínima que no conviene hardcodear.
- **ID**: clave estable.
- **Campos principales**: key, value JSONB, updatedByUserId.
- **Relaciones**: user.
- **Timestamps**: `createdAt`, `updatedAt`.
- **Índices relevantes**: key único.
- **Canónico**: DB.
- **Reconstruible desde Drive**: no.

Usarla solo para valores como carpeta raíz Drive, flags de health check o configuración central de aprendizaje si no alcanza con User/AuthorizedEmail.

## Pendientes de producto que afectan el modelo

- Qué ocurre con `reviewState` cuando se sube una nueva versión.
- Formatos y tamaños máximos de archivos.
- Estado de una entrega restaurada desde Drive.
- Si Journal entra en búsqueda global.
- Diferencias operativas entre Stories y Feed.
