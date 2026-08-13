# Arquitectura técnica

## Objetivo

Definir una arquitectura concreta para construir el MVP de SUQUIA Review Platform sin implementar todavía la aplicación.

La documentación funcional existente sigue siendo la fuente de verdad. Esta arquitectura no resuelve decisiones abiertas de producto; cuando una decisión técnica depende de ellas, la dependencia queda marcada.

## Resumen recomendado

- **Frontend**: Next.js con App Router y TypeScript.
- **Backend/API**: la misma aplicación Next.js, usando Route Handlers y Server Actions cuando aporten simplicidad.
- **Base de datos operativa**: PostgreSQL.
- **Acceso a datos**: Prisma ORM.
- **Autenticación**: Auth.js con Google OAuth.
- **Archivos operativos**: Cloudflare R2 como almacenamiento privado principal de blobs.
- **Google Drive**: Drive API v3 desde backend.
- **Jobs en segundo plano**: tabla de jobs en PostgreSQL más worker simple dentro del mismo despliegue o proceso separado mínimo si Render lo exige.
- **AI Memory**: procesamiento incremental de feedback de Tomi con LLM externo configurable.
- **Búsqueda**: PostgreSQL Full Text Search para MVP.
- **Deployment**: Render Web Service + Render PostgreSQL.
- **Secretos**: variables de entorno de Render.

## Decisiones técnicas

### Aplicación full-stack única

- **Decisión**: construir un monolito Next.js full-stack.
- **Por qué**: el MVP es interno, con pocos usuarios, sin necesidad de microservicios ni frontend/backend separados. Reduce coordinación, despliegue, costos y superficie operativa.
- **Alternativa descartada**: frontend Next.js separado + API independiente en Express/Nest.
- **Impacto en costos**: un solo Web Service inicialmente.
- **Impacto en complejidad**: menor complejidad de despliegue, autenticación y contratos internos.

### Next.js + TypeScript

- **Decisión**: usar Next.js con TypeScript.
- **Por qué**: permite interfaz, rutas protegidas, endpoints, server-side rendering cuando convenga y despliegue como servidor Node en Render.
- **Alternativa descartada**: SPA React + backend separado.
- **Impacto en costos**: no agrega servicios.
- **Impacto en complejidad**: mantiene una sola base de código.

Según la documentación oficial de Next.js, una app Next.js puede desplegarse como servidor Node.js y conservar soporte completo de features.

### PostgreSQL como base operativa

- **Decisión**: PostgreSQL es la fuente operativa de la aplicación.
- **Por qué**: el producto necesita relaciones claras entre entregas, piezas, versiones, feedback, Journal, sincronización Drive y AI Memory. PostgreSQL permite integridad, transacciones, JSONB e índices de búsqueda.
- **Alternativa descartada**: SQLite en disco.
- **Impacto en costos**: Render ofrece Postgres gratuito para prueba, pero con vencimiento; producción requiere plan pago o proveedor externo.
- **Impacto en complejidad**: baja para un modelo relacional.

Drive no reemplaza la base operativa. Drive es backup recuperable.

### Cloudflare R2 como storage operativo

- **Decisión**: usar Cloudflare R2 como almacenamiento operativo principal de archivos.
- **Por qué**: Render tiene filesystem efímero y no debe conservar uploads reales en disco local, `/tmp`, memoria del proceso ni carpetas del proyecto. R2 ofrece blobs privados persistentes mediante API compatible con S3.
- **Alternativa descartada**: depender de Google Drive como storage primario de uploads.
- **Impacto en costos**: agrega costo de storage/bandwidth bajo y proporcional al uso.
- **Impacto en complejidad**: introduce signed URLs y validación de objetos, pero evita límites de memoria/transferencia del servidor.

Responsabilidades:

- **PostgreSQL**: metadata, estado, relaciones, `storageKey`, IDs de Drive y jobs.
- **Cloudflare R2**: archivos operativos privados.
- **Google Drive**: backup estructurado, recuperación y organización posterior.

Los objetos R2 se referencian por `storageKey` estable. No se guardan URLs presignadas en la base de datos.

### Prisma ORM

- **Decisión**: usar Prisma ORM.
- **Por qué**: tipado fuerte, migraciones, buen encaje con TypeScript y Auth.js, y menor fricción para desarrollo asistido por Codex.
- **Alternativa descartada**: SQL manual con `pg`.
- **Impacto en costos**: ninguno.
- **Impacto en complejidad**: reduce errores de acceso a datos, aunque exige disciplina en migrations cuando empiece la implementación.

### Auth.js con Google OAuth

- **Decisión**: Auth.js con proveedor Google.
- **Por qué**: cubre login OAuth en Next.js, sesiones y persistencia de usuarios con adaptador de base de datos.
- **Alternativa descartada**: implementar OAuth manualmente.
- **Impacto en costos**: ninguno.
- **Impacto en complejidad**: baja.

La autorización de usuarios se modela de forma simple con allowlist/configuración central, sin convertirlo en matriz de roles.

### Google Drive API desde backend

- **Decisión**: toda operación Drive pasa por backend.
- **Por qué**: evita exponer credenciales, centraliza permisos, Journal y recuperación.
- **Alternativa descartada**: subir desde frontend directo a Drive.
- **Impacto en costos**: sin costo directo de infraestructura.
- **Impacto en complejidad**: moderada por manejo de credenciales, carpetas, manifests y fallos.

### Jobs simples basados en PostgreSQL

- **Decisión**: representar AI processing, sync Drive y recuperación con tablas de jobs/operaciones en PostgreSQL.
- **Por qué**: evita Redis, RabbitMQ, Kafka u otra infraestructura para pocos usuarios.
- **Alternativa descartada**: cola externa dedicada.
- **Impacto en costos**: evita servicios adicionales.
- **Impacto en complejidad**: baja a moderada; requiere idempotencia y locks simples.

### Búsqueda con PostgreSQL Full Text Search

- **Decisión**: usar PostgreSQL Full Text Search para búsqueda global inicial.
- **Por qué**: alcanza para entregas, notas, feedback y conversaciones del MVP sin infraestructura externa.
- **Alternativa descartada**: Elasticsearch, Algolia o búsqueda semántica obligatoria.
- **Impacto en costos**: ninguno adicional.
- **Impacto en complejidad**: bajo.

### AI Memory incremental

- **Decisión**: procesar solo feedback nuevo de Tomi, guardar resultado estructurado y reutilizarlo.
- **Por qué**: cumple MVP, baja costos y evita reenviar historial completo.
- **Alternativa descartada**: agente autónomo o reprocesamiento completo en cada consulta.
- **Impacto en costos**: controlado por cantidad de feedback nuevo.
- **Impacto en complejidad**: moderada, concentrada en job de procesamiento y validación de salida estructurada.

## Flujo técnico general

1. Usuario inicia sesión con Google.
2. Backend valida que el usuario esté autorizado.
3. Usuario crea entrega y selecciona piezas.
4. Frontend pide al backend URLs PUT presignadas para R2.
5. Browser sube archivos directamente a R2.
6. Backend confirma los objetos con HEAD.
7. Backend persiste entrega, piezas, versiones iniciales y operación de sincronización.
8. Backend encola sincronización a Drive.
9. Journal registra eventos relevantes.
10. Feedback de Tomi genera job de AI Memory.
11. Worker procesa el feedback con LLM y guarda AIKnowledgeEntry.
12. Dashboard y búsqueda leen de PostgreSQL.
13. Drive queda disponible para restauración si una entrega fue eliminada de la plataforma.

Flujo de creación real:

```text
Browser
→ POST /api/deliveries/prepare
→ backend genera deliveryId/pieceId, signed PUTs para keys definitivas y receipt HMAC temporal
→ browser sube archivos directo a R2
→ POST /api/deliveries/finalize
→ server verifica receipt, usuario, expiración y obtiene metadata canónica
→ server HEAD verification
→ DB transaction creates Delivery/Piece/PieceVersion
→ Journal + SyncOperation PENDING para Drive
→ redirect detail
```

`finalize` no confía en metadata estructural enviada libremente por el browser. El browser solo vuelve a enviar `attemptToken`, nota general y notas guardadas por pieza. `type`, orden, `storageKey`, filenames, MIME types, tamaños y IDs de piezas salen del receipt firmado emitido por `prepare`.

El cleanup de intentos de creación también es un capability temporal: `cleanup-upload` acepta únicamente el `attemptToken`, valida usuario y expiración, comprueba que la Delivery no exista y borra solamente las keys contenidas en ese receipt. Esto no es un Draft de negocio y no crea filas en PostgreSQL antes de `finalize`.

El upload de una nueva versión de pieza usa el mismo patrón seguro:

```text
Browser
→ POST /api/pieces/[pieceId]/versions/prepare
→ backend valida pieza, Delivery abierta, latest version y genera signed PUT + receipt HMAC temporal
→ browser sube el archivo directo a R2
→ POST /api/pieces/[pieceId]/versions/finalize
→ server valida receipt, usuario, pertenencia de pieza, que la latest version no haya cambiado y HEAD de R2
→ DB transaction creates PieceVersion con reviewState null
→ Journal + SyncOperation PENDING para Drive
```

Si otra versión se finaliza entre `prepare` y `finalize`, el servidor rechaza el intento y borra best-effort el objeto R2 preparado. No se crea automáticamente una V3.

Si Drive falla, la Delivery no se invalida. El archivo ya está en R2, la metadata queda en PostgreSQL y la sincronización a Drive queda pendiente/fallida para reintento.

## Límites intencionales

- No microservicios.
- No Kubernetes.
- No Redis/RabbitMQ/Kafka por defecto.
- No Elasticsearch/Algolia en MVP.
- No agente autónomo de revisión.
- No pre-revisión automática.
- No entrenar modelo propio.

## Dependencias con decisiones abiertas

- Formatos y tamaños de archivo afectan validación de uploads y límites de Render.
- Estado de pieza al subir nueva versión afecta modelo de evaluación.
- Identificación confiable de Tomi afecta autorización de AI Memory.
- Estado al restaurar desde Drive afecta lógica de restore.
- Búsqueda en Journal afecta índice global.

## Referencias oficiales verificadas

- Next.js deployment: https://nextjs.org/docs/app/getting-started/deploying
- Render Next.js: https://render.com/docs/deploy-nextjs-app
- Render free limitations: https://render.com/docs/free
- Render Postgres: https://render.com/docs/postgresql
- Prisma PostgreSQL: https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql
- Auth.js: https://authjs.dev/
- Google Drive API: https://developers.google.com/drive/api/reference/rest/v3
- PostgreSQL Full Text Search: https://www.postgresql.org/docs/16/textsearch.html
