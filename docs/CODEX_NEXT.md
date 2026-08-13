# CODEX_NEXT

Este archivo es la única instrucción operativa que Codex debe ejecutar cuando Tomi diga algo como:

> hacé la próxima tarea

## Protocolo

1. Leer este archivo completo antes de modificar código.
2. Releer los docs y archivos de código indicados en la tarea.
3. No asumir decisiones de producto que no estén escritas.
4. Implementar únicamente el scope de esta tarea.
5. Ejecutar las validaciones indicadas.
6. Si algo bloquea la implementación, documentar el blocker y no inventar una solución incompatible.
7. Si todo queda correcto, hacer el commit indicado y push a `main`.
8. Después del push, detenerse. No avanzar a la siguiente feature por cuenta propia.

---

# Tarea actual — Hardening de mutations con PieceVersion

Quiero hacer un hardening del nuevo flujo de `PieceVersion` antes de agregar más funcionalidades.

## No hacer

- NO agregar features de producto.
- NO implementar attachments.
- NO implementar conversation.
- NO implementar AI.
- NO cambiar UX general.
- NO modificar Prisma schema salvo bloqueo absolutamente necesario.

## Problemas a resolver

1. Race entre nueva `PieceVersion` y review/feedback.
2. Reconciliación de versiones optimistas después de `router.refresh()`.
3. Retry correcto de `finalize` sin volver a subir R2.

Revisar especialmente:

- `src/lib/piece-review-actions.ts`
- `src/app/api/pieces/[pieceId]/review-state/route.ts`
- `src/app/api/pieces/[pieceId]/feedback/route.ts`
- `src/app/api/pieces/[pieceId]/versions/prepare/route.ts`
- `src/app/api/pieces/[pieceId]/versions/finalize/route.ts`
- `src/app/api/pieces/[pieceId]/versions/cleanup-upload/route.ts`
- `src/components/deliveries/piece-review-experience.tsx`
- `src/lib/delivery-upload-receipt.ts`
- tests actuales de PieceVersion/review

## 1. Regla de consistencia

Solo la `PieceVersion` MÁS RECIENTE puede recibir:

- cambio `OK / Necesita cambios`;
- feedback nuevo.

Esta regla debe sostenerse incluso con requests concurrentes.

No alcanza con:

```text
query latest
→ después abrir transaction
→ mutation
```

La comprobación y la mutation deben quedar serializadas con la creación de nuevas versiones.

## 2. Lock por Piece

Crear un helper server-only simple, por ejemplo:

```ts
lockPieceForMutation(tx, pieceId)
```

Usar PostgreSQL row locking sobre `Piece`:

```sql
SELECT id
FROM "Piece"
WHERE id = ...
FOR UPDATE
```

Usar Prisma `$queryRaw` de forma parametrizada y segura.

No concatenar SQL con IDs.

`Piece` es la unidad de lock porque review, feedback y creación de versión pertenecen a la misma Piece.

No introducir Redis ni distributed locks.

## 3. Todas las mutations relevantes usan el mismo lock

Deben adquirir el lock de `Piece`:

A. `updatePieceReviewState`

B. `addPieceFeedback`

C. finalize de nueva `PieceVersion`

Orden consistente:

```text
transaction
→ lock Piece
→ leer estado canónico actual
→ validar
→ mutation
→ Journal
→ Drive enqueue
→ commit
```

## 4. Review state dentro de transaction

Refactorizar `updatePieceReviewState`.

Mover la lectura relevante dentro de la transaction.

Dentro:

1. lock Piece;
2. cargar Piece + Delivery + latest PieceVersion;
3. validar `deletedAt`;
4. validar `CLOSED`;
5. comprobar `latestVersion.id === pieceVersionId` recibido;
6. comprobar no-op;
7. calcular Delivery status;
8. actualizar `PieceVersion.reviewState`;
9. Journal;
10. Delivery status si corresponde;
11. enqueue Drive.

Si mientras el request esperaba el lock apareció V2, la lectura posterior al lock verá V2.

Si el request pretendía modificar V1, responder 409:

`Esta versión ya forma parte del historial.`

NO modificar V1.

## 5. Feedback dentro de transaction

Mismo criterio para `addPieceFeedback`.

Dentro:

1. lock Piece;
2. cargar Piece canónica;
3. obtener latest version;
4. validar `pieceVersionId`;
5. si ya es histórica → 409;
6. crear Feedback;
7. Journal;
8. Delivery status;
9. Drive enqueue.

No validar latest afuera y confiar en esa lectura durante la transaction.

## 6. Finalize PieceVersion

Mantener fuera de transaction únicamente lo externo:

- verificar receipt;
- validar usuario/kind;
- validar storageKey;
- HEAD R2.

Después:

```text
DB transaction
→ lock Piece
→ volver a leer Delivery + latest PieceVersion
→ validar previousLatestVersionId
→ crear nueva PieceVersion
→ status
→ Journal
→ enqueue
```

Esto hace que review/feedback y V2 compitan por el mismo lock.

## 7. Semántica de carrera esperada

Estado inicial:

`V1 = latest`.

### Si review gana el lock primero

```text
A actualiza V1 OK
→ commit
→ B crea V2 Sin revisar
```

Resultado válido:

- V1 = OK
- V2 = Sin revisar

### Si V2 gana el lock primero

```text
B crea V2
→ commit
→ A obtiene lock
→ descubre que V1 es histórica
→ 409
```

Nunca modificar retrospectivamente V1 una vez que V2 ya existe.

## 8. Feedback tiene la misma semántica

Si feedback sobre V1 gana antes que V2, queda históricamente ligado a V1.

Si V2 gana primero, feedback sobre V1 se rechaza.

## 9. Delivery status consistency

El cálculo de `Delivery.status` debe usar el estado leído DESPUÉS de adquirir el lock.

Nueva versión:

`→ SENT_FOR_REVIEW`

Review / feedback:

mantener reglas actuales.

No crear FSM nueva.

## 10. Constraint DB

Mantener:

```prisma
@@unique([pieceId, versionNumber])
```

El lock resuelve consistencia de negocio.

La constraint sigue como integridad DB.

## 11. Versiones locales duplicadas

Actualmente el frontend combina:

```text
localVersions[piece.id]
+
piece.versions
```

Después de success:

- agrega V2 local;
- `router.refresh()`;
- V2 llega desde PostgreSQL;
- el state local puede seguir vivo.

Crear helper explícito:

```ts
mergePieceVersions(persisted, optimistic)
```

o equivalente.

Deduplicar primero por `version.id` y defensivamente por `versionNumber`.

Cuando existe la versión persistida con el mismo ID, preferir la versión PERSISTIDA.

La persistida tiene signed read URL, uploader, timestamps y metadata server.

La optimistic solo existe hasta que llega PostgreSQL.

## 12. Cleanup de optimistic versions

Si una optimistic version ya apareció desde server, eliminarla del state local cuando sea razonable.

Puede ser mediante effect de reconciliación o merge estable.

Evitar loops y acumulación indefinida.

Después de subir V2 y terminar `router.refresh()` debe existir UNA sola:

`V2 · Actual`

y una V1.

Nunca dos V2.

## 13. Retry de finalize

Actualmente cualquier error dentro del bloque:

```text
prepare
→ PUT
→ finalize
```

termina haciendo cleanup del attempt.

Eso no es correcto después de un PUT exitoso.

Distinguir fases conceptuales:

```text
idle
prepared
uploading
uploaded
finalizing
finalize-error
```

No hace falta mostrar esos nombres literalmente.

## 14. PUT failure

Si falla browser → R2 PUT:

- cleanup attempt best-effort;
- descartar `attemptToken`;
- conservar File seleccionado;
- permitir volver a empezar desde prepare.

## 15. Finalize failure recuperable

Si R2 PUT terminó correctamente pero finalize falla por:

- network error;
- 5xx;
- error DB recuperable;

NO llamar cleanup.

Conservar:

- File;
- attemptToken;
- uploaded = true;
- pieceVersionId;
- versionNumber.

La próxima acción principal debe ejecutar SOLAMENTE:

`POST finalize`

sin nuevo prepare ni nuevo PUT.

## 16. Razón de idempotencia

Un error de red después de enviar finalize no significa que finalize haya fallado.

Puede haber ocurrido:

```text
server commit OK
→ respuesta se pierde
```

Como finalize es idempotente, retry con el MISMO `attemptToken` debe devolver success / `alreadyFinalized`.

Por eso NO borrar R2 inmediatamente.

## 17. Clasificar respuestas finalize

### 409

`La pieza ya tiene una versión más nueva.`

En ese caso:

- attempt ya no sirve;
- server hace best-effort cleanup;
- descartar attemptToken;
- mantener File;
- próximo retry hace prepare nuevo.

### 400

HEAD mismatch / archivo inválido:

puede descartarse y limpiarse si corresponde.

### 5xx o network

Preservar attempt para retry finalize.

No reducir todo a `Finalize failed`.

## 18. UI retry

Si tenemos upload confirmado + finalize error:

CTA:

`Reintentar`

No volver a mostrar `Subir V2` como si necesitara upload completo.

Al reintentar usar copy discreto:

`Finalizando…`

o
`Reintentando…`

## 19. Cancel después de upload

Si existe attempt uploaded pero todavía no finalizado y el usuario toca Cancelar explícitamente:

- llamar `cleanup-upload` con attemptToken;
- después limpiar state local.

Cancelar explícitamente es distinto de un error técnico.

## 20. Modal close

Si existe upload confirmado en R2 pero finalize está pendiente/error:

NO borrar silenciosamente solo porque el modal se cierra.

Mantener attempt durante la vida del componente/sesión.

No implementar localStorage todavía.

## 21. Success finalize

Al success:

- agregar optimistic version una sola vez;
- limpiar upload attempt;
- toast;
- `router.refresh()`;
- seleccionar nueva versión;
- `notifyBackupPending()`.

Si `alreadyFinalized`, mismo comportamiento.

## 22. Error copy

### Prepare / PUT

Título:

`No pudimos subir la nueva versión`

### Finalize recuperable

Título:

`No pudimos terminar de guardar la versión`

Descripción:

`El archivo ya está subido. Podés reintentar sin volver a cargarlo.`

### 409 newer version

Título:

`Hay una versión más nueva`

Descripción:

`Volvé a intentar para crear la siguiente versión.`

## 23. No pérdida de File

En todos los errores mantener el File seleccionado salvo:

- success;
- Cancel explícito.

## 24. Review optimistic rollback

Si review devuelve 409 porque entró V2 mientras esperaba:

- rollback optimistic review;
- `router.refresh()`;
- mostrar toast:

Título:

`Hay una versión más nueva`

Descripción:

`Revisá la versión actual.`

No mostrar error técnico genérico.

## 25. Feedback 409

Si entra V2 mientras se enviaba feedback a V1:

- NO limpiar draft;
- `router.refresh()`;
- toast:

Título:

`Hay una versión más nueva`

Descripción:

`Tu texto sigue acá. Revisá la versión actual antes de enviarlo.`

El draft queda asociado a V1 durante esa sesión.

No mover automáticamente el feedback a V2.

## 26. Tests de concurrencia

Agregar tests de reglas/integración donde sea viable.

Casos obligatorios:

A. V1 latest, review V1 adquiere lock primero → review success → luego V2.

B. V2 finaliza primero → review V1 después → 409.

C. V2 finaliza primero → feedback V1 después → 409.

D. dos finalize para V2 → uno success → otro conflict/idempotent según receipt correspondiente → nunca dos V2.

E. review sobre V2 funciona normalmente.

## 27. Tests optimistic merge

```text
persisted [V2, V1]
optimistic [V2]
→ [V2, V1]
```

Persisted debe ganar.

## 28. Tests retry state

Cubrir, idealmente mediante helper/reducer simple:

- PUT fail → attempt descartado;
- finalize 500 → attempt conservado uploaded;
- network finalize → attempt conservado;
- finalize 409 → attempt descartado;
- finalize success → attempt limpiado.

No instalar state-machine library.

## 29. Drive

No cambiar arquitectura Drive.

Mutations exitosas siguen usando `enqueueDriveBackupRefresh`.

Mutation rechazada por versión histórica:

NO enqueue.

## 30. Visual Review

Mantener Visual Review sin DB/R2/Drive real.

No hace falta simular carreras.

Sí aplicar dedupe/reconciliación porque el componente es compartido.

## 31. Mobile

Confirmar:

- subir V2;
- success;
- no aparece duplicada;
- cerrar/abrir modal;
- V2 sigue current;
- V1 histórica read-only;
- retry finalize no rompe sticky review actions.

## 32. Validación

Ejecutar:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx prisma validate
```

## 33. Resultado esperado

Reportar:

1. estrategia de locking;
2. review race;
3. feedback race;
4. finalize race;
5. DeliveryStatus dentro del lock;
6. dedupe optimistic/persisted;
7. retry finalize;
8. cleanup rules;
9. error handling 409;
10. draft preservation;
11. Visual Review;
12. tests;
13. lint;
14. typecheck;
15. build;
16. prisma validate;
17. git status.

Si queda correcto:

```text
commit: fix: harden versioned piece mutations
push: main
```

Después detenerse.

NO avanzar con attachments, conversation ni AI.
