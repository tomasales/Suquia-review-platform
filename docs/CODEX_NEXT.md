# CODEX_NEXT

## Tarea actual — Guidelines MVP: Manual de marca

El Live Pilot ya funciona con login, PostgreSQL, R2, entregas, feedback, referencias y versionado. El siguiente bloque agrega la primera versión funcional de **Guidelines**, deliberadamente acotada a un único caso real: subir y consultar el **Manual de marca de SUQUIA en PDF**.

No convertir esto todavía en una biblioteca genérica de múltiples categorías/documentos. No implementar AI Memory en este bloque.

## Objetivo de producto

Agregar una sección `Guidelines` visible en la navegación donde cualquier usuario autenticado pueda consultar el manual de marca vigente y, por ahora, subirlo o reemplazarlo.

Guidelines sigue siendo una fuente oficial/manual. La IA no crea, interpreta ni modifica este contenido.

## Alcance funcional

### Navegación

- Agregar `Guidelines` al sidebar principal, junto a Dashboard y Entregas.
- Ruta real: `/guidelines`.
- No usar el nombre `Guidelines / Knowledge`.

### Estado vacío

Si todavía no hay manual activo:

- título de página: `Guidelines`;
- bloque principal: `Manual de marca`;
- explicar brevemente que acá vive la referencia oficial de identidad de SUQUIA;
- CTA principal: `Subir manual`.

Mantener copy simple y concreto. No mencionar IA en esta pantalla.

### Subida

Por ahora admitir solamente **PDF**.

- No pedir categoría, tags ni metadata adicional.
- El título funcional es fijo: `Manual de marca`.
- Conservar filename original, uploader, fecha, mime type, tamaño y `storageKey` usando el modelo `Guideline` existente.
- Usar `type` con un valor estable para este caso, por ejemplo `BRAND_MANUAL`.
- No cambiar Prisma schema salvo que sea estrictamente inevitable; preferir el modelo actual.
- Validar MIME/extensión PDF en cliente y servidor.
- Usar R2 privado como storage operativo, siguiendo el patrón seguro ya usado por Delivery/Feedback: prepare → browser PUT firmado → finalize/HEAD verification.
- No subir el PDF a través de memoria/disco efímero de Render.
- Mantener errores recuperables y claros; si falla finalize, no perder innecesariamente la selección del archivo.

### Manual vigente

Cuando existe un manual activo, mostrar un único bloque/card con:

- `Manual de marca`;
- nombre del archivo;
- fecha de actualización;
- quién lo subió;
- tamaño si aporta claridad;
- CTA `Abrir manual`;
- acción secundaria `Reemplazar`.

`Abrir manual` debe generar una signed read URL desde R2 y abrir el PDF de forma segura (nueva pestaña está bien para este MVP). No hacer público el bucket.

### Reemplazo

Al reemplazar:

- subir primero el nuevo PDF;
- solo cuando finalize correctamente, convertirlo en el manual activo;
- conservar el registro anterior como `active = false` en vez de borrarlo físicamente o sobreescribirlo destructivamente;
- la UI solo muestra el manual activo;
- no hace falta UI de historial todavía.

La operación debe ser transaccional a nivel DB para que nunca queden dos manuales activos de tipo `BRAND_MANUAL` por un reemplazo normal. Si hace falta serializar/lockear la operación, hacerlo de forma simple.

### Permisos

No introducir roles nuevos en este bloque. Mantener el modelo actual de permisos iguales entre usuarios autenticados/allowlisted.

## UX/UI

Mantener el sistema visual actual:

- PageHeader consistente;
- Surface/card con borde fino;
- jerarquía clara;
- sin dashboard dentro de Guidelines;
- sin categorías vacías para Stories/Feed;
- sin placeholder de Knowledge/AI;
- sin drag-and-drop complejo si un file picker simple resuelve mejor.

El foco es que un diseñador entre y pueda abrir el manual con un click.

## Fuera de alcance

No implementar todavía:

- múltiples tipos de Guidelines;
- Guidelines de Stories o Feed;
- editor de contenido;
- búsqueda dentro del PDF;
- previews por página;
- comentarios sobre Guidelines;
- IA sobre Guidelines;
- generación/modificación automática;
- AI Memory;
- permisos por rol;
- Drive backup específico para Guidelines salvo que ya exista una abstracción segura reutilizable y no agregue complejidad.

## Criterio de aceptación live

Con `https://suquia-review.onrender.com` y R2 real:

1. aparece `Guidelines` en navegación;
2. `/guidelines` abre correctamente;
3. sin manual muestra estado vacío y `Subir manual`;
4. subir un PDF crea el Guideline y persiste tras refresh/logout/login;
5. `Abrir manual` abre el PDF real desde R2 mediante acceso firmado;
6. `Reemplazar` permite subir otro PDF;
7. después del reemplazo se muestra solo el nuevo como vigente;
8. el registro anterior queda inactivo en DB;
9. un archivo no-PDF se rechaza con mensaje claro;
10. Entregas, feedback, R2 y auth existentes siguen funcionando.

## Validaciones

Ejecutar:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

No inventar credenciales ni tocar secretos de Render/Cloudflare.

## Commit

Si todo queda correcto:

`feat: add brand manual guidelines`

Push a `main` y detenerse.
