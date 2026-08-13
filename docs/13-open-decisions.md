# Pendientes de definición

Este documento concentra decisiones abiertas. No resolver estos puntos sin definición explícita.

## Producto y UX

- Nombres definitivos de estados y microcopy.
- Si más adelante se registra también el estado **Publicado**.
- Política de archivado además de eliminación.
- UI exacta de restauración desde Drive.
- Definir si Stories y Feed comparten exactamente el mismo criterio de aprobación/publicación o si existen diferencias operativas. Anteriormente se contempló que Feed no se publique hasta tener todo aprobado y que Stories podrían tolerar observaciones menores salvo que exista un cambio bloqueante, pero esto no está confirmado como regla final.

## Archivos y contenido

- Formatos de archivo admitidos.
- Límites de tamaño de archivos.
- Comportamiento exacto de gestión/subida/reemplazo de Guidelines.
- Convención final de nombres de carpetas/archivos en Drive.

## Usuarios y permisos

- Quién administra Guidelines cuando más adelante existan roles.
- Detalle final de acceso de Dirección si se decide limitarlo en el futuro.
- Soporte futuro multi-cliente/workspaces.

## Dirección

- Si Dirección puede ver el feedback de Tomi además de su propia sección.
- Si la validación de Dirección ocurre por pieza, por entrega o puede soportar ambos niveles.
- Si en el futuro Dirección tendrá acceso completo o un acceso limitado a entregas compartidas.

## IA

- Proveedor definitivo del LLM.
- Esquema definitivo de AI Memory.

## Operación y recuperación

- Frecuencia/configuración final del health check de Drive.
- Qué errores son considerados graves para disparar email.
- Estrategia de limpieza para objetos R2 con keys definitivas que fueron preparados/subidos pero nunca finalizaron en PostgreSQL por cierre del navegador, pérdida de conexión o abandono del flujo.

## Restauración

- En qué estado vuelve una entrega restaurada desde Drive.

## Búsqueda

- Si los eventos del Journal también deben formar parte de la búsqueda global.

## Pendientes adicionales detectados al documentar

- Cómo se representan internamente los borradores/pendientes técnicos ante fallos.
- Alcance exacto de búsqueda sobre archivos adjuntos o contenido visual.
