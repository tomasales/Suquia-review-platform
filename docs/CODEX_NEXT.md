# CODEX_NEXT

Este archivo contiene la única tarea operativa que Codex debe ejecutar después de que `docs/CODEX_RUN.md` haya sincronizado `main`.

## Protocolo

1. Leer este archivo completo después del pull.
2. Releer docs y código indicados.
3. No asumir decisiones de producto fuera de este scope.
4. Implementar únicamente esta tarea.
5. Ejecutar las validaciones indicadas.
6. Si aparece un blocker real, documentarlo y detenerse; no inventar arquitectura incompatible.
7. Si todo queda correcto, hacer el commit indicado y push a `main`.
8. Después del push, detenerse.

---

# Tarea actual — Referencias visuales adjuntas al feedback

Quiero completar el feedback de Piece permitiendo adjuntar una o varias imágenes de referencia.

Ya existe:

- feedback de texto real ligado a `PieceVersion`;
- `FeedbackAttachment` en Prisma;
- R2 privado con signed PUT/GET;
- receipts HMAC para uploads;
- versionado V1/V2;
- locks `Delivery → Piece`;
- Drive backup incremental;
- UI con botón `Adjuntar referencia` actualmente deshabilitado;
- sección visual `Referencias` en el modal.

La referencia visual debe ser un attachment REAL de un `Feedback`, no una entidad paralela.

## No hacer

- NO implementar ConversationReply.
- NO implementar feedback general de Delivery.
- NO implementar AI Memory/jobs.
- NO implementar Direction.
- NO implementar restore/delete/search.
- NO agregar pins/coordenadas sobre imágenes.
- NO cambiar reglas de review/status.
- NO hacer bucket público.
- NO crear una segunda tabla de “Reference”.

## Releer

- `docs/03-pieces-and-versions.md`
- `docs/04-feedback.md`
- `docs/05-journal.md`
- `docs/08-google-drive.md`
- `docs/09-errors-and-recovery.md`
- `docs/13-open-decisions.md`
- `docs/15-data-model.md`
- `docs/16-drive-sync-architecture.md`

Código relevante:

- `prisma/schema.prisma`
- `src/lib/piece-review-actions.ts`
- `src/lib/piece-review-rules.ts`
- `src/components/deliveries/piece-review-experience.tsx`
- `src/components/deliveries/piece-review-panel.tsx`
- `src/lib/deliveries.ts`
- `src/lib/delivery-upload-receipt.ts`
- `src/lib/storage/*`
- `src/lib/drive/backup-snapshot.ts`
- `src/lib/drive/backup-format.ts`
- `src/lib/drive/processor.ts`

---

## 1. Decisión funcional

Un Feedback de Piece puede tener:

- texto obligatorio;
- cero, una o varias imágenes de referencia.

El texto sigue siendo obligatorio en MVP.

No permitir “feedback vacío con solo imágenes” todavía.

Las referencias pertenecen al Feedback concreto y, por transitividad, a la `PieceVersion` donde ese feedback fue creado.

Una referencia histórica sigue visible cuando se navega una versión anterior.

Solo la latest `PieceVersion` acepta feedback nuevo, igual que hoy.

---

## 2. Modelo

Usar el modelo existente:

`FeedbackAttachment`

No crear migration si el schema actual alcanza.

Campos actuales relevantes:

- id;
- feedbackId;
- uploadedByUserId;
- originalFilename;
- mimeType;
- fileSizeBytes;
- storageKey;
- driveFileId;
- createdAt.

Si el schema actual alcanza, NO tocar Prisma.

---

## 3. Tipos permitidos

Referencias MVP:

- image/jpeg
- image/png
- image/webp

Máximo:

- 25 MB por archivo;
- hard cap técnico de 10 imágenes por Feedback.

Validar cliente y servidor.

No PDF/video/GIF en este bloque.

---

## 4. Arquitectura de upload

Mantener patrón seguro:

PREPARE
→ browser PUT directo a R2
→ FINALIZE

No mandar binaries por Next server.

Cuando no hay referencias, conservar el endpoint/text-flow actual sin obligar a hacer prepare.

Cuando hay referencias seleccionadas, usar un flujo específico con receipt firmado.

---

## 5. Prepare attachments

Crear endpoint protegido, nombre sugerido:

`POST /api/pieces/[pieceId]/feedback/attachments/prepare`

Input:

```json
{
  "pieceVersionId": "...",
  "attachments": [
    {
      "filename": "ref.jpg",
      "mimeType": "image/jpeg",
      "fileSizeBytes": 12345
    }
  ]
}
```

Server:

1. usuario autorizado;
2. Piece existe y Delivery no está eliminada;
3. Delivery no CLOSED;
4. `pieceVersionId` pertenece a Piece y es latest en ese momento;
5. 1..10 attachments;
6. validar MIME/tamaño;
7. generar `feedbackId = crypto.randomUUID()`;
8. generar `feedbackAttachmentId` por archivo;
9. generar storage keys definitivas;
10. generar signed PUT URLs;
11. devolver receipt firmado.

La validación de latest en PREPARE es optimización UX, NO autoridad final. FINALIZE debe revalidar bajo locks.

---

## 6. Receipt nuevo

Extender la infraestructura HMAC actual con un kind específico, por ejemplo:

`piece-feedback-attachments`

No debe poder confundirse con:

- `delivery-creation`;
- `piece-version-upload`.

Payload mínimo firmado:

- kind;
- userId;
- deliveryId;
- pieceId;
- pieceVersionId;
- feedbackId;
- attachments[]:
  - id;
  - filename;
  - mimeType;
  - fileSizeBytes;
  - storageKey;
- issuedAt;
- expiresAt.

Expiry 30 min como los receipts actuales.

Finalization debe comprobar expected kind.

---

## 7. Storage keys

Crear builder server-side estable.

Forma conceptual:

```text
deliveries/<deliveryId>/pieces/<pieceId>/v<versionNumber>/feedback/<feedbackId>/references/<attachmentId>-<filename>
```

No usar paths temporales.

No aceptar storageKey arbitraria desde browser.

Sanitizar filename igual que el resto del storage.

---

## 8. Prepare response

Conceptualmente:

```json
{
  "attemptToken": "...",
  "feedbackId": "...",
  "attachments": [
    {
      "id": "...",
      "uploadUrl": "..."
    }
  ]
}
```

No devolver secretos.

---

## 9. Browser upload

Al enviar feedback con referencias:

1. prepare;
2. subir attachments a R2;
3. máximo 3 uploads concurrentes;
4. si todos terminan → finalize.

Durante upload:

- no perder textarea;
- no perder Files seleccionados;
- deshabilitar submit repetido;
- mostrar copy discreto `Subiendo referencias…`.

No bloquear navegación general de la app.

---

## 10. Finalize feedback + attachments

Crear endpoint protegido sugerido:

`POST /api/pieces/[pieceId]/feedback/attachments/finalize`

Input:

```json
{
  "attemptToken": "...",
  "body": "Feedback..."
}
```

Toda metadata estructural de attachments viene del receipt.

No confiar en attachment IDs/storageKeys enviados por separado por browser.

---

## 11. Verificación externa antes de transaction

Antes de abrir DB transaction:

- verify receipt;
- usuario coincide;
- pieceId URL coincide;
- verificar cada R2 object con HEAD;
- tamaño y MIME coinciden con receipt.

Si un objeto no existe o no coincide:

- responder error público;
- cleanup best-effort del attempt;
- no crear Feedback.

No hacer llamadas R2 dentro de transaction DB.

---

## 12. Transaction canónica

Después de verificar R2:

```text
transaction
→ lock Delivery
→ lock Piece
→ releer Piece/Delivery/latest PieceVersion
→ validar receipt contra estado actual
→ crear Feedback
→ crear FeedbackAttachment[]
→ posible Delivery.status actual
→ Journal
→ enqueue Drive
→ commit
```

Mantener exactamente el orden de locks ya definido.

---

## 13. Race con V2

Caso:

prepare refs sobre V1
→ archivos suben R2
→ aparece V2
→ finalize intenta feedback sobre V1.

FINALIZE debe responder:

- 409;
- code `HISTORICAL_VERSION`.

NO crear feedback retrospectivo.

Hacer cleanup best-effort de los objects firmados por ese receipt.

Frontend:

- conserva texto y Files locales;
- `router.refresh()`;
- toast actual de versión más nueva;
- NO mueve automáticamente texto ni refs a V2.

---

## 14. CLOSED durante upload

Si Delivery se cierra entre prepare y finalize:

- 409 `DELIVERY_CLOSED`;
- cleanup best-effort de refs R2;
- no crear Feedback;
- mantener texto/Files locales en cliente;
- refresh;
- toast de entrega cerrada.

---

## 15. Idempotencia finalize

El receipt contiene `feedbackId` pre-generado.

Si se reintenta FINALIZE y ese Feedback ya existe:

si coincide con:

- same piece;
- same pieceVersion;
- same author;
- attachments esperados;

responder success idempotente.

No crear un segundo Feedback.

Esto cubre:

server commit OK
→ respuesta se pierde
→ retry mismo attemptToken.

---

## 16. Reutilizar lógica de feedback

No duplicar reglas de negocio en dos implementaciones divergentes.

Refactorizar si hace falta para que:

- feedback text-only actual;
- feedback con attachments;

compartan la misma lógica canónica para:

- latest version;
- sourceType;
- Delivery.status;
- Journal;
- Drive enqueue;
- locks.

Puede ampliarse `addPieceFeedback()` con opciones internas o extraer helper transaction-safe.

No romper el endpoint text-only existente.

---

## 17. sourceType

Igual que hoy:

`User.isAiLearningSource === true`
→ TOMI

otros
→ OTHER

No inferir DIRECTION.

No crear AIProcessingJob todavía.

---

## 18. Journal

Un feedback con referencias sigue generando UN evento principal:

`FEEDBACK_ADDED`

Actualizar metadata para incluir, sin body:

- pieceId;
- pieceVersionId;
- sourceType;
- attachmentCount;
- attachmentIds.

No crear un JournalEvent por cada archivo cuando todos son parte del mismo submit.

Texto del feedback no se duplica en Journal.

---

## 19. Cleanup endpoint

Crear cleanup específico por receipt, sugerido:

`POST /api/pieces/[pieceId]/feedback/attachments/cleanup`

Input:

```json
{ "attemptToken": "..." }
```

Server:

- verify kind;
- verify user;
- verify pieceId;
- si Feedback `feedbackId` ya existe → NO borrar sus objetos;
- si no existe → borrar best-effort únicamente storageKeys firmadas.

Nunca endpoint DELETE con storageKey libre.

---

## 20. Error/retry cliente

Distinguir fases mínimas:

- selected;
- preparing;
- uploading;
- uploaded;
- finalizing;
- finalize-error.

Si PREPARE falla:

- conservar texto + Files;
- próximo submit vuelve a prepare.

Si PUT falla:

- cleanup attempt;
- conservar texto + Files;
- próximo submit vuelve a prepare/upload.

Si FINALIZE falla por network/5xx DESPUÉS de upload:

- NO cleanup;
- conservar attemptToken;
- conservar uploaded=true;
- conservar texto + Files;
- CTA `Reintentar` ejecuta SOLO finalize.

Misma filosofía que upload de PieceVersion.

---

## 21. Selector de referencias UI

Activar `Adjuntar referencia` solamente cuando:

- latest version;
- Delivery no CLOSED;
- no hay submit activo.

Usar `<input type="file" multiple>`.

Accept:

`image/jpeg,image/png,image/webp`

Agregar archivos a la selección existente en vez de reemplazarla, hasta hard cap 10.

Evitar duplicados obvios por combinación:

- name;
- size;
- lastModified.

---

## 22. Preview antes de enviar

Debajo del textarea/acciones mostrar thumbnails compactos de refs seleccionadas.

Cada una debe poder eliminarse antes de submit.

Mostrar filename truncado si sirve.

No convertir el composer en una card gigante.

Mantener UI sobria/Notion-like actual.

Usar object URLs con cleanup correcto para evitar leaks.

---

## 23. Texto obligatorio

`Enviar feedback` sigue disabled si `draft.trim()` está vacío, aunque haya referencias.

Las referencias complementan el feedback; no lo reemplazan.

---

## 24. Success UI

Cuando finaliza correctamente:

- append optimistic del Feedback una vez;
- incluir attachments en ese Feedback;
- limpiar textarea;
- limpiar selección de referencias/object URLs;
- modal sigue abierto;
- misma PieceVersion seleccionada;
- `router.refresh()`;
- `notifyBackupPending()`;
- no auto-next.

No hace falta toast de success si hoy feedback text-only tampoco lo usa.

---

## 25. Feedback DTO

Actualizar Delivery detail para que cada feedback exponga attachments:

```ts
attachments: Array<{
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedByLabel: string;
  createdAtLabel: string;
  imageSrc: string | null;
}>
```

Generar signed GET R2 server-side.

No bucket público.

No mandar storageKey al cliente salvo necesidad interna demostrada.

---

## 26. Feedback UI persistido

En cada card de Feedback:

- autor/fecha/body actual;
- debajo, thumbnails de sus attachments si existen.

Click/tap de una referencia debe permitir verla grande de forma simple.

Preferencia MVP:

- link/overlay liviano;
- no construir editor ni galería compleja.

Mobile touch-friendly.

---

## 27. Sección `Referencias`

Mantener la sección actual del modal.

Pero su fuente real debe ser:

attachments de todos los Feedback de la `selectedVersion`.

No mantener una segunda fuente de verdad paralela.

Puede derivarse en DTO o componente.

Cada referencia debe conservar relación con `feedbackId` aunque la sección la muestre agregada.

Visual Review fixtures deben migrar al mismo shape.

---

## 28. Versiones históricas

V1 histórica:

- feedback V1 visible;
- attachments V1 visibles;
- sección Referencias V1 visible;
- NO se pueden agregar nuevas refs/feedback.

No mover referencias de V1 a V2.

---

# Drive backup

## 29. Snapshot

Actualizar `getDeliveryBackupSnapshot()` para incluir `Feedback.attachments` con:

- id;
- feedbackId;
- uploadedByUserId;
- uploader;
- originalFilename;
- mimeType;
- fileSizeBytes;
- storageKey;
- driveFileId;
- createdAt.

Orden estable:

createdAt ASC, id ASC.

---

## 30. Backup types

Agregar `BackupFeedbackAttachment`.

Preferencia:

`BackupFeedback.attachments: BackupFeedbackAttachment[]`

No usar Prisma payload como formato público.

---

## 31. Manifest v3

El manifest actual tiene schemaVersion 2 y todavía usa attachmentIds vacíos / attachments vacíos.

Como ahora habrá attachments reales:

bump:

`schemaVersion: 3`

Actualizar:

`feedback[].attachmentIds`

con IDs reales.

Agregar top-level `attachments` con metadata suficiente para reconstrucción:

- id;
- feedbackId;
- uploadedByUserId;
- originalFilename;
- mimeType;
- fileSizeBytes;
- driveFileId;
- relativePath;
- createdAt.

No incluir signed URLs.

No guardar secretos.

---

## 32. feedback.jsonl

Cada línea de feedback debe incluir:

`attachmentIds`

No duplicar metadata completa de archivos ahí.

Top-level manifest contiene detalle.

---

## 33. Drive layout refs

Guardar attachments dentro de la versión a la que pertenece el Feedback.

Layout sugerido:

```text
V2-<pieceVersionId>/
  asset
  feedback.jsonl
  references/
    <feedbackId>/
      <attachmentId>-<filename>
```

Usar folders/appProperties estables, no confiar solo en nombres.

Si un layout equivalente queda más limpio con helpers existentes, puede ajustarse manteniendo reconstructability.

---

## 34. Drive appProperties

Para archivo attachment usar identidad estable, por ejemplo:

```json
{
  "suquiaEntityType": "feedback-attachment",
  "suquiaEntityId": "<attachmentId>",
  "suquiaDeliveryId": "<deliveryId>",
  "suquiaFeedbackId": "<feedbackId>",
  "suquiaPieceVersionId": "<pieceVersionId>"
}
```

Folders de references/feedback pueden tener appProperties propias si mejora idempotencia.

---

## 35. Processor Drive

En cada refresh:

- subir attachment si no está respaldado;
- persistir `FeedbackAttachment.driveFileId`;
- no re-subir si ya tiene Drive file válido según estrategia actual;
- regenerar manifest;
- regenerar feedback.jsonl;
- Journal normal.

No re-subir assets de PieceVersion innecesariamente.

Drive falla:

- Feedback/attachments siguen canónicos en Postgres + R2;
- SyncOperation FAILED;
- retry manual posterior toma snapshot actual.

---

## 36. Manifest users

`collectManifestUsers()` debe incluir uploader de FeedbackAttachment si no estaba incluido por otro rol.

No duplicar users.

---

## 37. R2/Drive cleanup

No borrar attachments R2 después de haber creado Feedback.

No implementar delete de attachments persistidos en este bloque.

Solo cleanup de attempts que NO llegaron a Feedback canónico.

---

## 38. Visual Review

Debe seguir sin DB/R2/Drive real.

Activar `Adjuntar referencia` en modo visual con Files locales/object URLs.

Enviar feedback en Visual Review:

- agrega feedback local;
- incluye refs locales;
- sección Referencias se actualiza;
- no API real.

Esto sirve para validar UX desktop/mobile.

---

## 39. Tests receipts/storage

Agregar tests:

- kind nuevo no intercambiable con otros receipts;
- expiry;
- wrong user;
- storage keys scopiadas a Delivery/Piece/Version/Feedback/Attachment;
- max count;
- MIME/tamaño inválido.

---

## 40. Tests finalize

Casos mínimos:

- feedback + 1 attachment success;
- múltiples attachments;
- attachment HEAD missing/mismatch;
- V2 aparece entre prepare/finalize → HISTORICAL_VERSION + no Feedback;
- Delivery CLOSED → DELIVERY_CLOSED;
- idempotent finalize retry;
- sourceType correcto;
- Journal attachmentCount/attachmentIds;
- Drive enqueue una vez;
- text-only endpoint sigue funcionando.

Si no hay DB integration harness, no inventar mocks que pretendan demostrar row locks; separar tests puros y documentar manual E2E.

---

## 41. Tests client

Cubrir helpers/state donde sea razonable:

- add/remove references;
- duplicate Files;
- max count;
- PUT failure mantiene Files/draft y descarta attempt;
- finalize 500 conserva attempt uploaded;
- HISTORICAL_VERSION descarta attempt pero preserva draft/Files;
- success limpia draft/refs;
- aggregate references deriva attachments sin duplicar.

---

## 42. Tests Drive

- snapshot incluye attachments;
- manifest schemaVersion 3;
- feedback attachmentIds reales;
- attachments metadata/relativePath;
- uploader incluido en users;
- feedback.jsonl contiene attachmentIds;
- processor no duplica archivo en segundo refresh.

Mocks Drive aceptables.

---

## 43. Manual E2E real

Con DB + R2 + Drive:

1. abrir latest PieceVersion;
2. escribir feedback;
3. adjuntar 2 referencias;
4. ver previews;
5. eliminar una;
6. enviar;
7. confirmar Feedback persistido;
8. confirmar FeedbackAttachment persistido;
9. reload;
10. thumbnail sigue visible;
11. sección Referencias muestra la referencia;
12. abrir referencia grande;
13. Drive sync;
14. manifest v3 incluye attachment;
15. Drive contiene archivo bajo versión correcta;
16. subir V2;
17. V1 mantiene referencia histórica;
18. V2 empieza sin referencias.

Probar también 390×844 y desktop.

---

## 44. Documentación

Actualizar:

- `docs/04-feedback.md`
- `docs/05-journal.md`
- `docs/08-google-drive.md`
- `docs/09-errors-and-recovery.md`
- `docs/13-open-decisions.md`
- `docs/15-data-model.md`
- `docs/16-drive-sync-architecture.md`

Documentar que en MVP las referencias son `FeedbackAttachment` de imagen y pertenecen a un Feedback/Version concreta.

---

## 45. Validación

Ejecutar:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx prisma validate
```

Si `prisma validate` queda bloqueado únicamente por ausencia de `DATABASE_URL`, reportarlo sin inventar credenciales.

No debe haber migration nueva salvo bloqueo real del schema existente.

---

## 46. Resultado esperado

Reportar:

1. modelo reutilizado;
2. receipt nuevo;
3. prepare;
4. R2 upload;
5. finalize/idempotencia;
6. cleanup;
7. race V2/CLOSED;
8. UI composer;
9. previews/remove;
10. feedback persistido con attachments;
11. sección Referencias derivada;
12. historical versions;
13. Drive snapshot;
14. manifest v3;
15. Drive files/idempotencia;
16. Visual Review;
17. tests;
18. lint;
19. typecheck;
20. build;
21. prisma validate;
22. git status.

Si todo queda correcto:

```text
commit: feat: add feedback reference attachments
push: main
```

Después detenerse.

NO avanzar con conversation ni AI.
