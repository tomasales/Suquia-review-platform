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
- Cuando existe una nueva versión, los comentarios anteriores siguen accesibles.
- Feedback de Tomi y Feedback de Dirección deben mostrarse claramente separados.
- Feedback de Dirección no debe alimentar la memoria de IA.
- Feedback de Dirección no debe interpretarse automáticamente como una instrucción de diseño de Tomi.
- Journal puede registrar que se agregó feedback, pero no debe duplicar conversaciones completas.

## Decisiones tomadas

- No implementar pins o coordenadas sobre la imagen en MVP.
- No crear estados manuales del comentario como pendiente, resuelto o en conversación.

## Referencias visuales

Las imágenes de referencia pueden adjuntarse al feedback de una pieza y deben conservarse asociadas a la versión correspondiente cuando aplique.

## Pendiente de definición

- Formatos de archivo admitidos para referencias.
- Límites de tamaño de archivos.

## Referencias cruzadas

- Piezas y versiones: `03-pieces-and-versions.md`.
- Journal: `05-journal.md`.
- AI Memory: `07-ai-memory.md`.
- Google Drive: `08-google-drive.md`.
