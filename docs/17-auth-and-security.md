# Autenticación y seguridad

## Objetivo

Diseñar una estrategia simple para login con Google, usuarios autorizados, identificación confiable de Tomi y seguridad mínima del MVP.

## Login con Google

- Usar Auth.js con proveedor Google.
- Persistir usuarios y sesiones en PostgreSQL mediante adaptador compatible.
- Proteger rutas de app y APIs desde backend/middleware.
- No implementar usuario/password propio.

## Implementación inicial

- Se usa `next-auth` estable con Google como único provider.
- Se usa Prisma Adapter oficial compatible con la versión estable instalada.
- La estrategia de sesión es `database`; las sesiones se guardan en PostgreSQL.
- Los modelos técnicos agregados para Auth.js son `Account`, `Session` y `VerificationToken`.
- `User.name` reemplaza a `displayName` para mantener compatibilidad nativa con Auth.js sin duplicar campos.

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

Implementación:

1. Google devuelve identidad.
2. El email se normaliza con `trim().toLowerCase()`.
3. Si Google informa `email_verified=false`, el acceso se rechaza.
4. El email debe existir en `AuthorizedEmail` con `active=true`.
5. Si existe `User` con `isActive=false`, el acceso se rechaza aunque la allowlist siga activa.
6. Auth.js crea o actualiza usuario, cuenta y sesión en PostgreSQL.
7. En el evento de sign-in se actualizan `lastLoginAt` e `isAiLearningSource`.

La unicidad case-insensitive se resuelve inicialmente por normalización en la aplicación antes de persistir o comparar emails. No se agrega extensión PostgreSQL ni índice funcional en este módulo.

## Identificación confiable de Tomi

No hardcodear condiciones distribuidas como `if email == "...Tomi..."`.

Recomendación:

- campo central `User.isAiLearningSource`;
- campo de bootstrap `AuthorizedEmail.isAiLearningSource`;
- como máximo un usuario activo con ese flag al inicio;
- el job de AI Memory consulta ese flag al crear procesamiento;
- Journal registra cambios de esta configuración si se habilita edición.

Esto no es un rol complejo. Es una propiedad funcional específica para definir qué feedback alimenta aprendizaje creativo.

Para autorizar el primer usuario real se debe crear un registro en `AuthorizedEmail` con el email normalizado y `active=true` antes del primer login. Si ese usuario debe alimentar AI Memory, marcar también `isAiLearningSource=true`. Esto puede hacerse con Prisma Studio o con un seed local no versionado; no se commitean emails reales.

## Sesiones

- Sesiones gestionadas por Auth.js.
- Cookies seguras en producción.
- `AUTH_SECRET` obligatorio.
- `NEXTAUTH_URL`/`AUTH_URL` configurado según entorno para callbacks OAuth.
- Expiración razonable y renovación según defaults de Auth.js, a ajustar en implementación.

## Protección de rutas y APIs

- Toda ruta de aplicación requiere sesión.
- Toda API mutante requiere sesión y usuario autorizado.
- Las acciones mutantes validan ownership funcional cuando aplique, aunque todos tengan permisos amplios en MVP.
- No confiar en datos enviados por frontend para `actorUserId`; tomarlo de sesión.

Next.js 16 usa `proxy.ts` para la capa temprana de routing. La implementación usa `proxy.ts` para redirigir rutas privadas sin cookie de sesión hacia `/login`, y valida la sesión real server-side con Auth.js/Prisma en los helpers reutilizables antes de renderizar la aplicación. Los endpoints de Auth.js y `/login` son públicos.

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

Google Cloud Console debe configurar un OAuth Client con redirect URIs autorizadas:

- local: `http://localhost:3000/api/auth/callback/google`;
- producción: `https://<dominio-produccion>/api/auth/callback/google`.

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
