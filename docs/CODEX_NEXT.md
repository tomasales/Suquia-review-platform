# CODEX_NEXT

## Tarea actual — Preparar Live Pilot MVP

Objetivo: dejar el núcleo actual listo para probarse en una URL pública con datos reales y persistentes entre Tomi y una persona colaboradora.

### Scope

- Mantener el flujo real actual: Google login, Delivery, piezas, review state, feedback con referencias y versionado.
- PostgreSQL + R2 son obligatorios.
- Google Drive debe ser opcional para este primer pilot.
- No implementar AI, ConversationReply, búsqueda, restore, Guidelines management, roles, notificaciones ni métricas en este bloque.

### Readiness de producción

- Agregar script de migración de producción con `prisma migrate deploy`.
- Agregar un `GET /api/health` mínimo que valide conectividad con PostgreSQL y responda 200/503 sin exponer información sensible.
- Documentar el orden de build, migraciones y start para un servidor Node/Next.js.

### Allowlist

Agregar un CLI idempotente para activar un email en `AuthorizedEmail`, reutilizando la normalización existente y permitiendo indicar `isAiLearningSource`. No crear `User` manualmente ni hardcodear emails reales.

### Drive opcional

Si Drive no está configurado, el core debe seguir funcionando y la UI no debe mostrar un estado de error de Drive. Evitar polling/sync innecesario. Si está configurado, conservar el comportamiento actual.

### Navegación del pilot

Ocultar links muertos o superficies todavía no funcionales. Mantener visibles Dashboard y Entregas. No borrar código futuro.

### Runbook

Crear `docs/24-live-pilot.md` con instrucciones concretas para desplegar en Render, configurar PostgreSQL, Google OAuth, R2, variables de entorno, allowlist y un smoke test del flujo real. Drive debe figurar como opcional. No guardar secretos ni emails reales en Git.

### Smoke test esperado

Login allowlisted → crear entrega real → recargar y conservarla → feedback con referencia → subir V2 → marcar V2 OK → salir/entrar y confirmar persistencia. Un usuario no allowlisted no debe poder entrar.

### Validaciones

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Confirmar también que Visual Review local sigue funcionando.

### Commit

`feat: prepare live pilot deployment`

Push a `main` y detenerse.
