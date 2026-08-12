# Foundations de diseño

## Objetivo

Definir bases visuales y de interacción para futuras implementaciones sin escribir componentes, CSS ni elegir valores definitivos innecesarios.

La UI debe ser consistente, compacta, editorial y operativa.

## Color roles

### Neutros

- **Background app**: blanco roto / gris cálido muy claro.
- **Surface primary**: blanco.
- **Surface secondary**: neutro apenas diferenciado.
- **Border subtle**: borde fino de bajo contraste.
- **Text primary**: casi negro.
- **Text secondary**: gris medio.
- **Text muted**: gris claro legible.

### Acción

- **Primary action**: fondo oscuro, texto claro.
- **Secondary action**: outline neutro.
- **Tertiary action**: ghost/text.
- **Danger**: reservado para acciones destructivas.

### Semánticos

- **Success**: OK / Drive conectado.
- **Warning**: requiere atención.
- **Error**: fallo / problemas de conexión.
- **Info/processing**: verificando / sincronizando.

Los colores semánticos deben ser discretos. Siempre acompañar estados con texto.

## Tipografía

Usar sans serif moderna, neutra y legible. No elegir fuente final si implica dependencia externa prematura.

Escala conceptual:

- labels: 11-12 px;
- UI/body: 13-14 px;
- subtítulos: 15-18 px;
- títulos: 20-28 px.

Reglas:

- evitar headings gigantes;
- usar peso, espacio y contraste antes que tamaño excesivo;
- metadata secundaria en menor tamaño y menor contraste;
- labels breves, consistentes y escaneables.

## Spacing

Usar escala basada en múltiplos de 4:

- 4: separación mínima;
- 8: separación compacta;
- 12: separación interna habitual;
- 16: separación de grupos;
- 24: separación de secciones;
- 32: separación amplia;
- 48: solo para bloques mayores.

La plataforma debe tener aire sin desperdiciar espacio.

## Radius

- Controles pequeños: 6-8 px.
- Cards/superficies: 8-12 px.
- Modales: 12 px aproximado.
- Badges: radios moderados, no píldoras exageradas salvo que el estado lo pida.

Evitar interfaces excesivamente redondeadas.

## Borders

- Bordes finos como recurso principal de separación.
- Divisores internos para tablas, paneles y listas.
- Preferir bordes a sombras fuertes.

## Elevation

- Shadow mínimo o inexistente.
- Usar elevación solo para modales, popovers o menús flotantes.
- La jerarquía principal debe venir de layout, borde, tipografía y espacio.

## Layout widths

- Sidebar fija: 220-250 px.
- Contenido principal: ancho fluido.
- Evitar max-width demasiado angosto en pantallas operativas.
- Usar contenedores más estrechos solo para auth/configuración si mejora lectura.

## Sidebar

- Icono lineal + label.
- Item activo con fondo claro o borde/indicador discreto.
- Navegación principal arriba.
- Utilidades/configuración abajo.
- Drive status puede aparecer abajo si no compite con topbar.

## Topbar

- Altura compacta.
- Puede contener búsqueda global, acción primaria, Drive status, usuario.
- No sobrecargar con widgets.

## Icon sizes

- Navegación: 16-18 px.
- Botones compactos: 16 px.
- Estados/badges: 12-14 px si se usan.
- Mantener una sola familia de iconos lineales.
- No usar emojis como iconografía.

## Button hierarchy

### Primary

- Fondo oscuro.
- Texto claro.
- Para la acción principal de la zona, especialmente **Subir entrega** o **Enviar**.

### Secondary

- Outline neutro.
- Para acciones importantes no principales.

### Tertiary

- Ghost/text.
- Para acciones contextuales o secundarias.

### Danger

- Reservado para eliminar entrega u otras acciones destructivas.

Evitar múltiples CTA visualmente fuertes en la misma zona.

## Inputs

- Altura compacta.
- Bordes finos.
- Labels claros si el contexto no alcanza.
- Placeholders útiles pero no como única instrucción.
- Filtros como controles compactos.
- Búsqueda en Entregas con presencia clara pero no dominante.

## Badges y status

Delivery:

- Enviado para revisar
- En revisión
- Requiere cambios
- Aprobada
- Cerrada

Piece:

- OK
- Necesita cambios
- neutro/sin revisar si corresponde según decisión futura.

Drive:

- Drive conectado
- Verificando
- Problemas de conexión

Reglas:

- texto obligatorio;
- color discreto;
- indicador pequeño opcional;
- no depender solo del color;
- mantener tamaños compactos.

## Tables y listados

- Filas compactas.
- Divisores finos.
- Header de columnas claro.
- Metadata secundaria pequeña.
- Acciones contextuales discretas.
- Hover sutil.
- En mobile, degradar a lista resumida.

La pantalla Entregas debe usar este patrón, no cards grandes por entrega.

## Thumbnails

- Priorizar asset visual.
- Mostrar número/posición.
- Mostrar estado y versión actual.
- No saturar con metadata.
- Mantener proporciones estables según tipo Stories/Feed.
- Estados deben ser visibles sin tapar la pieza.

## Modal principles

- Modal de pieza grande.
- Preview a la izquierda.
- Panel de revisión a la derecha.
- Navegación siguiente/anterior.
- Historial de versiones accesible.
- Borde fino y fondos neutros.
- Controles compactos.
- Sin comparación side-by-side en MVP.

## Empty states

- Sobrios.
- Sin ilustraciones decorativas.
- Explicar qué falta y cuál es la acción principal si corresponde.
- No exagerar tono ni marketing.

Ejemplos:

- sin entregas: invitar a **Subir entrega**;
- sin AI Memory: indicar que aparecerá cuando exista feedback de Tomi procesado;
- sin eliminadas: indicar que no hay entregas recuperables.

## Loading

- Skeletons compactos.
- Mantener estructura de la pantalla.
- Evitar spinners grandes como elemento central salvo en acciones puntuales.
- No bloquear secciones que sí pueden mostrarse.

## Errors

- Claros y localizados.
- Explicar qué falló y qué puede hacer el usuario.
- Para Drive/sync, mostrar **Reintentar** cuando corresponda.
- No perder datos ingresados.
- No usar color rojo como única señal.

## Densidad

La densidad debe parecer editorial, no apretada:

- filas compactas;
- paddings consistentes;
- alineación precisa;
- grupos bien separados;
- información secundaria reducida;
- acciones visibles sin dominar.

## Principio para implementación futura

- Reutilizar patrones.
- Evitar CSS ad-hoc por pantalla.
- Crear componentes pequeños y composables.
- Priorizar consistencia.
- No inventar nuevos patrones sin necesidad.
- No convertir la UI en un template genérico de dashboard.

## Pendientes visuales

- Fuente final si se decide usar una dependencia externa.
- Valores definitivos de paleta.
- Icon set final.
- Breakpoints exactos.
- Microcopy final de estados y filtros, pendiente también en documentación funcional.
