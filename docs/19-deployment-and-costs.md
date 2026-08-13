# Deployment y costos

## Objetivo

Diseñar un despliegue simple en Render, con GitHub como origen de código, costo cero o muy bajo y capacidad de crecer sin reescribir.

## Servicios recomendados

### Prototipo/desarrollo

- Render Web Service Free para la app Next.js.
- Render Postgres Free solo para pruebas temporales.
- Google Drive como backup.
- LLM externo con usage bajo.

Limitación crítica: Render Postgres Free expira a los 30 días y no tiene backups. No usarlo como única base de datos de producción.

### MVP con pocos usuarios

- Render Web Service Starter o Free si se acepta cold start.
- PostgreSQL pago mínimo en Render o proveedor Postgres externo con plan gratuito persistente si se prioriza costo cero.
- Cloudflare R2 para archivos operativos privados.
- Sin worker separado al inicio: worker simple dentro del Web Service, activado por endpoint interno o loop controlado.
- Drive API con service account.
- LLM externo de bajo costo.

### Crecimiento moderado

- Web Service pago always-on.
- PostgreSQL pago con backups/PITR según plan.
- Worker separado si los jobs empiezan a competir con requests.
- Posible uso futuro de pgvector/embeddings o búsqueda externa solo si aparecen necesidades reales.

## Render

Render soporta Web Services Node.js y tiene guía oficial para desplegar Next.js como Web Service con build/start commands.

Free Web Services:

- se duermen después de inactividad;
- pueden tardar aproximadamente un minuto en reactivarse;
- tienen filesystem efímero;
- no soportan persistent disks;
- pueden reiniciarse.

Implicación: no guardar uploads en filesystem local del Web Service. Los blobs operativos se guardan en Cloudflare R2 y PostgreSQL conserva metadata/keys.

Render Postgres Free:

- 1 GB;
- expira después de 30 días;
- sin backups;
- útil para pruebas, no para producción.

## Costos aproximados

No fijar precios como contrato; revisar página oficial de Render antes de contratar.

Como referencia verificada en documentación/artículos de Render:

- Prototipo: puede ser $0 si se aceptan límites de Free y DB temporal.
- MVP interno serio: esperar costo bajo mensual por Web Service always-on + Postgres pago mínimo, o usar alternativa Postgres externa persistente si se prioriza $0.
- Crecimiento moderado: sube por compute, storage, bandwidth, base de datos y eventual worker.

El costo de IA depende de:

- cantidad de feedback nuevo de Tomi;
- modelo elegido;
- tokens por procesamiento;
- si se usa análisis visual;
- reprocesamientos por cambio de schema.

## Variables de entorno

Mínimas:

- `DATABASE_URL`;
- `AUTH_SECRET`;
- `AUTH_GOOGLE_ID`;
- `AUTH_GOOGLE_SECRET`;
- `R2_ACCOUNT_ID`;
- `R2_ACCESS_KEY_ID`;
- `R2_SECRET_ACCESS_KEY`;
- `R2_BUCKET_NAME`;
- `R2_ENDPOINT`;
- `GOOGLE_SERVICE_ACCOUNT_JSON` o campos equivalentes;
- `DRIVE_ROOT_FOLDER_ID`;
- `DRIVE_STORIES_FOLDER_ID`;
- `DRIVE_FEED_FOLDER_ID`;
- `DRIVE_SHARED_DRIVE_ID` si se usa Shared Drive para acotar búsquedas;
- `LLM_PROVIDER`;
- `LLM_API_KEY`;
- `AI_MEMORY_SCHEMA_VERSION`;
- `CRITICAL_ERROR_EMAIL_TO`;

## Builds desde GitHub

- Conectar Render al repo GitHub.
- Deploy automático desde `main` cuando empiece implementación.
- Usar variables separadas para preview/staging si se crean entornos.

## Dominio y SSL

- Render provee dominio `.onrender.com`.
- Custom domain y TLS administrado pueden configurarse cuando haga falta.

## Background jobs en Render

No usar Redis ni cola externa por defecto.

Opciones:

1. **Dentro del Web Service**: más barato y simple, suficiente para pocos jobs; cuidar duplicación si hay más de una instancia.
2. **Background Worker Render**: más claro operativamente, pero agrega costo.
3. **Cron Job Render**: útil para barrer jobs pendientes cada pocos minutos, pero puede tener costo mínimo.

Recomendación MVP:

- empezar con tabla de jobs en Postgres;
- procesar por endpoint interno protegido o worker simple;
- mover a Background Worker si interfiere con UX.

## Observabilidad mínima

- Logs de Render.
- Journal funcional.
- SyncOperation con errores.
- AIProcessingJob con errores.
- DriveSyncState.
- Email solo para errores graves definidos.

No agregar plataforma compleja de observabilidad en MVP.

## Riesgos

- Free tier de Render no es producción estable.
- Postgres Free expira.
- Filesystem local efímero exige almacenamiento operativo persistente o subida rápida a Drive.
- R2 requiere configurar CORS correctamente para uploads directos desde browser.
- Jobs dentro del Web Service pueden pausarse si el servicio duerme.
- Drive API puede fallar por permisos mal configurados aunque la app funcione.
- `GOOGLE_SERVICE_ACCOUNT_JSON` debe guardarse como secreto server-side y nunca exponerse como `NEXT_PUBLIC_`.

## Cloudflare R2

El bucket debe ser privado. No configurar assets públicos para materiales internos de SUQUIA.

La aplicación usa:

- PUT presignado corto para upload directo `browser → R2`;
- GET presignado temporal para lectura;
- HEAD para confirmar existencia, tamaño y content type;
- DELETE para limpieza de objetos `pending/...` cuando corresponda.

`R2_ENDPOINT` tiene la forma:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

### CORS requerido

Development debe permitir:

- `http://localhost:3000`;
- el origen LAN usado para Visual Review en iPhone, por ejemplo `http://192.168.0.177:3000`.

Production debe permitir solo el dominio final de SUQUIA.

Métodos mínimos:

- `PUT`;
- `GET`;
- `HEAD`.

Headers mínimos:

- `Content-Type`.

Ejemplo conceptual:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://192.168.0.177:3000"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

No usar wildcard de origins en producción.

## Referencias oficiales verificadas

- Render deploy Next.js: https://render.com/docs/deploy-nextjs-app
- Render deploy for free: https://render.com/docs/free
- Render Postgres: https://render.com/docs/postgresql
- Render instance types: https://render.com/docs/compute-plans
- Render workspace plans: https://render.com/docs/new-workspace-plans
- Render pricing: https://render.com/pricing
