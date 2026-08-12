# Arquitectura de sincronización con Google Drive

## Principios

- PostgreSQL es la fuente operativa de la experiencia.
- Google Drive es backup completo, organizado y recuperable.
- El backend es el único actor que escribe en Drive.
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
  feedback-general.jsonl
  /pieces
    /<piecePosition>-<pieceId>
      metadata.json
      /versions
        /V1-<pieceVersionId>
          original-file
          feedback.jsonl
          /references
        /V2-<pieceVersionId>
          original-file
          feedback.jsonl
          /references
```

La convención final de nombres sigue pendiente. La arquitectura exige que los IDs inmutables estén en manifest.

## Uploads

La Drive API permite crear archivos y carpetas con `files.create`. Las carpetas son archivos con MIME type `application/vnd.google-apps.folder`.

Para archivos:

- usar upload multipart para archivos pequeños con metadata;
- usar upload resumable para archivos mayores a 5 MB o cuando convenga tolerancia a interrupciones;
- guardar `driveFileId`, `driveFolderId`, MIME type, tamaño y checksum si se calcula.

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
      "displayName": "..."
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
2. Backend recibe archivos y metadata.
3. Backend valida sesión y allowlist.
4. Backend crea Delivery, Pieces y PieceVersions en transacción.
5. Backend crea SyncOperation `PENDING`.
6. Backend ejecuta health check Drive actual.
7. Si Drive responde, SyncOperation pasa a `SYNCING`.
8. Backend crea carpetas, sube archivos, escribe manifest y journal.
9. Backend guarda IDs de Drive.
10. SyncOperation pasa a `SYNCED`.
11. Journal registra entrega creada/enviada y sincronización exitosa.

### Drive caído

1. Backend conserva Delivery, Pieces, PieceVersions, notas y metadata.
2. Archivos quedan en almacenamiento operativo temporal/persistente definido para MVP.
3. SyncOperation queda `FAILED`.
4. Usuario ve error claro y botón **Reintentar**.
5. Journal registra fallo.
6. No hay retry automático inesperado.

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
