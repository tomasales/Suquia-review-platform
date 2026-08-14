# Feedback

## Niveles de feedback

Hay dos niveles:

1. Feedback general de la entrega.
2. Feedback específico por pieza.

El feedback por pieza es el principal.

## Capacidades requeridas

El feedback por pieza debe soportar:

- texto;
- una o varias imágenes de referencia;
- conversación/respuestas entre usuarios.

## Reglas de negocio

- Los comentarios deben permanecer históricos.
- El feedback debe quedar vinculado a la versión en la que fue realizado.
- En la primera implementación real, el feedback por pieza se persiste con `level = PIECE` y `pieceVersionId` obligatorio.
- Cuando existe una nueva versión, los comentarios anteriores siguen accesibles.
- El feedback nuevo solo puede agregarse sobre la última versión de una pieza.
- Las versiones históricas son de solo lectura para feedback.
- Feedback de Tomi y Feedback de Dirección deben mostrarse claramente separados.
- Feedback de Dirección no debe alimentar la memoria de IA.
- Feedback de Dirección no debe interpretarse automáticamente como una instrucción de diseño de Tomi.
- Journal puede registrar que se agregó feedback, pero no debe duplicar conversaciones completas.

La fuente operativa del feedback se determina desde el usuario autenticado: si `User.isAiLearningSource` es verdadero, se guarda como `TOMI`; en caso contrario, como `OTHER`. No se infiere `DIRECTION` automáticamente desde el navegador.

El backup de Drive exporta el feedback real dentro del `manifest.json` de la entrega y, cuando una versión tiene feedback, también escribe un `feedback.jsonl` dentro de la carpeta de esa `PieceVersion`. El archivo se regenera desde PostgreSQL como snapshot canónica, no como append remoto incremental.

## Decisiones tomadas

- No implementar pins o coordenadas sobre la imagen en MVP.
- No crear estados manuales del comentario como pendiente, resuelto o en conversación.

## Referencias visuales

Las imágenes de referencia se implementan en MVP como `FeedbackAttachment` reales de un feedback de pieza.

Reglas:

- El texto del feedback sigue siendo obligatorio.
- Un feedback puede tener de 0 a 10 referencias.
- Los formatos permitidos son `image/jpeg`, `image/png` e `image/webp`.
- El tamaño máximo es 25 MB por referencia.
- Las referencias quedan asociadas al `Feedback` concreto y, por transitividad, a la `PieceVersion` donde ese feedback fue creado.
- Las referencias históricas permanecen visibles al navegar versiones anteriores.
- Solo la última `PieceVersion` acepta feedback nuevo y referencias nuevas.
- Si un finalize con referencias ya creó el `Feedback`, los reintentos con el mismo receipt y el mismo texto son idempotentes aunque luego la entrega se cierre o aparezca una versión nueva.
- Si el mismo receipt llega con otro texto o con otra composición de referencias, el servidor debe responder conflicto y no crear un segundo `Feedback`.
- No se implementan pins, coordenadas ni galería avanzada en MVP.

## Pendiente de definición

- Respuestas/conversación sobre un feedback.
- Feedback general a nivel entrega.

## Referencias cruzadas

- Piezas y versiones: `03-pieces-and-versions.md`.
- Journal: `05-journal.md`.
- AI Memory: `07-ai-memory.md`.
- Google Drive: `08-google-drive.md`.
