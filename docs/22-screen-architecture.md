# Arquitectura de pantallas

## Mapa general

```text
Auth
↓
Dashboard
├── Subir entrega
├── Entregas
│   └── Detalle de entrega
│       └── Modal de pieza
├── Guidelines / Knowledge
├── Journal
├── Recuperar desde Drive
└── Configuración
```

## Shell de aplicación

### Objetivo

Dar estructura persistente y orientación clara.

### Información principal

- navegación principal;
- usuario actual;
- estado de Drive;
- búsqueda/acceso rápido si corresponde;
- contexto de pantalla actual.

### Acciones

- navegar;
- abrir **Subir entrega**;
- refrescar estado de Drive;
- acceder a configuración.

### Estados

- autenticado;
- sesión cargando;
- usuario no autorizado;
- Drive conectado/verificando/con problemas.

### Empty state

No aplica como pantalla; si no hay secciones cargadas, mostrar contenido de la pantalla activa.

### Loading

Skeleton compacto para navegación/usuario.

### Error

Error discreto si no se puede cargar sesión o estado de Drive.

### Dependencias

- Auth.js;
- User;
- Drive health endpoint.

### Navegación

Presente en todas las pantallas autenticadas.

## Auth

### Objetivo

Permitir ingreso con Google solo a usuarios autorizados.

### Información principal

- nombre del producto;
- acción **Ingresar con Google**;
- mensaje si el usuario no está autorizado.

### Acciones

- iniciar login Google;
- volver a intentar.

### Estados

- inicial;
- redirigiendo;
- no autorizado;
- error de autenticación.

### Empty state

No aplica.

### Loading

Mensaje breve de redirección/carga.

### Error

Explicar que no se pudo iniciar sesión o que el email no está autorizado.

### Dependencias

- Auth.js;
- Google OAuth;
- allowlist de emails.

### Navegación

Luego del login exitoso, ir a Dashboard.

## Dashboard

### Objetivo

Responder qué está pasando y qué hay que revisar.

### Información principal

- entregas para revisar;
- entregas recientes;
- resumen por entrega;
- Drive status;
- Journal reciente;
- 2-3 aprendizajes de AI Memory.

### Acciones

- **Subir entrega**;
- abrir entrega;
- ir a Entregas;
- abrir Journal;
- abrir Guidelines / Knowledge;
- refrescar Drive.

### Estados

- sin entregas;
- con entregas pendientes;
- Drive conectado/verificando/con problemas;
- AI Memory sin aprendizajes todavía.

### Empty state

Si no hay entregas, mostrar una invitación sobria a **Subir entrega** y explicar que el flujo empieza con una entrega.

### Loading

Filas skeleton compactas para listas.

### Error

Mostrar error por sección sin bloquear todo el dashboard si otras secciones cargan.

### Dependencias

- Delivery;
- JournalEvent;
- DriveSyncState;
- AIKnowledgeEntry.

### Navegación

Desde Dashboard se accede a Subir entrega, detalle de entrega, Entregas, Journal y Guidelines / Knowledge.

## Subir entrega

### Objetivo

Crear una entrega de Stories o Feed con piezas ordenadas, notas y archivos.

### Información principal

- tipo Stories / Feed;
- archivos seleccionados;
- previews;
- orden;
- nota por pieza;
- nota general;
- estado de Drive como señal secundaria.

### Acciones

- seleccionar archivos;
- cambiar orden antes de enviar;
- eliminar piezas antes de enviar;
- escribir notas;
- enviar;
- cancelar.

### Estados

- sin archivos;
- archivos seleccionados;
- validación de archivos;
- enviando;
- Drive con problemas;
- operación pendiente de reintento.

### Empty state

Zona de carga clara enfocada en seleccionar varios archivos.

### Loading

Indicar validación/subida sin ocultar previews ni notas.

### Error

Si falla Drive o upload, conservar archivos, notas y metadata. Mostrar **Reintentar** cuando corresponda.

### Dependencias

- User;
- Delivery;
- Piece;
- PieceVersion;
- SyncOperation;
- Drive health.

### Navegación

Puede abrirse desde Dashboard o Entregas. Al enviar correctamente, ir al detalle de la entrega o dejar una confirmación con acceso al detalle.

## Entregas

### Objetivo

Funcionar como inbox/listado operativo de todas las entregas.

### Información principal

Columnas recomendadas:

- entrega;
- tipo;
- fecha;
- autor;
- estado;
- piezas;
- resumen de revisión;
- última actividad.

### Acciones

- buscar;
- filtrar por tipo;
- filtrar por estado;
- filtrar por fecha;
- filtrar por usuario;
- abrir detalle;
- abrir acciones contextuales;
- **Subir entrega**.

### Estados

- sin resultados;
- filtros activos;
- búsqueda activa;
- carga de listado.

### Empty state

Si no hay entregas, invitar a subir la primera. Si hay filtros sin resultados, permitir limpiar filtros.

### Loading

Filas skeleton de tabla.

### Error

Mensaje compacto con acción de reintentar carga.

### Dependencias

- Delivery;
- Piece;
- PieceVersion;
- Feedback;
- JournalEvent para última actividad.

### Navegación

Desde Entregas se abre Detalle de entrega y Subir entrega.

## Detalle de entrega

### Objetivo

Revisar una entrega, entender su estado y acceder a sus piezas.

### Información principal

- nombre generado;
- tipo;
- fecha;
- autor;
- estado;
- resumen `5 piezas · 3 OK · 2 necesitan cambios`;
- feedback general;
- grilla de piezas.

### Acciones

- cambiar estado flexible de entrega;
- cerrar entrega manualmente;
- agregar feedback general;
- abrir pieza;
- subir nueva versión de pieza existente;
- eliminar entrega de plataforma.

### Estados

- Enviado para revisar;
- En revisión;
- Requiere cambios;
- Aprobada;
- Cerrada.

### Empty state

No debería existir una entrega enviada sin piezas. Si ocurre, mostrar estado inconsistente y registrar/derivar error técnico.

### Loading

Header skeleton y placeholders de thumbnails.

### Error

Si no carga una pieza o asset, mantener visible el resto del detalle y mostrar error localizado.

### Dependencias

- Delivery;
- Piece;
- PieceVersion;
- Feedback;
- JournalEvent;
- DriveSyncState.

### Navegación

Vuelve a Entregas o Dashboard. Abre Modal de pieza.

## Modal de pieza

### Objetivo

Revisar una pieza con foco visual y feedback contextual.

### Información principal

- preview grande;
- posición;
- versión actual;
- estado de pieza;
- feedback histórico vinculado a versiones;
- conversación;
- referencias;
- historial de versiones.

### Acciones

- marcar OK;
- marcar Necesita cambios;
- escribir feedback;
- responder conversación;
- adjuntar referencias;
- cambiar versión visible;
- ir a pieza anterior/siguiente;
- cerrar modal.

### Estados

- OK;
- Necesita cambios;
- neutro/sin revisar si corresponde según decisión futura;
- asset cargando;
- versión histórica seleccionada.

### Empty state

Si no hay feedback, mostrar caja de nueva devolución como acción principal del panel derecho.

### Loading

Preview con placeholder neutro y panel derecho skeleton.

### Error

Si falla preview, mostrar metadata y opciones de feedback igualmente.

### Dependencias

- Piece;
- PieceVersion;
- Feedback;
- FeedbackAttachment;
- ConversationReply;
- JournalEvent;
- AIProcessingJob cuando el feedback sea de Tomi.

### Navegación

Se abre desde Detalle de entrega. Permite avanzar/retroceder entre piezas sin cerrar.

## Guidelines / Knowledge

### Objetivo

Reunir documentación manual y conocimiento aprendido sin confundir sus fuentes.

### Información principal

- Guidelines manuales;
- documentos de referencia;
- AI Memory;
- categorías/tags;
- evidencia y links a feedback original.

### Acciones

- buscar/filtrar documentación;
- abrir guideline;
- consultar AI Memory;
- filtrar aprendizajes;
- abrir fuente original.

### Estados

- sin Guidelines;
- sin AI Memory procesada;
- cargando;
- error de carga.

### Empty state

Separado por fuente: una zona para documentación manual vacía y otra para AI Memory sin aprendizajes todavía.

### Loading

Listas skeleton compactas.

### Error

Error localizado por tab/fuente.

### Dependencias

- Guideline;
- AIKnowledgeEntry;
- Feedback fuente.

### Navegación

Desde Dashboard/sidebar. Puede navegar hacia detalle de entrega/modal de pieza cuando se abre evidencia.

## Journal

### Objetivo

Mostrar eventos automáticos del sistema de forma compacta y auditable.

### Información principal

- fecha/hora;
- usuario;
- acción;
- entidad;
- metadata mínima.

### Acciones

- filtrar por entrega;
- filtrar por usuario;
- filtrar por tipo de evento;
- abrir entidad relacionada.

### Estados

- sin eventos;
- filtros activos;
- cargando;
- error.

### Empty state

Mensaje simple: todavía no hay eventos.

### Loading

Filas/timeline skeleton.

### Error

Mensaje compacto con reintento.

### Dependencias

- JournalEvent;
- User;
- Delivery/Piece/Feedback referenciado.

### Navegación

Desde sidebar, Dashboard o detalle de entrega. Puede abrir entidades relacionadas.

## Recuperar desde Drive

### Objetivo

Restaurar entregas eliminadas usando `deleted_entries.json`, sin escanear todo Drive.

### Información principal

- entregas eliminadas;
- fecha de eliminación;
- usuario que eliminó;
- ubicación/manifest de Drive;
- estado de recuperación.

### Acciones

- refrescar índice;
- ver detalle básico;
- restaurar;
- cancelar.

### Estados

- Drive conectado;
- Drive con problemas;
- sin eliminadas;
- restaurando;
- restauración fallida;
- restauración exitosa.

### Empty state

No hay entregas eliminadas recuperables.

### Loading

Lista skeleton mientras se lee `deleted_entries.json`.

### Error

Explicar fallo de Drive o manifest y permitir reintento manual.

### Dependencias

- Google Drive API;
- DeletedEntry;
- manifest;
- SyncOperation;
- JournalEvent.

### Navegación

Acción secundaria desde Entregas o Configuración. Al restaurar, navegar al detalle de entrega restaurada.

## Configuración

### Objetivo

Centralizar ajustes mínimos operativos sin crear administración compleja.

### Información principal

- usuario actual;
- usuarios autorizados si se implementa gestión;
- estado/configuración Drive;
- configuración AI Memory;
- información de entorno.

### Acciones

- refrescar Drive;
- revisar configuración;
- gestionar allowlist si se define;
- cerrar sesión.

### Estados

- configuración cargada;
- permisos insuficientes si en el futuro se separan permisos;
- error de Drive;
- error de carga.

### Empty state

No aplica; siempre debe mostrar al menos usuario y estado básico.

### Loading

Secciones skeleton.

### Error

Error por sección.

### Dependencias

- User;
- AuthorizedEmail;
- DriveSyncState;
- SystemConfiguration.

### Navegación

Desde sidebar inferior. Puede vincular a Recuperar desde Drive.

## Responsive

Prioridad:

1. desktop/laptop;
2. tablet;
3. mobile como acceso secundario.

Degradación:

- sidebar desktop pasa a navegación colapsada/drawer;
- tablas pasan a listas resumidas;
- grillas reducen columnas;
- modal de pieza pasa a pantalla completa o layout vertical;
- topbar conserva acción principal y Drive status compacto.

## Conflictos detectados

No se detectaron contradicciones con la documentación funcional o técnica actual.
