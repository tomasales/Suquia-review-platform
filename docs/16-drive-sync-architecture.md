# Arquitectura de sincronización con Google Drive

## Principios

- PostgreSQL es la fuente operativa de la experiencia.
- Cloudflare R2 es el almacenamiento operativo principal de archivos.
- Google Drive es backup completo, organizado y recuperable.
- El backend es el único actor que escribe en Drive.
- La aplicación no depende de Drive para aceptar una entrega si los archivos ya están seguros en R2.
- No borrar automáticamente backups de Drive cuando una entrega se elimina de la plataforma.
- No escanear todo Drive para recuperar eliminadas; usar `deleted_entries.json`.
- Toda operación relevante genera Journal.

## Estrategia de autenticación Drive

### Recomendación

Usar una cuenta de servicio del proyecto Google Cloud y compartir explícitamente una carpeta o Shared Drive de SUQUIA con el email de esa cuenta de servicio.

### Razón

- Evita depender de que un usuario final mantenga sesión OAuth.
- Centraliza credenciales en backend.
- Simplifica un sistema interno con pocos usuarios.

### Precaución importante

Una cuenta de servicio no se comporta exactamente como una cuenta humana de Google Drive ni pertenece automáticamente al dominio de Google Workspace. La documentación oficial de Google indica que, para administrar Shared Drives como administrador de dominio, puede hacer falta impersonar a un administrador autenticado y que las cuentas de servicio no pertenecen al dominio como usuarios normales.

Por eso la configuración inicial debe probarse explícitamente con la carpeta real de SUQUIA.

## Configuración inicial de Drive

1. Crear proyecto en Google Cloud.
2. Habilitar Google Drive API.
3. Crear service account.
4. Guardar credenciales JSON como secreto de Render.
5. Crear carpeta raíz o Shared Drive:
   - `/Suquia`
   - `/Suquia/Stories`
   - `/Suquia/Feed`
6. Compartir esa carpeta o Shared Drive con el email de la service account con permisos suficientes para crear carpetas y archivos.
7. Guardar `DRIVE_ROOT_FOLDER_ID`, `DRIVE_STORIES_FOLDER_ID` y `DRIVE_FEED_FOLDER_ID` en variables de entorno o SystemConfiguration.
8. Ejecutar health check manual inicial.

## Carpeta por entrega

Cada Delivery crea una carpeta bajo su tipo:

```text
/Suquia
  /Stories
    /<deliveryId>
  /Feed
    /<deliveryId>
```

El nombre visible puede incluir el título generado para lectura humana, pero el ID inmutable debe estar en manifest y metadata. No depender del nombre de carpeta como identificador.

## Estructura recomendada

```text
/<Tipo>/<deliveryId>
  manifest.json
  journal.jsonl
  /pieces
    /<piecePosition>-<pieceId>
      metadata.json
      /versions
        /V1-<pieceVersionId>
          original-file
```

El motor inicial no crea todavía `feedback-general.jsonl`, `feedback.jsonl`, referencias, V2 ni carpetas vacías para features futuras. La convención final de nombres sigue pendiente. La arquitectura exige que los IDs inmutables estén en manifest.

## Storage operativo y uploads

Los uploads reales no deben persistirse en filesystem local de Render, `/tmp`, memoria del proceso ni carpetas del proyecto. El archivo viaja:

```text
browser → R2
```

mediante URL PUT presignada corta generada por backend. Luego el backend confirma el objeto con HEAD antes de considerar que el asset está listo para una transacción futura de Delivery/Piece/PieceVersion.

La DB guarda metadata y `storageKey`; no guarda URLs presignadas. La URL de lectura también es temporal y se genera solo cuando la UI necesita mostrar el archivo.

## Uploads a Drive

La Drive API permite crear archivos y carpetas con `files.create`. Las carpetas son archivos con MIME type `application/vnd.google-apps.folder`.

Para archivos:

- usar upload multipart para archivos pequeños con metadata;
- usar upload resumable para archivos mayores a 5 MB o cuando convenga tolerancia a interrupciones;
- guardar `driveFileId`, `driveFolderId`, MIME type, tamaño y checksum si se calcula.

## Motor backend inicial

El MVP ya puede crear una `SyncOperation` de tipo `DRIVE_BACKUP_DELIVERY` al cerrar una entrega real. El processor backend ejecuta esa operación bajo demanda y no se dispara todavía desde `/api/deliveries/finalize`, por lo que Drive sigue sin bloquear el alta de una Delivery.

Endpoints disponibles:

- `GET /api/drive/health`: verifica autenticación y acceso a root, Stories y Feed sin crear archivos.
- `POST /api/drive/sync-operations/[id]`: procesa una SyncOperation puntual de backup.
- `POST /api/drive/process-pending`: procesa como máximo una operación `PENDING` antigua, sin seleccionar `FAILED`.

Todas las rutas están protegidas server-side por usuario autorizado.

El processor usa locking lógico por transición atómica:

```text
PENDING / FAILED -> SYNCING
```

Si la operación ya está `SYNCING`, no lanza otro backup en paralelo. Si ya está `SYNCED`, responde de forma idempotente.

## Idempotencia con appProperties

Los objetos creados por SUQUIA en Drive se identifican con `appProperties`, no solo por nombre visible. Cada búsqueda combina:

- parent folder;
- `trashed = false`;
- propiedades SUQUIA.

Si aparece exactamente un objeto, se reutiliza. Si no aparece ninguno, se crea. Si aparecen varios objetos para una identidad única, se detiene con error de integridad para evitar duplicados silenciosos.

Identidades principales:

- Delivery folder: `suquiaEntityType=delivery`, `suquiaEntityId=<deliveryId>`.
- Piece folder: `suquiaEntityType=piece`, `suquiaEntityId=<pieceId>`, `suquiaDeliveryId=<deliveryId>`.
- Version folder: `suquiaEntityType=piece-version`, `suquiaEntityId=<pieceVersionId>`, `suquiaDeliveryId=<deliveryId>`.
- Asset: `suquiaEntityType=piece-version-asset`, `suquiaEntityId=<pieceVersionId>`, `suquiaDeliveryId=<deliveryId>`.
- Manifest: `suquiaEntityType=delivery-manifest`, `suquiaEntityId=<deliveryId>`.
- Journal: `suquiaEntityType=delivery-journal`, `suquiaEntityId=<deliveryId>`.

Los IDs se persisten progresivamente en PostgreSQL:

- `Delivery.driveFolderId`;
- `Delivery.driveManifestFileId`;
- `PieceVersion.driveFolderId`;
- `PieceVersion.driveFileId`.

Esto permite reintentos manuales sin duplicar carpetas ni assets.

## manifest.json

Debe permitir reconstruir una entrega sin inferir por nombres.

Schema conceptual:

```json
{
  "schemaVersion": 1,
  "delivery": {
    "id": "immutable-delivery-id",
    "type": "STORIES",
    "status": "SENT_FOR_REVIEW",
    "generatedTitle": "Stories · 12 Ago · 5 piezas",
    "generalNote": "...",
    "createdByUserId": "...",
    "submittedAt": "...",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "users": [
    {
      "id": "...",
      "email": "...",
      "name": "..."
    }
  ],
  "pieces": [
    {
      "id": "...",
      "position": 1,
      "initialNote": "...",
      "reviewState": "OK",
      "versions": [
        {
          "id": "...",
          "versionNumber": 1,
          "uploadedByUserId": "...",
          "uploadedAt": "...",
          "originalFilename": "...",
          "mimeType": "...",
          "fileSizeBytes": 123,
          "driveFileId": "...",
          "relativePath": "pieces/01-.../versions/V1-.../original-file"
        }
      ]
    }
  ],
  "feedback": [
    {
      "id": "...",
      "deliveryId": "...",
      "pieceId": "...",
      "pieceVersionId": "...",
      "authorUserId": "...",
      "sourceType": "TOMI",
      "level": "PIECE",
      "body": "...",
      "createdAt": "...",
      "attachmentIds": ["..."]
    }
  ],
  "attachments": [
    {
      "id": "...",
      "feedbackId": "...",
      "driveFileId": "...",
      "relativePath": "...",
      "mimeType": "image/png"
    }
  ],
  "journal": {
    "driveFileId": "...",
    "format": "jsonl"
  },
  "metadata": {
    "exportedAt": "...",
    "appVersion": "..."
  }
}
```

Dependencias abiertas:

- estado de pieza al subir nueva versión;
- convención final de nombres;
- estado de entrega restaurada.

## deleted_entries.json

Ubicación recomendada:

```text
/Suquia/deleted_entries.json
```

Estructura conceptual:

```json
{
  "schemaVersion": 1,
  "entries": [
    {
      "deliveryId": "...",
      "deliveryType": "STORIES",
      "generatedTitle": "...",
      "driveFolderId": "...",
      "manifestFileId": "...",
      "deletedAt": "...",
      "deletedByUserId": "...",
      "deletedByEmail": "...",
      "lastKnownStatus": "APPROVED"
    }
  ]
}
```

Al restaurar:

1. leer `deleted_entries.json`;
2. mostrar solo esas entradas;
3. leer manifest por `manifestFileId`;
4. reconstruir DB;
5. registrar Journal;
6. remover la entrada del índice o marcarla como restaurada y compactar luego.

La decisión de estado restaurado queda abierta en `13-open-decisions.md`.

## Operación “Entregar”

### Caso normal

1. Usuario completa tipo, archivos, orden y notas.
2. Backend valida sesión y allowlist.
3. Backend emite URLs PUT presignadas para R2.
4. Browser sube cada archivo directo a R2 con el mismo `Content-Type` usado al firmar.
5. Backend confirma cada objeto con HEAD.
6. Backend crea Delivery, Pieces y PieceVersions en transacción, guardando `storageKey`.
7. Backend crea SyncOperation `PENDING`.
8. En el bloque actual, la Delivery queda disponible aunque Drive todavía no se procese automáticamente.
9. Al invocar el processor, si Drive responde, SyncOperation pasa a `SYNCING`.
10. Backend copia/sube archivos desde storage operativo a Drive, escribe manifest y journal.
11. Backend guarda IDs de Drive.
12. SyncOperation pasa a `SYNCED`.
13. Journal registra entrega creada/enviada y sincronización exitosa.

### Drive caído

1. Backend conserva Delivery, Pieces, PieceVersions, notas y metadata.
2. Archivos quedan en Cloudflare R2 como almacenamiento operativo persistente.
3. SyncOperation queda `FAILED`.
4. Usuario ve error claro y botón **Reintentar**.
5. Journal registra fallo.
6. No hay retry automático inesperado.

Drive failure no invalida la Delivery si R2 y PostgreSQL están consistentes.

## Estados técnicos de SyncOperation

- `PENDING`: operación registrada, no intentada o esperando acción.
- `SYNCING`: operación en curso.
- `FAILED`: falló y requiere reintento manual.
- `SYNCED`: finalizada correctamente.

Estos estados no son estados visibles de entrega.

## Health check

- Backend expone endpoint interno/autenticado `GET /api/drive/health`.
- Frontend consulta ese endpoint para mostrar indicador.
- Polling del frontend aproximadamente cada 3 minutos mientras la app está abierta.
- Botón del indicador dispara chequeo manual.
- Acciones críticas como **Entregar** ejecutan chequeo backend justo antes de operar.
- El botón **Entregar** permanece habilitado; el chequeo ocurre al tocarlo.

## Coherencia DB/Drive

- DB guarda IDs de Drive para carpetas y archivos.
- Drive manifest guarda IDs de DB.
- SyncOperation registra operaciones pendientes/fallidas.
- Journal registra fallos, reintentos y recuperaciones.
- Las operaciones deben ser idempotentes usando IDs propios antes de crear archivos cuando sea posible.

## Referencias oficiales verificadas

- Drive API v3: https://developers.google.com/drive/api/reference/rest/v3
- Crear archivos: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
- Crear carpetas: https://developers.google.com/workspace/drive/api/guides/folder
- Uploads: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Compartir permisos: https://developers.google.com/workspace/drive/api/guides/manage-sharing
- Shared Drives y service accounts: https://developers.google.com/workspace/drive/api/guides/manage-shareddrives
