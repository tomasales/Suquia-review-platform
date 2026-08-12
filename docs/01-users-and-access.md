# Usuarios y acceso

## Decisiones tomadas para MVP

- El login será con Google.
- Cada persona tendrá identidad propia mediante su cuenta/email.
- Todos los usuarios autenticados tendrán inicialmente los mismos permisos.
- No se implementará una matriz compleja de roles en el MVP.
- El objetivo principal de identificar usuarios es registrar quién hizo cada acción y cuándo.
- Todas las acciones relevantes deben poder quedar asociadas a un usuario en Journal.

## Reglas de negocio

- El Journal debe registrar usuario y fecha/hora para acciones relevantes.
- Los permisos podrán separarse más adelante.
- La amplitud inicial de permisos vuelve especialmente importante al Journal como fuente de auditoría funcional.

## Dirección

Dirección puede participar de algunas revisiones.

Su devolución:

- debe estar claramente identificada como **Feedback de Dirección**;
- puede verla también la diseñadora;
- debe mantenerse separada del feedback de Tomi;
- no debe alimentar la memoria de IA;
- no debe interpretarse automáticamente como una instrucción de diseño de Tomi.

## Pendiente de definición

- Detalle final de acceso de Dirección si se decide limitarlo en el futuro.
- Quién administra Guidelines cuando más adelante existan roles.

## Referencias cruzadas

- Separación de feedback: `04-feedback.md`.
- Exclusión de Dirección de AI Memory: `07-ai-memory.md`.
- Auditoría de acciones: `05-journal.md`.
- Pendientes completos: `13-open-decisions.md`.
