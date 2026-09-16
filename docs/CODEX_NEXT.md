# CODEX_NEXT

## Estado: PAUSADO — VALIDAR GUIDELINES EN LIVE

El batch `feat: add brand manual guidelines` quedó implementado y revisado.

No implementar nuevas funcionalidades todavía.

Validar en la instancia live:

1. aparece `Guidelines` en la navegación;
2. `/guidelines` abre correctamente;
3. sin manual activo se muestra `Subir manual`;
4. subir el PDF real del manual de marca de SUQUIA funciona contra R2;
5. el manual persiste tras refresh y nuevo login;
6. `Abrir manual` abre el PDF mediante URL firmada;
7. `Reemplazar` permite cargar un nuevo PDF;
8. después del reemplazo solo el nuevo queda visible como vigente;
9. un archivo no-PDF es rechazado con mensaje claro;
10. Entregas, feedback, referencias, versionado y auth siguen funcionando.

Nota: el storage actual mantiene el límite global de 25 MB por archivo. Si el manual real supera ese tamaño, registrar el caso antes de cambiar el límite.

Si Codex recibe `Ejecutá docs/CODEX_RUN.md` mientras este archivo siga en este estado, debe detenerse sin modificar código, sin ejecutar tests largos, sin commit y sin push.
