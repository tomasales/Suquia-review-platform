# SUQUIA Review Platform

Repositorio base para documentar y, más adelante, desarrollar una plataforma interna de revisión de piezas creativas para SUQUIA.

## Qué es

La plataforma busca ordenar el proceso de entrega, revisión, devolución, versionado y aprendizaje sobre piezas creativas de SUQUIA.

Debe funcionar como una memoria operativa del proceso de diseño:

**Entrega -> revisión -> feedback -> conversación -> nueva versión -> aprobación -> aprendizaje.**

## Problema que resuelve

Hoy gran parte de las entregas y devoluciones ocurre por WhatsApp. Eso hace que el feedback se pierda, que se repitan correcciones y que no exista una memoria estructurada del criterio de diseño aplicado en el tiempo.

La plataforma no busca ser Jira ni una herramienta compleja de project management. Debe ser simple, flexible y requerir la menor cantidad posible de administración manual.

## Estado actual

**Implementación iniciada.**

Este repositorio contiene documentación funcional, arquitectura técnica, shell visual en Next.js, autenticación, modelo PostgreSQL, fundación de storage en Cloudflare R2 y el primer flujo real de creación de Delivery.

## Desarrollo local

```bash
npm install
npm run dev
```

La aplicación local queda disponible en `http://localhost:3000`.

Para modo real hacen falta, como mínimo:

- `DATABASE_URL`
- credenciales Google OAuth/Auth.js
- variables Cloudflare R2
- variables Google Drive para backup server-side
- `DELIVERY_UPLOAD_SECRET`

Variables R2:

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
DELIVERY_UPLOAD_SECRET=
```

Variables Drive:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=
DRIVE_ROOT_FOLDER_ID=
DRIVE_STORIES_FOLDER_ID=
DRIVE_FEED_FOLDER_ID=
DRIVE_SHARED_DRIVE_ID=
```

El flujo real de **Nueva entrega** prepara IDs definitivos, emite un receipt firmado temporal, sube piezas directo desde el navegador a R2 con URLs firmadas, verifica los objetos, crea Delivery/Pieces/PieceVersion V1 en PostgreSQL, registra Journal y deja una SyncOperation pendiente para el backup en Drive.

El motor backend de Drive procesa esa SyncOperation en segundo plano desde el runtime de la app: verifica Drive periódicamente mientras la app está abierta, procesa de forma oportunista un backup `PENDING` por trigger y deja los `FAILED` para reintento manual. Drive nunca bloquea la creación de una Delivery si PostgreSQL y R2 quedaron consistentes.

## Visual review local

Para revisar la interfaz sin PostgreSQL ni Google OAuth configurados:

```bash
cp .env.example .env.local
```

En `.env.local`, definir:

```bash
SUQUIA_VISUAL_REVIEW=1
```

Luego:

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

Este modo usa un usuario ficticio y fixtures in-memory solo en development. No persiste datos, no crea usuarios en Prisma y no debe usarse para validar lógica real.

## Organización de `/docs`

- `00-product-overview.md`: visión general, problema, conceptos y principios.
- `01-users-and-access.md`: usuarios, login, permisos iniciales y Dirección.
- `02-deliveries.md`: entregas, tipos, creación, estados y eliminación.
- `03-pieces-and-versions.md`: piezas, orden, revisión y versionado.
- `04-feedback.md`: feedback general, por pieza, conversaciones y referencias.
- `05-journal.md`: registro automático de eventos del sistema.
- `06-guidelines.md`: biblioteca manual de documentación estática.
- `07-ai-memory.md`: memoria estructurada generada desde feedback histórico.
- `08-google-drive.md`: backup, estructura conceptual y restauración desde Drive.
- `09-errors-and-recovery.md`: fallos, pendientes técnicos, reintentos y emails críticos.
- `10-search.md`: búsqueda global y filtros básicos.
- `11-dashboard.md`: dashboard simple y superficies principales.
- `12-mvp-scope.md`: alcance del MVP y exclusiones explícitas.
- `13-open-decisions.md`: decisiones pendientes y ambigüedades conocidas.

## Instrucción para futuros agentes/Codex

Antes de implementar una funcionalidad, leer su documentación correspondiente. No asumir comportamiento no documentado. Consultar `docs/13-open-decisions.md` cuando exista una ambigüedad.
