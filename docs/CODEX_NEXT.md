# CODEX_NEXT

Este archivo contiene la única tarea operativa que Codex debe ejecutar después de que `docs/CODEX_RUN.md` haya sincronizado `main`.

## Protocolo

1. Leer este archivo completo después del pull.
2. Releer los docs/código relevantes antes de tocar comportamiento.
3. Implementar únicamente este milestone.
4. No inventar nuevas decisiones de producto fuera del scope.
5. Mantener intacto el modo real de PostgreSQL/R2/Drive salvo que un ajuste visual compartido lo requiera.
6. Ejecutar validaciones al final.
7. Si hay un blocker real, documentarlo y detenerse; no abrir una arquitectura paralela.
8. Si queda correcto, commit + push a `main` y detenerse.

---

# Tarea actual — Batch UX de validación + continuidad de Visual Review

Venimos probando manualmente el MVP en `SUQUIA_VISUAL_REVIEW=1`. Esta tarea agrupa los hallazgos de esa validación para evitar varias rondas pequeñas de Codex.

Objetivo principal: mejorar jerarquía/espacio en revisión y permitir probar el recorrido `Nueva entrega → Entregar → detalle → feedback/versionado` con los archivos que el usuario acaba de cargar, sin configurar PostgreSQL/R2/Google.

## No hacer

- NO implementar ConversationReply.
- NO implementar AI Memory/jobs.
- NO implementar feedback general de Delivery.
- NO cambiar Prisma schema.
- NO cambiar reglas canónicas de PieceVersion/review/status.
- NO rediseñar Dashboard/Guidelines/Journal.
- NO convertir Visual Review en persistencia real.
- NO tocar arquitectura de R2/Drive salvo para no romper imports/compartidos existentes.

## Releer especialmente

- `README.md`
- `docs/02-deliveries.md`
- `docs/03-pieces-and-versions.md`
- `docs/04-feedback.md`
- `docs/21-visual-review-mode.md` si existe
- `src/components/deliveries/delivery-upload-flow.tsx`
- `src/components/deliveries/piece-grid.tsx`
- `src/components/deliveries/piece-card.tsx`
- `src/components/deliveries/piece-review-modal.tsx`
- `src/components/deliveries/piece-review-panel.tsx`
- fixtures/helpers de Visual Review actuales

---

## 1. Estado de Delivery con más jerarquía

En el detalle de una entrega, el badge de estado global (`Enviado para revisar`, `En revisión`, etc.) queda demasiado chico y perdido arriba a la derecha.

Ajustar jerarquía visual para que el estado sea parte clara del header principal:

- badge más legible y con mayor padding/tamaño;
- sin volverlo un CTA;
- mantener sistema visual sobrio existente.

Aplicar el mismo criterio al estado de la Piece dentro del header del modal de revisión: `Sin revisar`, `OK`, `Necesita cambios` no debe leerse como metadata diminuta.

No cambiar los estados ni sus reglas.

---

## 2. Grid de piezas: máximo 5 columnas en desktop

La grilla actual llega a mostrar demasiadas piezas en una fila.

Regla UX:

- desktop ancho: máximo 5 columnas;
- si hay más piezas, hacer wrap;
- breakpoints inferiores deben reducir columnas de forma razonable;
- NO scroll horizontal como comportamiento principal.

Ejemplo con 12 piezas en desktop: `5 / 5 / 2`.

Conservar orden y click para abrir review.

---

## 3. Nueva entrega: Resumen debe comunicar qué falta

El panel `Resumen` es demasiado pasivo. Debe responder claramente: **¿qué me falta para poder entregar?**

Usar estados de copy claros:

- sin tipo + sin piezas: `Falta completar la entrega` + `Elegí un tipo y agregá al menos una pieza.`
- piezas pero sin tipo: `Falta elegir el tipo` + `Elegí Stories o Feed para continuar.`
- tipo pero sin piezas: `Faltan piezas` + `Agregá al menos una pieza.`
- listo: mantener resumen `Stories · N piezas` / `Feed · N piezas` y comunicar que está lista para entregar sin ruido técnico.

El botón `Entregar` sigue siendo el gate fuerte.

### Eliminar copy técnico del modo demo

No mostrar dentro del Resumen:

`Vista previa: la entrega todavía no se guardó.`

Ese texto describe una limitación técnica de Visual Review y confunde el flujo de producto.

Si hace falta indicar que estamos en demo, hacerlo de manera global/discreta y solo development, no como estado de la entrega.

---

## 4. Reordenamiento: sacar las flechas visibles redundantes

Las cards de Nueva entrega hoy tienen flechas arriba/abajo además de `Arrastrar`.

Problemas:

- visualmente las piezas están en horizontal;
- ↑/↓ no comunica bien `antes/después`;
- duplica la interacción de drag & drop.

Eliminar esas flechas de la UI principal.

Conservar:

- drag & drop con `Arrastrar` como mecanismo principal;
- orden accesible/teclado solo si ya existe una solución clara, pero no agregues un menú complejo para este milestone.

No cambiar la semántica del orden.

---

## 5. Visual Review: Entregar debe abrir la entrega que acabo de armar

Este es el punto funcional más importante del batch.

Hoy, en `SUQUIA_VISUAL_REVIEW=1`, `Entregar` ignora la composición recién armada y redirige a una fixture fija (`visual-stories-sent` / `visual-feed-review`). Eso impide validar el flujo real.

### Comportamiento esperado en Visual Review

Al crear una entrega con archivos locales y apretar `Entregar`:

- abrir el detalle de UNA entrega simulada basada en esa composición;
- mostrar exactamente los archivos/previews seleccionados;
- preservar su orden;
- preservar Stories/Feed;
- preservar nota general;
- preservar notas por pieza;
- cada Piece comienza en V1 y `Sin revisar`;
- permitir usar sobre esa entrega simulada las interacciones que Visual Review ya soporta: marcar OK/Necesita cambios, feedback con referencias y nueva versión en memoria.

### Restricciones

- DEV/Visual Review solamente;
- NO PostgreSQL;
- NO R2;
- NO Drive;
- NO Google OAuth;
- no hace falta sobrevivir a refresh completo del navegador;
- sí debe sobrevivir la navegación SPA necesaria para ir de `Nueva entrega` al detalle y seguir probando el flujo;
- no contaminar el comportamiento real cuando `SUQUIA_VISUAL_REVIEW !== 1`.

Reutilizar la infraestructura/fixtures de Visual Review actual en vez de crear una segunda app paralela.

Si los object URLs/local state necesitan un store dev-only mínimo para atravesar la navegación, mantenerlo pequeño y explícitamente aislado a Visual Review.

---

## 6. Review de Piece en desktop: modal casi fullscreen

El modal actual de aproximadamente 1180×760 con sidebar de 360px queda chico para revisar piezas y feedback.

Mantener el patrón modal/overlay porque permite:

- conservar contexto de Delivery;
- anterior/siguiente;
- Escape/cerrar;
- revisión rápida de varias piezas.

Pero en desktop hacerlo prácticamente fullscreen:

- margen exterior pequeño y consistente;
- usar casi todo `100vw/100vh` disponible;
- preview de pieza debe ganar espacio;
- panel derecho de review/feedback debe ser claramente más ancho que el actual;
- evitar clipping horizontal;
- el contenido largo del panel derecho debe scrollear cómodamente sin que elementos como referencias/versiones queden “perdidos” por falta de ancho.

No convertirlo en una route nueva en este milestone.

Mantener comportamiento mobile fullscreen actual salvo ajustes necesarios por componentes compartidos.

---

## 7. Eliminar la sección independiente `Referencias`

Una referencia visual pertenece al Feedback concreto que explica por qué fue adjuntada.

Hoy el feedback ya muestra sus `FeedbackAttachment` dentro del comentario, pero además hay una sección independiente `Referencias` en el panel de la versión. Esa duplicación confunde.

Cambiar UI:

- mantener attachments dentro de cada feedback;
- seguir permitiendo click/preview de esas imágenes como hoy;
- eliminar de la UI la sección independiente `Referencias` / `Sin referencias adjuntas` de `PieceReviewPanel`;
- NO borrar `FeedbackAttachment` ni su flujo real;
- no hacer migraciones;
- si `selectedVersion.references` sigue existiendo por fixtures/legacy visual, no hace falta eliminar el tipo en este milestone salvo que esté completamente muerto y sea seguro.

---

## Criterio de aceptación manual

En `SUQUIA_VISUAL_REVIEW=1` debo poder:

1. abrir `Nueva entrega`;
2. elegir Stories o Feed;
3. agregar varias imágenes propias;
4. reordenarlas arrastrando;
5. agregar notas;
6. entregar;
7. ver esas MISMAS imágenes en el detalle, máximo 5 por fila;
8. abrir una pieza en modal casi fullscreen;
9. entender claramente estado de Delivery y Piece;
10. dejar feedback con una referencia y verla dentro de ese feedback, sin una segunda sección `Referencias` duplicada;
11. continuar probando review/versionado en memoria.

El modo real debe seguir usando el flujo existente prepare → R2 → finalize sin cambios funcionales.

---

## Validaciones

Ejecutar:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Si `prisma validate` requiere `DATABASE_URL` y no está disponible, no inventarla; reportarlo solamente si se ejecuta.

Además hacer una pasada manual en Visual Review de `Nueva entrega → Entregar → detalle → abrir pieza`.

## Commit

Si todo queda correcto:

`feat: improve visual review validation flow`

Push a `main` y detenerse.