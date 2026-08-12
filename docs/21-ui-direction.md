# Dirección visual de interfaz

## Objetivo

Definir una dirección visual clara para implementar SUQUIA Review Platform sin convertirla en un dashboard SaaS genérico.

La interfaz debe sentirse como **una herramienta editorial y operativa muy bien diseñada**: sobria, precisa, limpia, funcional y con alta densidad de información bien organizada.

## Referencia visual

El screenshot adjunto se usa únicamente como referencia de:

- densidad;
- jerarquía;
- estructura sidebar + topbar + contenido;
- limpieza;
- ritmo de filas;
- bordes finos;
- acciones compactas;
- lenguaje visual editorial.

No copiar marca, logo, contenido, nombres, estructura exacta ni paleta literal.

## Personalidad visual

- Editorial.
- Operativa.
- Precisa.
- Desktop-first.
- Premium sin sentirse lujosa.
- Minimalista sin quedar vacía.
- Neutra, con color reservado para función.
- De lectura rápida, no decorativa.

## Evitar

- Gradientes.
- Estética startup/AI.
- Cards gigantes.
- Exceso de sombras.
- Exceso de colores.
- Backgrounds saturados.
- Ilustraciones decorativas.
- Interfaces excesivamente redondeadas.
- Widgets enormes.
- Métricas de productividad innecesarias.
- Exceso de espacio vacío.

## Color

La interfaz será principalmente neutra.

Base conceptual:

- fondo general blanco roto / gris cálido muy claro;
- superficies blancas o apenas diferenciadas;
- texto principal casi negro;
- texto secundario gris;
- bordes finos;
- acción principal oscura.

El color aparece principalmente por función:

- estado;
- éxito;
- advertencia;
- error;
- Drive conectado/desconectado.

Los colores semánticos deben ser discretos. No depender solamente del color para comunicar estados: acompañar con texto, pequeño indicador o icono cuando aporte claridad.

## Layout general

La aplicación es desktop-first.

Estructura base:

```text
Sidebar izquierda fija
+ Topbar/header
+ Área principal de contenido
```

Sidebar:

- ancho aproximado 220-250 px;
- navegación con icono + label;
- item activo claro;
- navegación principal arriba;
- utilidades/configuración abajo.

Área principal:

- aprovechar el ancho disponible;
- evitar contenedores demasiado angostos;
- spacing consistente;
- grillas precisas;
- contenido alineado;
- densidad alta pero respirable.

## Navegación principal recomendada

- Dashboard
- Entregas
- Guidelines / Knowledge
- Journal
- Configuración

**Recuperar desde Drive** debería comenzar como acción secundaria dentro de Entregas o Configuración, no como sección protagonista, porque su uso es excepcional y operativo.

**AI Memory** no necesita una sección independiente en navegación principal. Debe vivir integrada en **Guidelines / Knowledge**, diferenciada claramente de documentación manual.

## Dashboard

El Dashboard debe responder:

- ¿Qué está pasando?
- ¿Qué tengo que revisar?

Estructura conceptual:

- header con título/contexto simple;
- acción primaria **Subir entrega**;
- entregas para revisar;
- entregas recientes;
- estado de Drive;
- Journal reciente;
- 2-3 aprendizajes de AI Memory.

No usar:

- gráficos;
- porcentajes;
- KPIs;
- métricas de productividad;
- cards enormes.

AI Memory debe ser complementaria, no protagonista.

## Pantalla Entregas

Debe ser la pantalla más cercana al modelo inbox/table/listado operativo.

No usar una card grande por entrega.

Cada fila debería mostrar:

- título generado;
- tipo: Stories / Feed;
- fecha;
- autor;
- estado;
- cantidad de piezas;
- resumen, por ejemplo `5 piezas · 3 OK · 2 necesitan cambios`;
- última actividad.

Zona superior:

- búsqueda;
- filtros compactos;
- acción **Subir entrega**.

Filtros:

- tipo;
- estado;
- fecha;
- usuario.

Jerarquía:

- título de entrega como lectura principal;
- estado y última actividad como señales rápidas;
- metadata secundaria en menor tamaño y menor contraste;
- acciones contextuales visibles al hover o en menú discreto.

Responsive:

- desktop: tabla/listado con columnas;
- tablet: columnas reducidas y metadata agrupada;
- mobile: lista compacta por entrega, no tabla completa.

## Crear entrega

El flujo **Subir entrega** debe sentirse más como preparar un paquete visual que como completar un formulario administrativo.

Estructura recomendada:

- encabezado compacto con tipo Stories / Feed;
- zona principal de archivos con previews;
- controles de orden directamente sobre la lista/grilla;
- nota por pieza cerca de cada preview;
- nota general en panel lateral o sección inferior;
- acción **Enviar** claramente ubicada.

Debe soportar:

1. tipo Stories / Feed;
2. selección múltiple;
3. preview;
4. orden;
5. eliminación antes de enviar;
6. nota por pieza;
7. nota general;
8. enviar.

La atención principal debe estar en los archivos.

## Detalle de entrega

Header:

- nombre generado;
- tipo;
- fecha;
- autor;
- estado;
- acciones de entrega.

Debajo:

- resumen de revisión;
- feedback general;
- grilla de piezas.

La grilla debe priorizar assets:

- thumbnail;
- número/posición;
- estado OK / Necesita cambios;
- versión actual.

No sobrecargar cada thumbnail con metadata.

## Modal de pieza

Mantener la decisión funcional: modal grande inspirado conceptualmente en Instagram Desktop.

Estructura:

```text
Izquierda: preview grande del asset
Derecha: panel de revisión
```

Panel derecho:

- metadata;
- versión;
- estado;
- acciones **OK** y **Necesita cambios**;
- feedback;
- conversación;
- referencias;
- historial de versiones;
- caja de nueva devolución.

Debe permitir:

- siguiente/anterior;
- navegación por thumbnails;
- cambiar versión histórica.

No implementar comparación side-by-side.

Visualmente:

- borde fino;
- fondos neutros;
- jerarquía por espacio y tipografía;
- controles compactos;
- poco ruido.

## Guidelines / Knowledge

Esta pantalla reúne dos fuentes distintas:

### Documentación manual

- Manual de marca.
- Guidelines Stories.
- Guidelines Feed.
- Otros documentos.

### Conocimiento aprendido

- AI Memory.

Deben distinguirse claramente. Nunca hacer parecer que AI Memory forma parte del manual oficial.

AI Memory puede mostrar:

- aprendizaje;
- recurrencia;
- categoría;
- evidencia/fuente;
- fecha;
- link a feedback original.

Navegación recomendada:

- tabs o segmented control: **Guidelines** / **AI Memory**;
- filtros compactos en AI Memory;
- documentos manuales como lista o biblioteca sobria.

## Journal

Journal debe ser timeline/listado compacto.

Priorizar:

- fecha;
- usuario;
- acción;
- entidad.

No duplicar conversaciones. No convertirlo en feed social.

Ejemplo conceptual:

```text
Tomi
Marcó Story 3 como "Necesita cambios"
Hace 12 min

Diseñadora
Subió V2 de Story 3
Hace 4 min
```

## Drive status

El estado de Drive debe estar presente pero no dominar.

Ubicación recomendada:

- topbar derecha como indicador compacto;
- repetir en sidebar inferior solo si aporta visibilidad;
- detalle completo dentro de Configuración o pantalla de recuperación.

Estados:

- Drive conectado
- Verificando
- Problemas de conexión

Debe poder tocarse para ejecutar health check manual.

## Estados visuales

Usar badges discretos.

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

No depender solo del color. Usar texto siempre, y pequeño indicador o icono solo si aporta.

## Principio para implementación futura

Cuando empiece la implementación visual:

- reutilizar patrones;
- evitar CSS ad-hoc por pantalla;
- crear componentes pequeños y composables;
- priorizar consistencia;
- no inventar nuevos patrones sin necesidad;
- no convertir la UI en un template genérico de dashboard.

## Conflictos detectados

No se detectaron contradicciones con la documentación funcional o técnica actual.
