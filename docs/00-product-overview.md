# Visión general del producto

## Objetivo

Crear una plataforma interna para ordenar el proceso de entrega y revisión de piezas creativas de SUQUIA.

La plataforma debe funcionar como una memoria operativa del diseño:

**Entrega -> revisión -> feedback -> conversación -> nueva versión -> aprobación -> aprendizaje.**

## Problema actual

Las entregas y devoluciones se hacen principalmente por WhatsApp. Como consecuencia:

- el feedback se pierde;
- se repiten correcciones;
- no existe una memoria estructurada del proceso de diseño;
- cuesta entender qué pasó, quién pidió algo y en qué versión ocurrió.

## Decisiones tomadas

- La plataforma debe priorizar feedback y memoria de diseño, no gestión de proyectos.
- No debe convertirse en Jira ni en una herramienta compleja de project management.
- Debe ser simple, flexible y con la menor cantidad posible de administración manual.
- El flujo del producto empieza cuando se sube una entrega.
- La etapa en la que la diseñadora diseña fuera del sistema no se administra en la plataforma.

## Conceptos principales

- **Delivery / Entrega**: paquete de piezas que se suben juntas.
- **Piece / Pieza**: cada Story o pieza de Feed dentro de una entrega.
- **Version / Versión**: cada nueva versión de una pieza.
- **Feedback**: devolución general o específica sobre una pieza.
- **Journal**: historial automático de eventos del sistema.
- **Guidelines**: documentos estáticos cargados manualmente.
- **AI Memory**: conocimiento estructurado generado a partir del feedback histórico.

## Principios de producto y UX

- Simplicidad antes que configuración.
- Feedback antes que project management.
- Pocas acciones manuales.
- Estados flexibles.
- Nada debe perderse.
- Historial siempre disponible.
- Última versión primero.
- La plataforma debe funcionar como memoria del proceso.
- El usuario siempre debe poder entender qué pasó gracias al Journal.
- IA silenciosa en segundo plano, consultable cuando hace falta.
- Drive como backup; plataforma como experiencia principal.

## Referencias cruzadas

- Usuarios y acceso: `01-users-and-access.md`.
- Entregas: `02-deliveries.md`.
- Piezas y versiones: `03-pieces-and-versions.md`.
- Feedback: `04-feedback.md`.
- Journal: `05-journal.md`.
- Drive: `08-google-drive.md`.
- Alcance MVP: `12-mvp-scope.md`.
- Pendientes: `13-open-decisions.md`.
