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
- Cómo limpiar objetos R2 preparados o subidos con keys definitivas cuando el navegador se cierra o el flujo no llega a finalizar en PostgreSQL.

## Referencias cruzadas

- Google Drive y health check: `08-google-drive.md`.
- Journal: `05-journal.md`.
- Alcance MVP: `12-mvp-scope.md`.
