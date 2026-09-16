# CODEX_NEXT

## Tarea actual — Pulido de review detectado en Live Pilot

El smoke test real ya validó login, PostgreSQL, R2, creación de Delivery, feedback, referencias, versionado y review state. Este batch contiene solo tres ajustes UX observados en uso real.

No cambiar modelo de datos, reglas de versionado, endpoints, R2, PostgreSQL, auth, Drive ni estados canónicos.

### 1. Hacer evidente el historial de versiones sin multiplicar cards

La grilla debe seguir mostrando **una sola card por Piece**, siempre con la última versión como preview.

El comportamiento actual ya es conceptualmente correcto: una Piece con V2 no debe crear otra card para V1. El problema es de claridad visual.

Ajustar `PieceCard` para que, cuando una pieza tenga más de una versión, el indicador de versión comunique también el historial.

Ejemplos:

- una sola versión: `V1`
- dos versiones: `V2 · 2 versiones`
- tres versiones: `V3 · 3 versiones`

No mostrar versiones históricas como cards independientes. El historial completo sigue viviendo dentro del modal en `Versiones`.

Si ayuda a la legibilidad, se puede usar un icono sutil de stack/history junto al count, sin agregar ruido visual.

### 2. Mover el cierre del modal al panel derecho en desktop

En desktop, la X actual está arriba a la derecha del área de imagen y resulta difícil de encontrar.

Mover el control `Cerrar revisión` al header del panel derecho de información/review.

- Debe quedar claramente visible arriba a la derecha del panel.
- Puede convivir con el badge de estado en un pequeño grupo de acciones.
- Mantener `Escape` para cerrar.
- Mantener cierre mobile actual en su header.
- No perder focus trap ni accesibilidad.
- Eliminar la X desktop del área de preview para no duplicar controles.

### 3. Estado seleccionado de `Necesita cambios` más visible

Cuando `OK` está seleccionado se entiende por el tratamiento verde. `Necesita cambios` debe tener un tratamiento equivalente en amarillo/ámbar.

Para `reviewState === NEEDS_CHANGES` usar un borde/outline ámbar claramente perceptible, además del fondo suave y texto actual. Evitar que las clases base de `Button secondary` anulen visualmente el borde seleccionado.

Mantener simetría con `OK`: seleccionado debe leerse de inmediato, no solo depender del badge superior.

No cambiar comportamiento ni colores semánticos generales.

### Criterio de aceptación

En una Delivery real o Visual Review:

1. una Piece con V2 sigue ocupando una sola card en la grilla;
2. esa card muestra claramente `V2 · 2 versiones`;
3. abrirla muestra el historial V1/V2 dentro de `Versiones`;
4. en desktop la X está arriba a la derecha del panel de información y ya no sobre la imagen;
5. seleccionar `Necesita cambios` deja el botón con borde/outline ámbar claramente visible;
6. seleccionar `OK` conserva su tratamiento verde;
7. mobile, navegación anterior/siguiente, Escape, feedback y versionado siguen funcionando.

### Validaciones

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

### Commit

`fix: polish live review version and state cues`

Push a `main` y detenerse.
