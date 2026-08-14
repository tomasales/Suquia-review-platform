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

# Tarea actual — Hardening de retry/idempotencia de referencias de feedback

La implementación de referencias visuales quedó funcional, pero la revisión posterior detectó dos problemas de consistencia que hay que corregir antes de avanzar a ConversationReply u otras features.

Commit base relevante:

`61275166 · feat: add feedback reference attachments`

## Problemas detectados

### A. El finalize no es idempotente frente a cambios posteriores

Hoy `addPieceFeedbackInTransaction()` valida primero:

- Delivery abierta;
- `pieceVersionId` sigue siendo latest;

y recién después busca si `feedbackId` ya existe.

Eso rompe este escenario:

```text
1. finalize sobre V1 hace commit correctamente
2. la respuesta al browser se pierde
3. aparece V2 o se cierra la Delivery
4. browser reintenta el MISMO finalize
5. backend responde HISTORICAL_VERSION / DELIVERY_CLOSED
```

Pero ese Feedback YA fue creado correctamente en el primer intento.

El retry debe devolver success idempotente, no reinterpretar una operación ya confirmada como una nueva mutation.

Además el endpoint hace HEAD de R2 antes de comprobar si el Feedback ya existe. Un retry de una operación ya commiteada no debería depender de volver a verificar R2 para reconocer el success previo.

### B. El composer puede mutar un attempt ya subido

Después de un error recuperable de finalize:

- `attemptToken` queda preservado;
- los objetos ya están en R2;
- `phase = finalize-error`;

pero actualmente:

- el CTA vuelve a mostrar `Enviar feedback` en lugar de `Reintentar` porque `isFeedbackSubmitting` ya es false;
- el usuario puede agregar referencias nuevas;
- puede quitar referencias;
- puede editar el texto.

Eso es inconsistente porque el receipt ya firmó un set específico de attachments.

Ejemplo peligroso:

```text
prepare A+B
→ upload A+B
→ finalize 500
→ usuario agrega C
→ click submit
→ retry usa receipt A+B
→ C nunca se sube
```

No puede ocurrir.

---

## No hacer

- NO implementar ConversationReply.
- NO implementar feedback general de Delivery.
- NO implementar AI Memory/jobs.
- NO implementar Direction.
- NO cambiar Prisma schema.
- NO rediseñar el modal.
- NO cambiar arquitectura Drive.
- NO cambiar límites/MIME de referencias.
- NO cambiar reglas de review/status.

## Releer especialmente

- `docs/04-feedback.md`
- `docs/09-errors-and-recovery.md`
- `docs/16-drive-sync-architecture.md`
- `src/lib/piece-review-actions.ts`
- `src/app/api/pieces/[pieceId]/feedback/attachments/finalize/route.ts`
- `src/app/api/pieces/[pieceId]/feedback/attachments/cleanup-upload/route.ts`
- `src/components/deliveries/piece-review-experience.tsx`
- `src/components/deliveries/piece-review-panel.tsx`
- `src/components/deliveries/piece-version-client-state.ts`
- tests actuales de feedback attachments

---

# Parte 1 — Idempotencia server correcta

## 1. Regla definitiva

Si un receipt válido se reintenta y `receipt.feedbackId` YA existe en PostgreSQL, el servidor debe tratarlo como una operación potencialmente ya finalizada.

Si el Feedback existente coincide con el receipt y request esperado:

- mismo `feedbackId`;
- mismo `deliveryId`;
- mismo `pieceId`;
- mismo `pieceVersionId`;
- mismo `authorUserId`;
- mismo `sourceType` derivado del user;
- mismo body normalizado;
- mismos attachment IDs;
- misma metadata estructural de attachments (`storageKey`, MIME, size, filename, uploader);

responder SUCCESS idempotente.

No crear:

- segundo Feedback;
- nuevos FeedbackAttachment;
- Journal nuevo;
- SyncOperation/Drive enqueue nuevo;
- cambio nuevo de Delivery.status.

## 2. Idempotencia gana sobre estado mutable posterior

Si el Feedback ya existe y coincide:

el retry debe devolver success aunque DESPUÉS del primer commit:

- haya aparecido V2;
- la versión original ahora sea histórica;
- la Delivery haya pasado a CLOSED.

No estamos autorizando una mutation histórica nueva.

Estamos reconociendo que la mutation YA ocurrió.

## 3. No saltarse validaciones para creación nueva

Si `feedbackId` NO existe:

mantener exactamente las validaciones actuales:

```text
Delivery lock
→ Piece lock
→ Piece/Delivery canónicas
→ deletedAt
→ CLOSED
→ latest PieceVersion
→ crear Feedback + attachments
→ Journal
→ status
→ Drive enqueue
```

Una operación nueva sigue sin poder guardar en una versión histórica ni en Delivery cerrada.

## 4. Orden dentro de transaction

Refactorizar `addPieceFeedbackInTransaction()` para separar claramente:

A. reconocimiento idempotente de Feedback YA existente;

B. validaciones para crear un Feedback NUEVO.

Después de adquirir locks y confirmar relaciones suficientes, si `feedbackId` existe:

- validar que coincide con el receipt/request;
- devolver existing success ANTES de `assertDeliveryCanBeReviewed()` y ANTES de exigir que esa versión siga siendo latest.

Para comparar el existing usar el `pieceVersionId` del receipt/request, NO `latestVersion.id`.

## 5. Comparar body

Extender `assertExistingFeedbackMatchesReceipt()` o helper equivalente para comparar también el body normalizado.

Motivo:

un retry idempotente debe representar exactamente la misma operación lógica.

Si existe el mismo feedbackId pero el body no coincide:

- NO sobrescribir Feedback;
- NO devolver success silencioso;
- responder conflicto 409.

Puede usarse un código estable nuevo si mejora claridad, por ejemplo:

`FEEDBACK_ATTEMPT_CONFLICT`

pero no es obligatorio si no aporta UX específica.

## 6. Fast-path antes de R2 HEAD

En:

`POST /api/pieces/[pieceId]/feedback/attachments/finalize`

hoy se verifican todos los R2 objects antes de saber si el Feedback ya fue finalizado.

Agregar un fast-path DB seguro:

```text
verify receipt + user + pieceId URL
→ buscar si receipt.feedbackId ya existe
→ si existe, validar coincidencia completa
→ success idempotente
→ NO HEAD R2
```

Si NO existe:

seguir flujo actual:

```text
HEAD attachments R2
→ DB transaction
→ locks
→ revalidación
→ create
```

No duplicar lógica de matching en route y action si puede extraerse un helper server-only reutilizable.

## 7. Carrera entre dos finalize simultáneos

Mantener defensa dentro de transaction aunque exista fast-path fuera.

Dos requests con el mismo receipt pueden hacer ambos preflight `not found`.

Luego:

- uno crea;
- el otro debe reconocer existing/idempotent dentro de la transaction o resolver la unique race sin crear duplicados.

No confiar solo en el preflight.

## 8. R2 temporalmente caído después del commit

Caso esperado:

```text
finalize #1 → DB commit OK
respuesta se pierde
R2/HEAD temporalmente falla
finalize #2 mismo receipt
```

Como DB ya confirma el Feedback y attachments:

finalize #2 debe poder devolver success idempotente sin requerir HEAD de nuevo.

Los signed read URLs pueden quedar `null` si su generación falla; eso no convierte el commit previo en failure.

## 9. Cleanup

Mantener regla actual:

si el Feedback ya existe, cleanup NO borra sus R2 objects.

Verificar que el fast-path nuevo no introduzca una llamada accidental a cleanup.

---

# Parte 2 — Composer consistente durante finalize retry

## 10. Estado de attempt recuperable

Cuando ocurre network/5xx en finalize después de upload:

mantener:

- draft;
- referencias seleccionadas;
- object URLs;
- attemptToken;
- attachmentUploads;
- uploaded = true;
- phase = `finalize-error`.

La próxima acción principal debe ejecutar SOLAMENTE finalize con el mismo receipt.

## 11. CTA correcto

Actualmente `feedbackSubmitLabel` solo muestra `Reintentar` si `isFeedbackSubmitting` es true, pero después del catch vuelve a false.

Corregir.

Si:

`feedbackAttachmentUpload.phase === "finalize-error"`

y existe attempt uploaded,

el CTA principal debe mostrar:

`Reintentar`

incluso cuando no hay request en curso.

Al click:

- NO prepare nuevo;
- NO PUT nuevo;
- solo finalize.

## 12. Congelar el contenido firmado

Mientras existe un attempt uploaded pendiente de finalize/retry:

```text
uploaded = true
AND phase = finalizing | finalize-error
```

NO permitir modificar silenciosamente la operación.

Deshabilitar temporalmente:

- textarea;
- picker `Adjuntar referencia`;
- quitar referencias;
- agregar nuevas referencias.

Motivo:

el receipt ya representa ese body + set de archivos que intentamos confirmar.

No permitir que UI muestre C seleccionada cuando el receipt solo contiene A+B.

## 13. Opción para volver a editar

Agregar una acción secundaria discreta SOLO en `finalize-error`:

`Editar feedback`

o copy equivalente simple.

Al usarla:

1. llamar best-effort al endpoint seguro `cleanup-upload` con el attemptToken;
2. resetear SOLO el estado técnico del attempt;
3. conservar draft local;
4. conservar Files/referencias locales y previews;
5. volver a habilitar textarea/agregar/quitar referencias.

Luego el próximo `Enviar feedback` debe hacer un PREPARE nuevo y PUT nuevo.

No limpiar lo que escribió el usuario.

Si cleanup falla, no bloquear la edición local; es best-effort y el orphan queda dentro del problema técnico ya documentado.

## 14. Response-loss + body

Durante el request de finalize el textarea ya está disabled.

Después de un error recuperable debe seguir congelado hasta:

- retry success;
- o `Editar feedback` / cancelar attempt.

Así el retry usa el mismo body que el intento original y la comparación idempotente puede ser estricta.

## 15. Errors no recuperables

Para:

- `HISTORICAL_VERSION`;
- `DELIVERY_CLOSED`;
- 400 de validación/HEAD;

donde server descarta/limpia el attempt:

- reset técnico del attempt;
- conservar draft + Files locales;
- no congelar composer por ese receipt viejo;
- aplicar refresh/toast existente.

Si la versión pasa a histórica, la UI quedará read-only por la regla normal después del refresh.

---

# Parte 3 — Tests

## 16. Tests server obligatorios

Agregar cobertura realista para:

A.
finalize success sobre V1
→ crear V2
→ retry mismo receipt
→ success idempotente
→ NO segundo Feedback.

B.
finalize success
→ Delivery CLOSED
→ retry mismo receipt
→ success idempotente.

C.
existing feedback mismo receipt pero body distinto
→ 409 conflict
→ no mutation.

D.
dos finalize simultáneos mismo receipt
→ un solo Feedback + attachments.

E.
existing finalized feedback
→ fast-path no necesita HEAD R2.

Si no hay harness DB que permita demostrar alguna carrera sin construir infraestructura desproporcionada:

- no fingirlo con un mock;
- extraer reglas testeables donde sirva;
- documentar manual test PostgreSQL para el caso concurrente.

## 17. Tests client state/UI helpers

Cubrir al menos:

- `finalize-error + uploaded` → label `Reintentar`;
- finalize-error bloquea edición de draft y referencias;
- acción `Editar feedback` resetea attempt pero preserva draft/files;
- retry usa mismo attemptToken y no vuelve a prepare/PUT;
- error HISTORICAL_VERSION descarta attempt y conserva contenido local.

No instalar state-machine library.

---

# Parte 4 — Validación general

## 18. No regresiones

Confirmar:

- text-only feedback sigue funcionando;
- feedback con 1..10 referencias sigue funcionando;
- historical refs siguen visibles;
- Drive backup no cambia salvo por datos ya existentes;
- Visual Review sigue sin APIs reales;
- version upload V2 no cambia;
- locks siguen `Delivery → Piece`.

## 19. Docs

Actualizar solo si hace falta reflejar esta semántica:

- `docs/04-feedback.md`
- `docs/09-errors-and-recovery.md`

Documentar brevemente:

- retry de finalize es idempotente incluso si el estado de Delivery/version cambió después del commit;
- un attempt ya subido queda congelado hasta retry o edición/cancelación explícita.

## 20. Validación técnica

Ejecutar:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx prisma validate
```

Si `prisma validate` no puede correr por falta real de `DATABASE_URL`, reportarlo; no inventar una URL.

Revisar que no haya schema/migration accidental.

## 21. Resultado esperado

Reportar:

1. fast-path idempotente;
2. orden de validaciones dentro de transaction;
3. retry después de V2;
4. retry después de CLOSED;
5. body matching;
6. no HEAD en retry ya finalizado;
7. CTA Reintentar;
8. composer congelado;
9. Editar feedback / cleanup best-effort;
10. preservación de draft/files;
11. tests;
12. lint;
13. typecheck;
14. build;
15. prisma validate;
16. git status.

Si todo queda correcto:

```text
commit: fix: harden feedback attachment retries
push: main
```

Después detenerse.

NO avanzar a ConversationReply ni otras features.