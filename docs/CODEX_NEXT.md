# CODEX_NEXT

## Estado: PAUSADO — VALIDAR LIVE PILOT

El batch `fix: polish live review version and state cues` quedó implementado y revisado.

No implementar nuevas funcionalidades todavía.

Validar en la instancia live:

1. una Piece con V2 sigue ocupando una sola card;
2. la card muestra `V2 · 2 versiones`;
3. el historial V1/V2 sigue accesible dentro del modal;
4. en desktop la X está en el header del panel derecho;
5. `Necesita cambios` seleccionado muestra borde/outline ámbar visible;
6. `OK` conserva su tratamiento verde;
7. feedback, referencias, versionado, navegación y persistencia siguen funcionando.

Registrar cualquier problema observado en uso real antes de volver a abrir una tarea para Codex.

Si Codex recibe `Ejecutá docs/CODEX_RUN.md` mientras este archivo siga en este estado, debe detenerse sin modificar código, sin ejecutar tests largos, sin commit y sin push.
