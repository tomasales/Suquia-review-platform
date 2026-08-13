# Google Drive

## Rol de Drive

Google Drive funciona como backup completo y organizado.

La plataforma sigue siendo la interfaz principal.

## Estructura conceptual

Drive debe contener:

```text
/Suquia
  /Stories
  /Feed
```

Dentro de cada tipo:

```text
/Tipo
  /Entrega
    manifest.json
    Journal
    feedback-general
    /01
      metadata
      /V1
        archivo
        feedback
        referencias
      /V2
        archivo
        feedback
        referencias
    /02
    /03
```

La estructura exacta podrá refinarse técnicamente, pero debe preservar:

- entrega;
- piezas;
- orden;
- versiones;
- metadata;
- feedback;
- referencias;
- Journal.

## Manifest

Cada entrega debe tener un manifest estructurado que permita reconstruirla.

No se debe depender de inferir información solamente mirando nombres de archivos.

El manifest registra el estado actual de cada pieza como `currentReviewState`, derivado de la última `PieceVersion`, y conserva el `reviewState` propio de cada versión en su historial.

## Eliminación y backup

Eliminar una entrega de la plataforma no debe borrar el backup en Google Drive.

Google Drive nunca debe eliminarse automáticamente por una eliminación en la plataforma.

## Restauración desde Drive

No se quiere que el sistema tenga que escanear y comparar todo Drive para encontrar entregas eliminadas.

Debe existir conceptualmente un índice, por ejemplo:

`deleted_entries.json`

Cuando una entrega se elimina de la plataforma:

- permanece intacta en Drive;
- se agrega una referencia a `deleted_entries`;
- esa referencia debe incluir al menos el ID de entrega y ubicación de su backup/manifest.

En la plataforma debe existir una función **Recuperar desde Drive**.

Esta pantalla consulta `deleted_entries` y muestra únicamente las entregas eliminadas.

Al elegir restaurar:

- leer su manifest;
- reconstruir la entrega;
- recuperar piezas;
- versiones;
- feedback;
- Journal;
- metadata.

Una vez restaurada, se debe actualizar el índice de eliminados.

No se debe escanear todo Drive para hacer esta operación.

## Conexión con Drive

El backend deberá comunicarse con Google Drive usando la API oficial.

Conceptualmente puede utilizarse una cuenta de servicio con acceso a una carpeta compartida.

La interfaz debe mostrar un indicador persistente del estado de Drive:

- Drive conectado
- Verificando
- Problemas de conexión

## Health check

Chequeo esperado:

- automático aproximadamente cada 3 minutos;
- manual al tocar/refrescar el indicador;
- chequeo adicional justo antes de operaciones críticas como **Entregar**.

El botón **Entregar** debe permanecer habilitado.

Cuando el usuario lo toca:

1. hacer un chequeo actual;
2. intentar la operación.

No bloquear preventivamente al usuario únicamente por el último resultado del chequeo periódico.

## Pendiente de definición

- UI exacta de restauración desde Drive.
- Convención final de nombres de carpetas/archivos en Drive.
- Frecuencia/configuración final del health check de Drive.

## Referencias cruzadas

- Entregas y eliminación: `02-deliveries.md`.
- Versiones: `03-pieces-and-versions.md`.
- Fallos y recuperación: `09-errors-and-recovery.md`.
- Journal: `05-journal.md`.
