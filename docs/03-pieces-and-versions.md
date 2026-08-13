# Piezas y versiones

## Pieza

Una pieza es cada Story o pieza de Feed dentro de una entrega.

## Reglas de negocio

- Las piezas pertenecen a una entrega.
- Las piezas mantienen un orden.
- El orden de las piezas importa.
- Después del primer envío de una entrega, no se pueden agregar piezas, eliminar piezas ni cambiar su orden.
- Después del primer envío, solo se pueden subir nuevas versiones de las piezas existentes.
- No se debe implementar un workflow complejo por pieza en el MVP.

## Estado de cada pieza

Dentro del visor de cada pieza debe haber dos acciones principales:

- OK
- Necesita cambios

Estas acciones son más importantes que tener selectores de estados complejos.

Una pieza puede volver de **OK** a **Necesita cambios** si hace falta. No se debe bloquear esa reversión.

Journal registra los cambios de estado de pieza.

El estado real de revisión se guarda en `PieceVersion.reviewState`. La pieza muestra como estado actual el estado de su última versión. Cuando se sube una nueva versión, esa versión nace como **Sin revisar** y no hereda automáticamente la evaluación de la versión anterior.

## Resumen por entrega

Al terminar o durante una revisión, la entrega puede mostrar automáticamente un resumen como:

`5 piezas · 3 OK · 2 necesitan cambios`

## Revisión de una entrega

Al abrir una entrega se debe mostrar:

- una grilla con todas sus piezas;
- el orden de las piezas;
- una identificación visual de cuáles están OK y cuáles necesitan cambios.

Al tocar una pieza debe abrirse un modal grande similar al comportamiento de Instagram Desktop.

Layout conceptual del modal:

**Izquierda**

- preview grande de la pieza.

**Derecha**

- información;
- estado;
- acciones OK / Necesita cambios;
- feedback;
- conversación;
- referencias adjuntas;
- versiones;
- caja para escribir devolución.

Debe ser posible pasar rápidamente de una pieza a otra sin cerrar el modal.

## Versionado

Nunca se debe reemplazar destructivamente una pieza.

Cada nueva subida crea una nueva versión:

- V1
- V2
- V3
- etc.

La última versión se muestra por defecto. Las versiones anteriores permanecen accesibles desde el historial.

Cada versión debe guardar:

- archivo;
- fecha;
- usuario que la subió;
- feedback asociado;
- referencias asociadas si corresponde.

El feedback queda ligado a la `PieceVersion` exacta sobre la que fue escrito.

Solo la última versión puede recibir acciones de revisión o feedback nuevo. Las versiones anteriores permanecen accesibles desde el historial en modo lectura.

## Fuera del MVP

- Comparación lado a lado entre versiones.
- Pins o coordenadas sobre la imagen.
- Workflow complejo por pieza.

## Referencias cruzadas

- Entregas: `02-deliveries.md`.
- Feedback vinculado a versión: `04-feedback.md`.
- Journal: `05-journal.md`.
- Backup por versión en Drive: `08-google-drive.md`.
