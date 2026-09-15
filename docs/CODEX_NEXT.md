# CODEX_NEXT

## Estado: PAUSADO — SIGUE DEPLOY Y SMOKE TEST REAL

El milestone `feat: prepare live pilot deployment` quedó implementado y revisado.

No implementar nuevas funcionalidades todavía.

Antes de volver a usar Codex:

1. desplegar la app en un entorno público;
2. configurar PostgreSQL;
3. configurar Google OAuth + allowlist;
4. configurar Cloudflare R2 y CORS para el dominio público;
5. mantener Google Drive opcional;
6. ejecutar el smoke test real documentado en `docs/24-live-pilot.md`;
7. registrar blockers reales encontrados durante ese recorrido.

Objetivo: no seguir ampliando producto hasta comprobar que el núcleo funciona live con datos persistentes entre Tomi y una persona colaboradora.

Si Codex recibe `Ejecutá docs/CODEX_RUN.md` mientras este archivo siga en este estado, debe detenerse sin modificar código, sin ejecutar tests largos, sin commit y sin push.
