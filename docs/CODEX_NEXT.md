# CODEX_NEXT

Este archivo contiene la única tarea operativa que Codex debe ejecutar después de que `docs/CODEX_RUN.md` haya sincronizado `main`.

## Protocolo

1. Leer este archivo completo después del pull.
2. Releer el código relevante antes de tocar comportamiento.
3. Implementar únicamente esta corrección.
4. Mantener intacto el modo real PostgreSQL/R2/Drive.
5. Ejecutar validaciones al final.
6. Si queda correcto, commit + push a `main` y detenerse.

---

# Tarea actual — Corregir storage de uploads en Visual Review

El batch `feat: improve visual review validation flow` quedó conceptualmente correcto, pero la implementación actual de `src/lib/visual-review-upload-store.ts` convierte cada archivo local a Data URL y serializa todas las imágenes dentro de `window.sessionStorage`.

Eso es un blocker para la validación manual: varias imágenes reales pueden superar rápidamente la cuota de sessionStorage y hacer fallar `Entregar` aunque el producto solo necesite conservar la composición durante navegación SPA.

## Objetivo

En `SUQUIA_VISUAL_REVIEW=1`, mantener la entrega simulada solamente en memoria del navegador durante la sesión SPA, sin serializar binarios/base64 en Web Storage.

## Comportamiento esperado

- `Nueva entrega → Entregar → detalle` debe seguir mostrando exactamente los archivos seleccionados.
- Debe preservar orden, tipo, nota general y notas por pieza.
- Las imágenes deben mostrarse usando object URLs u otra solución in-memory equivalente.
- Debe soportar varias imágenes reales cuyo tamaño total excedería una cuota típica de sessionStorage.
- No hace falta sobrevivir a refresh completo.
- Sí debe sobrevivir la navegación SPA necesaria entre Nueva entrega y el detalle.
- El resto de interacciones de Visual Review debe seguir funcionando: review state, feedback con referencias y nuevas versiones locales.

## Implementación

Preferir un store dev-only mínimo en memoria, por ejemplo un `Map` compartido en `globalThis` del browser para evitar problemas si el módulo termina en chunks distintos.

- No usar `sessionStorage`/`localStorage` para almacenar imágenes.
- No usar `FileReader.readAsDataURL` para persistir previews.
- Crear `URL.createObjectURL(file)` al guardar la entrega simulada.
- Mantener `isVisualReviewUploadId()` server-safe, porque `src/app/deliveries/[id]/page.tsx` lo usa antes de renderizar el detalle client-side.
- Si hace falta separar helpers server-safe de store client-side, hacerlo de forma mínima.
- Evitar una arquitectura paralela.
- No modificar el flujo real prepare → R2 → finalize.

La liberación de object URLs puede ser best-effort al reemplazar/limpiar una entrega; no sacrificar la continuidad SPA por intentar persistirlos.

## Validación manual

En `SUQUIA_VISUAL_REVIEW=1`:

1. abrir `Nueva entrega`;
2. seleccionar varias imágenes cuyo tamaño combinado sea claramente mayor a una cuota típica de Web Storage (por ejemplo >10 MB);
3. entregar;
4. confirmar que abre el detalle con esas mismas imágenes y orden;
5. abrir una pieza y confirmar que review/feedback/versionado local siguen funcionando.

## Validaciones

Ejecutar:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Commit

Si todo queda correcto:

`fix: keep visual review uploads in memory`

Push a `main` y detenerse.
