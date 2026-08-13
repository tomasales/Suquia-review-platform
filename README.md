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

**Implementación iniciada — Bootstrap técnico.**

Este repositorio contiene documentación funcional, arquitectura técnica y un shell visual inicial en Next.js. Todavía no hay lógica de producto implementada.

## Desarrollo local

```bash
npm install
npm run dev
```

La aplicación local queda disponible en `http://localhost:3000`.

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
