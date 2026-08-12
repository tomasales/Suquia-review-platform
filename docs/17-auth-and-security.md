# Autenticación y seguridad

## Objetivo

Diseñar una estrategia simple para login con Google, usuarios autorizados, identificación confiable de Tomi y seguridad mínima del MVP.

## Login con Google

- Usar Auth.js con proveedor Google.
- Persistir usuarios y sesiones en PostgreSQL mediante adaptador compatible.
- Proteger rutas de app y APIs desde backend/middleware.
- No implementar usuario/password propio.

## Usuarios autorizados

### Recomendación técnica

Usar una allowlist de emails en DB (`AuthorizedEmail`) y validarla durante el callback/login.

### Por qué

- Es simple para pocos usuarios.
- No exige que todos pertenezcan al mismo dominio.
- Permite incluir Dirección o colaboradores externos si se define luego.
- No introduce una matriz de roles.

### Alternativas

- **Dominio Google permitido**: simple, pero insuficiente si hay usuarios externos o emails personales.
- **Invitaciones completas**: más producto/UX; puede venir después.
- **Configuración manual en env var**: sirve para prototipo, pero es incómoda y menos auditable.

La decisión de producto sobre cómo administrar altas/bajas de usuarios sigue abierta. La arquitectura recomienda allowlist porque es el mecanismo técnico más simple para MVP.

## Identificación confiable de Tomi

No hardcodear condiciones distribuidas como `if email == "...Tomi..."`.

Recomendación:

- campo central `User.isAiLearningSource`;
- como máximo un usuario activo con ese flag al inicio;
- el job de AI Memory consulta ese flag al crear procesamiento;
- Journal registra cambios de esta configuración si se habilita edición.

Esto no es un rol complejo. Es una propiedad funcional específica para definir qué feedback alimenta aprendizaje creativo.

## Sesiones

- Sesiones gestionadas por Auth.js.
- Cookies seguras en producción.
- `AUTH_SECRET` obligatorio.
- Expiración razonable y renovación según defaults de Auth.js, a ajustar en implementación.

## Protección de rutas y APIs

- Toda ruta de aplicación requiere sesión.
- Toda API mutante requiere sesión y usuario autorizado.
- Las acciones mutantes validan ownership funcional cuando aplique, aunque todos tengan permisos amplios en MVP.
- No confiar en datos enviados por frontend para `actorUserId`; tomarlo de sesión.

## Uploads

Validar en backend:

- MIME type permitido;
- extensión coherente;
- tamaño máximo;
- cantidad de archivos;
- tipo de entrega Stories/Feed;
- que no se agreguen piezas después del primer envío;
- que nuevas versiones correspondan a piezas existentes.

Pendiente de producto:

- formatos admitidos;
- límites de tamaño.

## Secrets

Guardar como variables de entorno en Render:

- `DATABASE_URL`;
- `AUTH_SECRET`;
- Google OAuth client ID/secret;
- Google service account JSON o campos equivalentes;
- IDs de carpetas Drive;
- LLM provider API key;
- email/configuración para alertas graves si se implementa.

No commitear credenciales.

## Credenciales Google Drive

- Usar credenciales solo desde backend.
- La service account debe tener permisos mínimos suficientes sobre la carpeta/Shared Drive.
- Rotar credenciales si se exponen.
- No exponer IDs sensibles innecesariamente en frontend.

## Credenciales LLM

- Solo backend/worker puede llamar al proveedor.
- No enviar feedback de Dirección al pipeline de aprendizaje.
- Guardar provider/model usados en AIKnowledgeEntry para trazabilidad.

## Sanitización de inputs

- Guardar texto como texto, no HTML confiable.
- Escapar/renderizar de forma segura en UI.
- Validar payloads con schemas en endpoints.
- Limitar longitud de notas, feedback y replies.

## Eliminación lógica vs física

- Delivery eliminado de plataforma: `deletedAt` en DB.
- Backup en Drive permanece intacto.
- `deleted_entries.json` se actualiza.
- Journal registra actor y fecha.

## Auditoría

Journal registra:

- login relevante si se decide incluir;
- entrega creada/enviada;
- cambios de estado;
- cambios de estado de pieza;
- feedback agregado;
- fallos/reintentos/sync;
- eliminación/restauración.

No copiar conversaciones completas en Journal.

## Riesgos

- Render free web service tiene filesystem efímero; no usarlo como almacenamiento único de uploads.
- Service account mal compartida puede pasar health check parcial pero fallar al crear archivos.
- Allowlist requiere operación manual inicial.

## Referencias oficiales verificadas

- Auth.js: https://authjs.dev/
- Prisma + Auth.js: https://www.prisma.io/docs/guides/authentication/authjs/nextjs
- Google Drive sharing: https://developers.google.com/workspace/drive/api/guides/manage-sharing
- Render environment/secrets se gestionan como variables de entorno del servicio: https://render.com/docs/deploy-nextjs-app
