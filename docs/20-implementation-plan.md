# Plan de implementación

## Principios

- Un prompt por módulo.
- Cada etapa debe dejar el sistema usable o verificable.
- No adelantar funcionalidades fuera del MVP.
- Consultar documentación funcional antes de implementar cada módulo.
- Consultar `13-open-decisions.md` si aparece una ambigüedad de producto.

## 0. Bootstrap técnico

- **Objetivo**: inicializar proyecto técnico.
- **Dependencias**: arquitectura aprobada.
- **Construir**: Next.js TypeScript, linting, estructura base, variables de entorno de ejemplo.
- **Aceptación**: app arranca localmente y en Render.
- **No construir todavía**: UI de producto completa.

## 1. Database + modelo

- **Objetivo**: crear schema inicial.
- **Dependencias**: `15-data-model.md`.
- **Construir**: Prisma, PostgreSQL, migrations iniciales, seed mínimo.
- **Aceptación**: tablas principales creadas y tests básicos de modelo.
- **No construir todavía**: flujos UI.

## 2. Auth + usuarios

- **Objetivo**: login Google y allowlist.
- **Dependencias**: DB.
- **Construir**: Auth.js, User, AuthorizedEmail, protección de rutas, `isAiLearningSource`.
- **Aceptación**: usuario autorizado entra; no autorizado no entra; Tomi queda identificable por configuración central.
- **No construir todavía**: matriz de roles.

## 3. Layout base + Dashboard mínimo

- **Objetivo**: superficie inicial de navegación.
- **Dependencias**: auth.
- **Construir**: dashboard simple con espacios para subir entrega, entregas recientes, Drive status, Journal reciente.
- **Aceptación**: usuario autenticado ve dashboard.
- **No construir todavía**: métricas, gráficos, recomendaciones avanzadas.

## 4. Deliveries

- **Objetivo**: crear y listar entregas.
- **Dependencias**: auth, DB.
- **Construir**: Delivery, listado inbox, filtros básicos por tipo/estado/fecha/usuario.
- **Aceptación**: crear entrega conceptual sin archivos finales y verla en listado.
- **No construir todavía**: comparación de versiones.

## 5. Pieces + versions

- **Objetivo**: modelar piezas ordenadas y versiones no destructivas.
- **Dependencias**: deliveries.
- **Construir**: Piece, PieceVersion, orden antes de envío, congelamiento después del primer envío.
- **Aceptación**: no se puede agregar/eliminar/reordenar después de enviar; sí crear nuevas versiones.
- **Decisión cerrada**: el estado de revisión vive en `PieceVersion`; cada nueva versión nace sin revisar.

## 6. Upload

- **Objetivo**: subir archivos de piezas y referencias.
- **Dependencias**: modelo de piezas.
- **Construir**: upload backend, validación MIME/tamaño configurable, almacenamiento operativo, metadata.
- **Aceptación**: archivos quedan disponibles para preview y backup pendiente.
- **No construir todavía**: formatos/tamaños finales si siguen abiertos.

## 7. Feedback

- **Objetivo**: feedback general, por pieza y conversación.
- **Dependencias**: pieces/versions/upload.
- **Construir**: Feedback, FeedbackAttachment, ConversationReply, separación Tomi/Dirección.
- **Aceptación**: feedback queda vinculado a version exacta y se conserva histórico.
- **No construir todavía**: estados manuales de comentario, pins.

## 8. Journal

- **Objetivo**: auditoría funcional.
- **Dependencias**: deliveries, pieces, feedback.
- **Construir**: JournalEvent append-only y eventos centrales.
- **Aceptación**: acciones relevantes quedan registradas sin duplicar conversaciones.
- **No construir todavía**: búsqueda en Journal hasta resolver pendiente.

## 9. Drive integration

- **Objetivo**: backup Drive real.
- **Dependencias**: upload, journal.
- **Construir**: service account, creación de carpetas, upload, manifest, journal export.
- **Aceptación**: una entrega enviada tiene backup reconstruible en Drive.
- **No construir todavía**: restore completo.

## 10. Error recovery

- **Objetivo**: que el usuario no pierda trabajo.
- **Dependencias**: Drive integration.
- **Construir**: SyncOperation, estados técnicos, errores visibles, reintento manual, health check.
- **Aceptación**: fallo Drive deja operación recuperable y permite reintentar.
- **No construir todavía**: retries automáticos.

## 11. Search

- **Objetivo**: búsqueda global inicial.
- **Dependencias**: deliveries, feedback, replies.
- **Construir**: PostgreSQL Full Text Search sobre entregas, notas, feedback y conversaciones.
- **Aceptación**: buscar un término lleva al resultado relevante.
- **No construir todavía**: Elasticsearch, Algolia, búsqueda semántica.

## 12. Guidelines

- **Objetivo**: biblioteca manual.
- **Dependencias**: auth/upload.
- **Construir**: Guideline metadata, subida/consulta según pendiente resuelto.
- **Aceptación**: documentos manuales consultables.
- **No construir todavía**: generación/modificación automática por IA.

## 13. AI Memory processing

- **Objetivo**: procesamiento activo en segundo plano.
- **Dependencias**: feedback, usuarios, jobs.
- **Construir**: AIProcessingJob, llamada LLM configurable, validación schema, AIKnowledgeEntry.
- **Aceptación**: feedback de Tomi genera conocimiento estructurado; feedback de Dirección no.
- **No construir todavía**: agente autónomo, pre-revisión.

## 14. AI consultation

- **Objetivo**: uso consultivo de AI Memory.
- **Dependencias**: AI Memory processing.
- **Construir**: 2-3 aprendizajes en Dashboard y consulta completa cerca de Guidelines.
- **Aceptación**: cada aprendizaje enlaza a evidencia histórica.
- **No construir todavía**: recomendaciones obligatorias.

## 15. Restore from Drive

- **Objetivo**: recuperar eliminadas sin escanear todo Drive.
- **Dependencias**: Drive integration, deleted_entries.
- **Construir**: DeletedEntry, `deleted_entries.json`, pantalla de recuperación, reconstrucción desde manifest.
- **Aceptación**: entrega eliminada se restaura desde manifest.
- **No construir todavía**: resolver estado restaurado sin decisión de producto.

## 16. Production deployment

- **Objetivo**: dejar MVP desplegado.
- **Dependencias**: módulos MVP completos.
- **Construir**: Render Web Service, Postgres, secrets, dominio/SSL si aplica, backups y runbook básico.
- **Aceptación**: app accesible, login funciona, Drive health OK, DB persistente.
- **No construir todavía**: infraestructura enterprise.

## Orden de dependencias

Auth y DB habilitan todo. Drive y AI Memory dependen de feedback/versiones. Restore depende de Drive. Search puede avanzar antes de AI Memory porque usa texto operativo. Dashboard se arma temprano y se completa incrementalmente.

## Decisiones abiertas a revisar antes de implementar módulos

- Formatos y tamaños de archivo: antes de Upload.
- Estado de pieza al subir nueva versión: antes de pulir Pieces + versions.
- Identificación final de Tomi: antes de AI Memory.
- Estado restaurado: antes de Restore from Drive.
- Journal en búsqueda global: antes de Search.
