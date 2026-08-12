# Journal

## Definición

**Journal** es el nombre definitivo de esta funcionalidad.

Es un registro automático de eventos del sistema.

No debe duplicar conversaciones completas.

## Objetivo

Permitir que cualquier usuario pueda entender qué pasó, cuándo ocurrió y quién hizo cada acción relevante.

El Journal es fundamental porque inicialmente todos los usuarios tienen permisos amplios.

## Datos mínimos por evento

Cada evento debe registrar al menos:

- fecha/hora;
- usuario;
- tipo de evento;
- entidad relacionada;
- información mínima necesaria para entender qué ocurrió.

## Eventos esperados

Ejemplos de eventos:

- Entrega creada.
- Entrega enviada para revisar.
- Tomi comenzó la revisión.
- Pieza marcada OK.
- Pieza marcada Necesita cambios.
- V2 subida.
- Feedback agregado.
- Entrega enviada a Dirección.
- Dirección respondió.
- Falló sincronización con Drive.
- Sincronización reintentada con éxito.
- Entrega aprobada.
- Entrega cerrada.
- Entrega eliminada.
- Entrega restaurada.

## Reglas de negocio

- Toda modificación de estado de entrega debe registrarse.
- Todo cambio de estado de pieza debe registrarse.
- Toda eliminación y restauración de entrega debe registrarse.
- Fallos, reintentos y recuperaciones de sincronización deben registrarse.
- El Journal no reemplaza al feedback ni a la conversación.

## Referencias cruzadas

- Usuarios y auditoría: `01-users-and-access.md`.
- Entregas: `02-deliveries.md`.
- Piezas: `03-pieces-and-versions.md`.
- Feedback: `04-feedback.md`.
- Fallos y recuperación: `09-errors-and-recovery.md`.
