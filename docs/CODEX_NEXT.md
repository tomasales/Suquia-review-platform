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

# Tarea actual — Hardening de Delivery status y errores concurrentes

El hardening anterior de `PieceVersion` resolvió correctamente la carrera entre review/feedback y una nueva versión usando row lock sobre `Piece`.

Antes de agregar nuevas funcionalidades quiero cerrar dos problemas restantes:

1. carrera de `Delivery.status` entre mutaciones simultáneas de PIEZAS DISTINTAS pertenecientes a la misma Delivery;
2. errores `409` ambiguos en frontend, que hoy se interpretan siempre como “Hay una versión más nueva”.

## No hacer

- NO agregar features de producto.
- NO implementar attachments.
- NO implementar conversation.
- NO implementar AI.
- NO cambiar el diseño general.
- NO cambiar reglas funcionales de review.
- NO modificar Prisma schema salvo bloqueo real demostrado.
- NO cambiar arquitectura Drive.

## Revisar especialmente

- `src/lib/piece-mutation-lock.ts`
- `src/lib/piece-review-actions.ts`
- `src/lib/piece-review-rules.ts`
- `src/app/api/pieces/[pieceId]/review-state/route.ts`
- `src/app/api/pieces/[pieceId]/feedback/route.ts`
- `src/app/api/pieces/[pieceId]/versions/finalize/route.ts`
- `src/components/deliveries/piece-review-experience.tsx`
- tests existentes de review/version upload

También releer docs relacionados con estados, Journal y concurrencia.

---

## 1. Problema de concurrencia de Delivery.status

Hoy existe lock por `Piece`.

Eso serializa correctamente mutations de una misma Piece, pero NO mutations simultáneas sobre Piece A y Piece B de la misma Delivery.

Ejemplo peligroso:

```text
Delivery = SENT_FOR_REVIEW

Request A sobre Piece 1:
NEEDS_CHANGES
→ debería dejar Delivery CHANGES_REQUESTED

Request B sobre Piece 2:
OK
→ podría calcular IN_REVIEW
```

Si ambos leen el mismo estado inicial y escriben la fila Delivery sin serialización, el último commit podría ganar y dejar:

`IN_REVIEW`

aunque ya hubo una Piece marcada `NEEDS_CHANGES`.

Esto no es aceptable.

---

## 2. Lock de Delivery

Crear helper server-only, por ejemplo:

```ts
lockDeliveryForMutation(tx, deliveryId)
```

usando PostgreSQL row lock:

```sql
SELECT id
FROM "Delivery"
WHERE id = ...
FOR UPDATE
```

Usar `$queryRaw` parametrizado.

NO concatenar IDs en SQL.

Puede vivir en:

`src/lib/delivery-mutation-lock.ts`

o junto al helper existente si queda más limpio.

---

## 3. Orden de locks

MUY IMPORTANTE para evitar deadlocks.

Toda mutation que pueda tocar Piece + Delivery debe adquirir locks en el MISMO orden.

Usar esta convención:

```text
transaction
→ lock Delivery
→ lock Piece
→ leer estado canónico
→ validar
→ mutation
→ Journal
→ Drive enqueue
→ commit
```

No alternar Piece→Delivery en un flujo y Delivery→Piece en otro.

Actualizar todos los flujos relevantes para respetar el mismo orden.

---

## 4. updatePieceReviewState

Dentro de la misma transaction:

1. obtener/confirmar `deliveryId` necesario para lockear sin confiar en input del browser;
2. lock Delivery;
3. lock Piece;
4. releer Piece + Delivery + latest PieceVersion DESPUÉS de los locks;
5. validar `deletedAt` / CLOSED / latest version;
6. calcular siguiente estado con Delivery.status canónico;
7. actualizar PieceVersion.reviewState;
8. actualizar Delivery.status si corresponde;
9. Journal;
10. enqueue Drive.

No usar para el cálculo un `Delivery.status` leído antes del lock.

---

## 5. addPieceFeedback

Misma estrategia:

```text
transaction
→ lock Delivery
→ lock Piece
→ releer estado
→ validar latest PieceVersion
→ feedback
→ status
→ Journal
→ Drive enqueue
```

Si dos Pieces distintas reciben feedback/review al mismo tiempo, la segunda mutation debe ver el Delivery.status resultante de la primera.

---

## 6. finalize nueva PieceVersion

También modifica Delivery.status → `SENT_FOR_REVIEW`.

Debe usar el MISMO orden de locks:

```text
transaction
→ lock Delivery
→ lock Piece
→ releer Delivery + latest PieceVersion
→ validar receipt contra latest
→ crear PieceVersion
→ actualizar Delivery.status
→ Journal
→ Drive enqueue
```

Lo externo sigue fuera de transaction:

- receipt verification;
- user verification;
- storageKey validation;
- R2 HEAD.

---

## 7. Cómo obtener deliveryId antes del lock

No confiar en `deliveryId` enviado por browser.

Para review/feedback, se puede hacer una lectura mínima de Piece para obtener `deliveryId`, y luego dentro de transaction:

1. lock Delivery por ese id;
2. lock Piece;
3. releer Piece y confirmar que sigue perteneciendo a esa Delivery.

La lectura inicial sirve SOLO para localizar el lock.

La validación canónica sucede después de lockear.

Para finalize PieceVersion, `deliveryId` viene firmado en receipt, pero igualmente releer y validar pertenencia dentro de transaction.

---

## 8. Regla de negocio existente

NO cambiar estas reglas:

- `SENT_FOR_REVIEW + OK` → `IN_REVIEW`.
- `SENT_FOR_REVIEW + NEEDS_CHANGES` → `CHANGES_REQUESTED`.
- `IN_REVIEW + NEEDS_CHANGES` → `CHANGES_REQUESTED`.
- `CHANGES_REQUESTED + OK` → sigue `CHANGES_REQUESTED`.
- todas las Pieces OK NO aprueban automáticamente la Delivery.
- nueva PieceVersion → `SENT_FOR_REVIEW` si Delivery está abierta.
- CLOSED sigue read-only.

El objetivo es hacer estas reglas consistentes bajo concurrencia, no rediseñarlas.

---

## 9. Caso crítico esperado

Estado inicial:

`Delivery = SENT_FOR_REVIEW`

Dos requests simultáneos en Pieces distintas:

A:
`Piece 1 → NEEDS_CHANGES`

B:
`Piece 2 → OK`

Si A obtiene Delivery lock primero:

```text
A → CHANGES_REQUESTED
B espera
B relee CHANGES_REQUESTED
B marca Piece 2 OK
B mantiene CHANGES_REQUESTED
```

Resultado final obligatorio:

`CHANGES_REQUESTED`

Nunca `IN_REVIEW`.

---

## 10. Otra carrera: nueva versión vs review de otra Piece

Ejemplo:

Delivery = CHANGES_REQUESTED

A:
subir V2 en Piece 1
→ quiere SENT_FOR_REVIEW

B:
review Piece 2

Ambos deben serializar modificación de Delivery.status usando el mismo Delivery lock.

El segundo request debe calcular sobre el estado dejado por el primero.

No definir reglas nuevas: aplicar las existentes con estado canónico actualizado.

---

# Parte 2 — Errores API estructurados

## 11. Problema actual

Frontend trata cualquier HTTP 409 de review/feedback como:

`Hay una versión más nueva`.

Pero 409 también puede significar:

- `DELIVERY_CLOSED`;
- `HISTORICAL_VERSION`;
- potencialmente otros conflictos futuros.

No inferir semántica únicamente desde status HTTP.

---

## 12. Error codes

Agregar códigos públicos estructurados para las mutations de review/feedback/version cuando corresponda.

Ejemplos mínimos:

```text
HISTORICAL_VERSION
DELIVERY_CLOSED
PIECE_NOT_FOUND
INVALID_REVIEW_STATE
VERSION_CONFLICT
```

No hace falta crear una taxonomía gigante.

Solo tipar los casos que la UI necesita distinguir.

---

## 13. Response API

Formato consistente para error:

```json
{
  "error": "Esta versión ya forma parte del historial.",
  "code": "HISTORICAL_VERSION"
}
```

Mantener status HTTP apropiado.

El `message` sigue siendo copy público.

`code` es estable para lógica cliente.

No exponer stack ni detalles internos.

---

## 14. PieceReviewValidationError

Extender el error para soportar `code`.

Ejemplo conceptual:

```ts
new PieceReviewValidationError(
  "Esta versión ya forma parte del historial.",
  409,
  "HISTORICAL_VERSION",
)
```

Elegir firma limpia.

Actualizar `pieceReviewApiError()` para devolver:

- message;
- status;
- code.

---

## 15. CLOSED

Cuando Delivery está cerrada:

```text
status: 409
code: DELIVERY_CLOSED
message: La entrega está cerrada.
```

Frontend NO debe mostrar:

`Hay una versión más nueva`.

Mostrar toast coherente:

Título:
`La entrega está cerrada`

Descripción opcional:
`Ya no se pueden guardar cambios en esta entrega.`

Y hacer `router.refresh()` para reconciliar UI si el estado local estaba viejo.

---

## 16. Historical version

Review o feedback a versión que dejó de ser latest:

```text
status: 409
code: HISTORICAL_VERSION
```

Mantener UX ya definida:

Review:

Título:
`Hay una versión más nueva`

Descripción:
`Revisá la versión actual.`

Feedback:

Título:
`Hay una versión más nueva`

Descripción:
`Tu texto sigue acá. Revisá la versión actual antes de enviarlo.`

No limpiar draft.

---

## 17. Version upload conflict

En finalize de PieceVersion, el conflicto de latest version debe devolver código estable:

```text
VERSION_CONFLICT
```

con status 409 y mensaje actual:

`La pieza ya tiene una versión más nueva.`

Frontend usa CODE, no solamente status 409, para decidir que debe descartar attempt y preparar uno nuevo.

No confundirlo con DELIVERY_CLOSED.

---

## 18. ApiRequestError cliente

Actualizar helper cliente para guardar:

- status;
- code;
- message si sirve.

Leer JSON de error cuando response no sea ok.

No usar solamente:

```ts
new ApiRequestError(response.status)
```

Crear helper reutilizable si mejora claridad:

```ts
readApiError(response)
```

No instalar librerías.

---

## 19. Review frontend

En failure:

`HISTORICAL_VERSION`
→ rollback optimistic
→ refresh
→ toast versión más nueva.

`DELIVERY_CLOSED`
→ rollback optimistic
→ refresh
→ toast entrega cerrada.

Otros errores
→ rollback
→ toast genérico actual.

---

## 20. Feedback frontend

`HISTORICAL_VERSION`
→ preservar draft
→ refresh
→ toast versión más nueva.

`DELIVERY_CLOSED`
→ preservar draft
→ refresh
→ toast entrega cerrada.

Otros
→ preservar draft
→ toast genérico actual.

---

## 21. Version finalize frontend

Clasificar especialmente:

`VERSION_CONFLICT`
→ descartar attempt;
→ mantener File;
→ próximo retry empieza desde prepare.

`DELIVERY_CLOSED`
→ descartar attempt si server limpia el asset;
→ mantener File si aporta valor;
→ refresh;
→ mostrar entrega cerrada.

5xx/network
→ mantener attempt uploaded para retry finalize.

No perder la lógica correcta implementada en el hardening anterior.

---

## 22. Compatibilidad

No romper endpoints existentes para casos success.

Success responses quedan como están.

Solo mejorar error payload.

---

## 23. Tests unitarios de error codes

Agregar tests para:

- CLOSED → DELIVERY_CLOSED;
- historical version → HISTORICAL_VERSION;
- version conflict → VERSION_CONFLICT;
- frontend resolution distingue dos 409 distintos;
- 500 sigue tratamiento genérico/retry según flujo.

---

## 24. Test de concurrencia real

El bug de Delivery.status es de base de datos, no solo de funciones puras.

Si la infraestructura de tests actual permite usar PostgreSQL de test sin convertir este bloque en un proyecto grande, agregar al menos UN integration test real que ejecute dos transactions concurrentes sobre dos Pieces de la misma Delivery y confirme que el Delivery lock serializa correctamente.

Caso prioritario:

```text
SENT_FOR_REVIEW
Piece A → NEEDS_CHANGES
Piece B → OK
final = CHANGES_REQUESTED
```

Si el repo no tiene DB integration-test harness y construirlo sería desproporcionado:

- NO inventar un mock que pretenda demostrar row locking;
- documentar explícitamente el blocker;
- sí agregar tests unitarios de helpers/error handling;
- describir un manual test reproducible con PostgreSQL real.

---

## 25. Journal

No agregar eventos nuevos por locking o error codes.

Mantener Journal existente.

Solo las mutations exitosas crean eventos.

Request rechazado:

NO Journal.

---

## 26. Drive

Sin cambios de arquitectura.

Mutation exitosa:

`enqueueDriveBackupRefresh()` como actualmente.

Mutation rechazada:

NO enqueue.

---

## 27. Visual Review

Debe seguir funcionando sin DB/R2/Drive/OAuth reales.

No requiere simular row locks.

Error code helpers cliente pueden ser compartidos si no introducen llamadas reales.

---

## 28. Validación técnica

Ejecutar:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx prisma validate
```

Revisar también que no haya cambios accidentales de schema/migration.

---

## 29. Resultado esperado

Reportar:

1. estrategia de Delivery lock;
2. orden de locks Delivery→Piece;
3. review concurrente entre Pieces;
4. feedback concurrente;
5. finalize version concurrente;
6. error codes server;
7. error parsing cliente;
8. HISTORICAL_VERSION UX;
9. DELIVERY_CLOSED UX;
10. VERSION_CONFLICT UX;
11. tests unitarios;
12. integration test real o blocker explícito;
13. lint;
14. typecheck;
15. build;
16. prisma validate;
17. git status.

Si todo queda correcto:

```text
commit: fix: serialize delivery review mutations
push: main
```

Después detenerse.

NO avanzar con attachments, conversation ni AI.
