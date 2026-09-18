# CODEX_NEXT

## Estado: PAUSADO — VALIDAR FIRMA MAGIC PILUSO EN LIVE

El batch `feat: add Magic Piluso creator signature` quedó implementado y revisado.

No implementar nuevas funcionalidades todavía.

Validar en la instancia live:

1. login muestra `Creado por` + logo Magic Piluso debajo del acceso;
2. sidebar desktop muestra la firma en el pie;
3. drawer mobile muestra la firma antes del bloque de usuario;
4. SUQUIA sigue teniendo mayor jerarquía visual;
5. el logo mantiene proporción y transparencia;
6. no aparecen scrolls o saltos de layout innecesarios;
7. login, navegación mobile/desktop y logout siguen funcionando.

Registrar cualquier problema visual observado antes de abrir otra tarea para Codex.

Si Codex recibe `Ejecutá docs/CODEX_RUN.md` mientras este archivo siga en este estado, debe detenerse sin modificar código, sin ejecutar tests largos, sin commit y sin push.
