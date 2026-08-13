# CODEX_RUN

Este archivo es el punto de entrada estable para ejecutar la próxima tarea de Codex.

Cuando Tomi diga algo como:

> ejecutá CODEX_RUN.md

seguir SIEMPRE este orden:

1. Revisar `git status`.
2. Si hay cambios locales no commiteados que puedan perderse o entrar en conflicto, NO descartarlos ni inventar una resolución. Reportar el bloqueo y detenerse.
3. Ejecutar:

```bash
git fetch origin
git pull --ff-only origin main
```

4. Si el pull falla por divergencia o conflicto, reportarlo y detenerse. NO usar force push, reset destructivo ni merge automático para resolverlo.
5. Después del pull, abrir de nuevo `docs/CODEX_NEXT.md` desde el working tree actualizado. No usar una copia leída antes del pull.
6. Leer `docs/CODEX_NEXT.md` completo y ejecutar únicamente la tarea actual indicada ahí.
7. Ejecutar las validaciones que pida `CODEX_NEXT.md`.
8. Si la tarea ya estuviera implementada, comprobar que `CODEX_NEXT.md` leído DESPUÉS del pull corresponde realmente a ese trabajo antes de concluir que no hay nada que hacer.
9. Si todo queda correcto, hacer el commit y push indicados por `CODEX_NEXT.md`.
10. Después del push, detenerse. No avanzar a otra tarea por cuenta propia.

`CODEX_RUN.md` no contiene la tarea. La tarea siempre vive en `docs/CODEX_NEXT.md` y debe leerse después de sincronizar `main`.
