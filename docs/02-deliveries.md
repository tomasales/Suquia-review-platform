# Entregas

## Definición

Una entrega es un paquete de piezas que se suben juntas para revisión.

## Tipos de entrega

Existen dos tipos:

- Stories
- Feed

## Reglas de negocio

- Una entrega solo puede contener un tipo.
- Nunca se deben mezclar Stories y Feed dentro de una misma entrega.
- La entrega tiene piezas ordenadas.
- El orden importa.
- No se exige título manual.
- El título/nombre de la entrega se genera automáticamente.

Ejemplo de nombre generado:

`Stories · 12 Ago · 5 piezas`

## Listado de entregas

Debe existir una pantalla principal tipo inbox/mailbox con todas las entregas.

Cada entrada debería poder mostrar conceptualmente:

- nombre generado;
- fecha;
- tipo: Stories / Feed;
- cantidad de piezas;
- estado de entrega;
- resumen como `5 piezas · 3 OK · 2 necesitan cambios`.

Debe permitir:

- entrar al detalle de una entrega;
- buscar;
- filtrar por Stories / Feed;
- filtrar por estado;
- filtrar por fecha;
- filtrar por usuario.

No se define todavía una UI detallada.

## Creación de entrega

La acción principal del Dashboard es **Subir entrega**.

Flujo mínimo:

1. Elegir tipo: Stories o Feed.
2. Seleccionar varios archivos.
3. Mostrar preview de los archivos seleccionados.
4. Permitir ordenar las piezas.
5. Permitir agregar una nota opcional por pieza.
6. Permitir agregar una nota general opcional para toda la entrega.
7. Enviar la entrega.

Datos automáticos:

- usuario;
- fecha;
- cantidad de piezas;
- título/nombre generado por el sistema.

Antes de enviar una entrega se puede:

- seleccionar archivos;
- ordenar piezas;
- eliminar piezas de la selección;
- agregar notas.

## Estructura congelada después del envío

Una vez enviada por primera vez:

- no se pueden agregar nuevas piezas a esa entrega;
- no se pueden eliminar piezas;
- no se puede cambiar el orden;
- no se reemplaza destructivamente una pieza;
- solo se pueden subir nuevas versiones de las piezas existentes.

El objetivo es preservar la correspondencia histórica entre:

- pieza;
- posición;
- versiones;
- feedback;
- backup en Drive.

## Estados de entrega

Los estados deben ser flexibles, no una máquina de estados rígida.

Estados conceptuales:

- Enviado para revisar
- En revisión
- Requiere cambios
- Aprobada
- Cerrada

Los nombres podrán ajustarse más adelante.

## Reglas de estado

- No bloquear técnicamente movimientos hacia atrás.
- Toda modificación de estado debe registrarse en Journal.
- Aunque todas las piezas estén OK, la entrega no se cierra automáticamente.
- Debe existir una acción manual **Cerrar entrega**.

## Integración inicial con revisión de piezas

Durante el MVP, las acciones reales de revisión por pieza actualizan el estado de la entrega de forma básica:

- si una entrega está en **Enviado para revisar** y se marca una pieza como **OK**, pasa a **En revisión**;
- si una entrega está en **Enviado para revisar** y se marca una pieza como **Necesita cambios**, pasa a **Requiere cambios**;
- si una entrega está en **En revisión** y una pieza se marca como **Necesita cambios**, pasa a **Requiere cambios**;
- si una entrega está en **Requiere cambios** y una pieza vuelve a **OK**, la entrega permanece en **Requiere cambios**;
- marcar todas las piezas como **OK** no aprueba ni cierra automáticamente la entrega.

Cuando se agrega feedback por pieza a una entrega en **Enviado para revisar**, la entrega pasa a **En revisión**.

Cuando se sube una nueva versión de una pieza existente, la entrega vuelve a quedar **Enviado para revisar** si estaba en otro estado abierto. La nueva versión queda **Sin revisar**.

Las entregas **Cerradas** quedan en modo lectura para revisión y feedback.

## Flujo típico

1. Diseñadora envía.
2. La entrega queda en **Enviado para revisar**.
3. Tomi empieza la revisión.
4. La entrega pasa a **En revisión**.
5. Se revisan piezas.
6. Si hay cambios, la entrega pasa a **Requiere cambios**.
7. La diseñadora sube nuevas versiones.
8. La entrega vuelve a **Enviado para revisar**.
9. Si todo queda aprobado, la entrega pasa a **Aprobada**.
10. Un usuario toca manualmente **Cerrar entrega**.
11. La entrega pasa a **Cerrada**.

## Eliminación

Una entrega puede eliminarse de la plataforma.

Eliminar no significa borrar el backup en Google Drive. Google Drive nunca debe eliminarse automáticamente por esta acción.

La eliminación sirve para sacar ruido de la plataforma.

Journal debe registrar quién eliminó la entrega.

## Pendiente de definición

- Nombres definitivos de estados y microcopy.
- Si más adelante se registra también el estado **Publicado**.
- Política de archivado además de eliminación.
- Sincronización incremental a Drive después de cambios de revisión o feedback.

## Referencias cruzadas

- Piezas, orden y versiones: `03-pieces-and-versions.md`.
- Feedback: `04-feedback.md`.
- Journal: `05-journal.md`.
- Restauración desde Drive: `08-google-drive.md`.
- Dashboard: `11-dashboard.md`.
- Búsqueda y filtros: `10-search.md`.
- Pendientes completos: `13-open-decisions.md`.
