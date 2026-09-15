# Live Pilot MVP

Este runbook prepara una instancia pública mínima para probar SUQUIA Review Platform con datos reales entre Tomi y una persona colaboradora.

## Alcance

Incluido en el pilot:

- Login con Google y allowlist.
- Creación real de Delivery.
- Upload de piezas a Cloudflare R2.
- Persistencia en PostgreSQL.
- Review state, feedback con referencias y versionado de piezas.

Fuera de este bloque:

- AI real.
- ConversationReply.
- Búsqueda.
- Restore desde Drive.
- Guidelines management.
- Roles.
- Notificaciones.
- Métricas.

Google Drive es opcional en este pilot. Si no se configura, el core debe seguir funcionando con PostgreSQL + R2.

## Render

1. Crear un Web Service conectado al repo de GitHub.
2. Usar runtime Node.
3. Configurar el build command:

```bash
npm ci && npm run build
```

4. Configurar el start command:

```bash
npm run start
```

5. Definir las variables de entorno antes del primer deploy.

## PostgreSQL

1. Crear una base PostgreSQL en Render o un proveedor compatible.
2. Copiar la connection string en `DATABASE_URL`.
3. Ejecutar migraciones antes de iniciar o como job/manual shell:

```bash
npm run db:migrate:deploy
```

No usar `prisma migrate dev` en producción.

## Google OAuth

Configurar en Google Cloud:

- OAuth Client ID.
- OAuth Client Secret.
- Authorized redirect URI:

```text
https://TU_DOMINIO/api/auth/callback/google
```

Variables:

```bash
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=
AUTH_URL=https://TU_DOMINIO
NEXTAUTH_URL=https://TU_DOMINIO
```

`AUTH_SECRET` debe ser un secreto fuerte y privado.

## Cloudflare R2

Crear bucket y credenciales R2 con permisos de lectura/escritura sobre ese bucket.

Variables:

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
DELIVERY_UPLOAD_SECRET=
```

`DELIVERY_UPLOAD_SECRET` debe ser un secreto fuerte y privado.

## Google Drive Opcional

Para habilitar backup a Drive, configurar:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=
DRIVE_ROOT_FOLDER_ID=
DRIVE_STORIES_FOLDER_ID=
DRIVE_FEED_FOLDER_ID=
DRIVE_SHARED_DRIVE_ID=
```

`DRIVE_SHARED_DRIVE_ID` puede quedar vacío si no se usa Shared Drive.

Si estas variables no están configuradas, no se procesa backup a Drive durante el pilot y la UI no muestra estado de Drive.

## Allowlist

Después de migrar la DB y antes del primer login, activar los emails autorizados desde un shell del servidor:

```bash
npm run allowlist:email -- user@example.com
```

Para marcar una cuenta como fuente operativa de aprendizaje AI:

```bash
npm run allowlist:email -- user@example.com --ai-learning-source
```

No crear `User` manualmente. El usuario se crea al iniciar sesión con Google si el email está activo en `AuthorizedEmail`.

## Healthcheck

Endpoint público mínimo:

```bash
GET /api/health
```

Respuestas esperadas:

- `200` con `{ "status": "ok" }` si PostgreSQL responde.
- `503` con `{ "status": "unavailable" }` si PostgreSQL no responde.

No expone detalles de conexión ni errores internos.

## Orden De Deploy

1. Configurar variables de entorno.
2. Instalar dependencias:

```bash
npm ci
```

3. Generar build:

```bash
npm run build
```

4. Aplicar migraciones:

```bash
npm run db:migrate:deploy
```

5. Agregar allowlist:

```bash
npm run allowlist:email -- user@example.com
```

6. Iniciar:

```bash
npm run start
```

7. Revisar healthcheck:

```bash
curl https://TU_DOMINIO/api/health
```

## Smoke Test Real

1. Intentar login con un usuario no allowlisted y confirmar que no accede.
2. Login con usuario allowlisted.
3. Crear una Delivery real con piezas.
4. Recargar la página y confirmar que la Delivery sigue visible.
5. Abrir el detalle.
6. Agregar feedback con una referencia.
7. Subir V2 en una pieza.
8. Marcar V2 como OK.
9. Cerrar sesión.
10. Volver a entrar y confirmar persistencia de Delivery, feedback, referencia, V2 y estado OK.

## Seguridad

- No guardar secretos en Git.
- No commitear emails reales en documentación, seeds o scripts.
- Mantener `SUQUIA_VISUAL_REVIEW` vacío o sin definir en producción.
