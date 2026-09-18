# CODEX_NEXT

## Tarea actual — Firma de Magic Piluso

Agregar una firma visual discreta que indique que SUQUIA Review Platform fue creada por Magic Piluso.

Ya existe el asset oficial en:

`/public/magic-piluso-logo.svg`

Usar ese asset tal cual. No redibujar, reinterpretar ni reemplazar el logo.

## Objetivo

Que Magic Piluso aparezca como creador del sistema sin competir visualmente con la identidad de SUQUIA ni parecer otra sección del producto.

Copy exacto:

`Creado por`

seguido por el logotipo de Magic Piluso.

No usar `Powered by`, `Made by` ni agregar claims.

## Dónde mostrarlo

### 1. Login

En `/login`, debajo del bloque de ingreso:

- centrar una firma pequeña;
- texto `Creado por` en tono muted/subtle;
- logo de Magic Piluso debajo o inmediatamente junto al texto, según quede mejor con la proporción vertical del logo;
- mantener bastante aire respecto del card de login;
- no convertir la firma en CTA;
- no cambiar el flujo ni el copy de autenticación.

Debe sentirse como un crédito al pie, no como co-branding principal.

### 2. Sidebar desktop

En el sidebar fijo de desktop:

- agregar la firma cerca del pie del sidebar;
- separarla del navigation content con aire o divisor sutil;
- usar `Creado por` + logo;
- mantenerla visualmente por debajo de SUQUIA, navegación y estados operativos;
- no hacerla clickable;
- no desplazar ni romper el panel de Drive si está habilitado.

### 3. Sidebar mobile

En el drawer mobile:

- mostrar la misma firma en la zona inferior;
- ubicarla antes del bloque de usuario / cerrar sesión para no interferir con la acción de logout;
- mantenerla compacta;
- respetar safe-area y scroll si la pantalla es baja.

## Componente

Preferir un componente reutilizable, por ejemplo:

`MagicPilusoSignature`

para no duplicar markup/estilos entre login, desktop sidebar y mobile drawer.

El componente debe:

- usar el asset `/magic-piluso-logo.svg`;
- soportar una variante compacta para sidebar y otra ligeramente más aireada para login si hace falta;
- tener texto accesible;
- conservar el fondo transparente del logo;
- no aplicar fondos, cajas, badges ni bordes alrededor del logo.

## Dirección visual

- El logo debe verse claramente, pero pequeño.
- Sidebar: aprox. 42–52 px de alto como referencia visual, ajustable si la proporción lo requiere.
- Login: puede ser algo mayor, aprox. 52–64 px de alto.
- `Creado por`: 10–11 px, muted/subtle, sin uppercase obligatorio.
- Evitar que el bloque parezca una cuarta opción de navegación.
- No agregar colores nuevos.
- Mantener la estética limpia del sistema actual.

## No tocar

No modificar:

- auth;
- permisos;
- Guidelines;
- R2;
- entregas;
- feedback;
- versionado;
- estados;
- DB/schema.

Es un ajuste exclusivamente de branding/UI.

## Criterio de aceptación

1. Login muestra `Creado por` + logo Magic Piluso debajo del acceso.
2. Desktop sidebar muestra la firma en el pie.
3. Mobile drawer muestra la firma antes del bloque de usuario.
4. SUQUIA sigue siendo la marca principal del producto.
5. La firma no compite con navegación ni CTAs.
6. El logo mantiene proporción y transparencia.
7. No aparecen scrolls o saltos de layout innecesarios.
8. Login, navegación mobile/desktop y logout siguen funcionando.

## Validaciones

Ejecutar:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Commit

Si queda correcto:

`feat: add Magic Piluso creator signature`

Push a `main` y detenerse.
