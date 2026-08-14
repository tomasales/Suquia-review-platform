# Errores y recuperación

## Regla crítica

El usuario no debe perder el trabajo.

## Situaciones cubiertas

Si falla:

- Drive;
- una subida;
- sincronización;
- una operación importante del sistema;

la información ya ingresada debe conservarse.

## Comportamiento esperado

- Guardar temporalmente la operación como borrador/pendiente técnico.
- Mostrar claramente el error.
- La acción de reintento es manual.
- El botón de reintento debe llamarse **Reintentar**.
- No reintentar automáticamente.
- El indicador de Drive permite saber cuándo tiene sentido probar nuevamente.

## Drive backup

El backup a Google Drive corre como infraestructura en segundo plano. Una entrega creada correctamente en PostgreSQL y R2 sigue siendo válida aunque Drive falle.

El shell de la aplicación muestra:

- estado de conexión Drive;
- cantidad prioritaria de backups pendientes, sincronizando o con error;
- acción manual para verificar Drive;
- acción manual **Reintentar backup** cuando existe una SyncOperation `FAILED`.

Las operaciones `PENDING` pueden procesarse oportunísticamente cuando Drive está accesible. Las operaciones `FAILED` nunca se reintentan automáticamente: requieren acción manual.

Las mutaciones de revisión y feedback guardan primero en PostgreSQL y registran una obligación de refresh Drive como `SyncOperation` coalesced. Si ya existe una operación `FAILED` para esa entrega, no se crea una nueva `PENDING`; el usuario puede guardar su trabajo y el retry manual tomará el snapshot actual completo cuando se ejecute.

Cuando un backup falla, cualquier refresh `PENDING` de esa misma Delivery queda absorbido por el `FAILED`. Esas operaciones pendientes son trabajo técnico no ejecutado; el retry manual del `FAILED` vuelve a leer PostgreSQL y respalda la snapshot canónica más reciente.

## Referencias de feedback

Las referencias visuales de feedback usan el flujo seguro:

```text
prepare -> PUT directo a R2 -> finalize
```

Si falla `prepare` o el PUT, el cliente conserva texto y archivos seleccionados y descarta el attempt para volver a empezar. Si falla `finalize` por red o 5xx después de subir los objetos, el cliente conserva el `attemptToken` y reintenta solo finalize. Si aparece una nueva versión o la entrega se cierra entre prepare y finalize, el servidor responde `HISTORICAL_VERSION` o `DELIVERY_CLOSED`, no crea Feedback, y limpia best-effort los objetos R2 firmados por ese receipt.

## Journal

Registrar en Journal:

- fallo;
- reintento;
- recuperación exitosa.

## Notificaciones

En MVP no hay notificaciones normales.

No implementar:

- WhatsApp;
- Telegram;
- emails normales;
- push;
- recordatorios;
- deadlines.

Única excepción:

- errores graves del sistema o de sincronización pueden enviar un email solamente a Tomi.

## Pendiente de definición

- Qué errores son considerados graves para disparar email.
- Cómo se representan internamente los borradores/pendientes técnicos.
- Cómo limpiar objetos R2 preparados o subidos con keys definitivas cuando el navegador se cierra y no llega a llamar al endpoint de cleanup.

## Referencias cruzadas

- Google Drive y health check: `08-google-drive.md`.
- Journal: `05-journal.md`.
- Alcance MVP: `12-mvp-scope.md`.
