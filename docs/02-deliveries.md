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

## Referencias cruzadas

- Piezas y revisión: `03-pieces-and-versions.md`.
- Feedback: `04-feedback.md`.
- Journal: `05-journal.md`.
- Restauración desde Drive: `08-google-drive.md`.
- Dashboard: `11-dashboard.md`.
- Pendientes completos: `13-open-decisions.md`.
