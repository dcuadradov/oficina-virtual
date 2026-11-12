# Qué hace el sistema

Inventario de todo lo que se puede hacer en el portal, en lenguaje de negocio. Sirve como primera lectura para alguien que entra al proyecto: primero entender el producto, después el código.

Portal interno del equipo comercial de MD English (programa de inglés para profesionales de la salud). Todo gira alrededor del **lead**: entra, se gestiona, se le agenda un pitch, se le presenta el programa y se le envía una propuesta.

---

## 1. Entrar al sistema

- Se entra con la cuenta de Google corporativa (`@mdenglish.us`); cualquier otro correo queda bloqueado.
- Se puede entrar solo si el usuario está activo y tiene módulos asignados; si no, ve una pantalla de acceso no autorizado.
- Al entrar se elige el módulo con el que se va a trabajar.
- Se puede cerrar sesión desde el inicio o desde el tablero.

Hoy hay dos módulos construidos: **Operación Comercial** y **CMS Blog página WEB MD**. En el inicio aparecen también Finanzas y Administración, pero todavía no tienen pantalla.

El CMS solo lo ven quienes tienen `modulo_id = cms` en `usuarios_modulos`. Desde ahí se crean y publican los artículos del blog público (mdenglish.us). El sitio público lee solo los publicados; el portal también guarda borradores y pausados.

---

## 2. Crear leads

- Se puede crear un lead a mano, llenando un formulario.
- Se puede cargar muchos leads de una sola vez subiendo un Excel o CSV.
- Se puede elegir entre distintos formularios de creación, según cómo esté configurado el módulo.
- Los campos del formulario no están fijos en el código: se configuran desde la base, así que se pueden agregar o quitar preguntas sin tocar la app.
- Se puede registrar el teléfono con el código de país correspondiente, y el sistema valida que el número tenga la cantidad de dígitos de ese país.

---

## 3. Encontrar leads

- Se puede buscar por nombre, correo, teléfono, país, etapa o ID de tarjeta.
- Se puede filtrar por mes, por semana comercial (martes a lunes) o por un día puntual.
- Se puede elegir si esa fecha corresponde a la creación del lead o a su última actualización.
- Se puede filtrar por fuente, tag, referido y categoría de seguimiento.
- En **Gestión** se puede filtrar por país del lead. Se pueden marcar varios: el lead entra si es de cualquiera de ellos, y ese resultado se sigue combinando con fuente, tag, comercial, fechas y el resto. La lista de países solo muestra los que tienen leads con los demás filtros activos, y al lado de cada uno va cuántos leads son. En el listado se puede escribir para buscar el país (no distingue mayúsculas ni tildes).
- En **Referido por** se puede escribir para ir filtrando la lista al momento (no distingue mayúsculas ni tildes). Si no hay coincidencias, muestra “Sin resultados”.
- Se puede filtrar por comercial dueño del lead (solo supervisores).
- Se puede filtrar por leads que llegaron con clase de cortesía.
- Se puede filtrar por tipo de gestión de WhatsApp: los que se atienden por Respond.io y los que se atienden desde el WhatsApp del comercial.
- Se puede filtrar por los que tienen novedades sin leer, los que tienen ventana de WhatsApp abierta y los que tienen recordatorio activo.
- Se puede limpiar todos los filtros de un golpe.
- Si se baja por la página y el header tapa los filtros, esos mismos filtros se meten en el header para poder cambiarlos sin volver arriba.
- En **Gestión**, el botón **Copiar contactos** abre un recuadro con WhatsApp y correo. Copia todos los leads que cumplen los filtros, no solo la página visible. Junto a cada opción va cuántos hay: el número y el correo pueden no coincidir si a un lead le falta uno de los dos. El correo sale listo para pegar en el campo Para de Gmail. El teléfono sale internacional y pegado, por ejemplo +573173588591. La consulta va de a 1.000 y se detiene a los 15.000 para no recargar el portal.

---

## 4. La tabla de leads (el día a día)

- Se puede ver todos los leads con su etapa actual y el último seguimiento que les hicieron, sin abrir cada ficha. Ese preview usa el mismo detalle que la ficha: categoría, y si hay siglas de mensaje y/o llamada, `(MNC. - LNC.)` delante del texto. Si no cabe, se corta con puntos suspensivos.
- Se puede ordenar por columnas, por ejemplo por fecha de última actualización.
- Se puede filtrar por etapa del embudo con chips agrupados (gestión, pitch, matrícula, etc.).
- Se puede separar los que están sin gestionar de los que ya se gestionaron.
- Se puede ver a qué leads se les puede escribir por WhatsApp, porque el sistema muestra si la ventana de 24 horas sigue abierta y cuánto le queda.
- Se puede marcar un lead como HOT, y filtrar solo por esos.
- Se puede filtrar los que no tienen ningún seguimiento todavía.
- Se puede cambiar la etapa del lead desde la misma fila, y el cambio queda reflejado en Pipefy.
- Se puede abrir la conversación del lead en Respond.io, o crearle el contacto ahí mismo si todavía no existe.
- También se puede abrir el número del lead en WhatsApp Web del comercial (isotipo verde), desde la fila. Si no hay teléfono, el botón no abre nada. Respond.io se queda al lado.
- Se puede indicar si ese lead se gestiona por Respond.io o por el WhatsApp personal del comercial.
- Se puede activar los recordatorios automáticos desde la fila, cuando la etapa lo permite.
- Se puede seleccionar varias filas y marcarlas como leídas o no leídas en bloque.
- Se puede volver a marcar un lead como no revisado, para que no se pierda.
- Se puede compartir el enlace directo a un lead para que otra persona lo abra en su propio portal.
- La tabla se refresca sola cada 30 segundos, así que no hay que recargar para ver lo nuevo.
- Los resultados salen paginados de 50 en 50.

---

## 5. Ficha del lead

- Se puede abrir la ficha completa haciendo clic en la fila, sin salir de la tabla.
- Se puede ver de un vistazo nombre, país, ocupación, tag, etapa y en qué punto del embudo va.
- Se puede corregir el nombre ahí mismo.
- Se puede cambiar la etapa desde la ficha.
- Se puede editar toda la información del lead: contacto, ocupación, motivación, nivel de inglés, especialidad, plan de pago y demás. Igual que en la creación, estos campos se configuran desde la base.
- Se puede reasignar el lead a otro comercial, y al elegir se ve quién está conectado y quién no.
- Se puede copiar los datos del lead al portapapeles.
- Se puede escribirle por WhatsApp desde la ficha, con el contador de la ventana de 24 horas a la vista.
- Desde la ficha también se puede abrir el número del lead en WhatsApp Web del comercial, igual que en la tabla.
- Cuando el lead ya está listo para agendar, aparece un aviso con el link de agenda del comercial asignado.
- Cuando el lead ya tiene pitch agendado, aparece la fecha y el link de la reunión.
- Se puede pedir un resumen del lead hecho con inteligencia artificial, y volverlo a generar cuando haya información nueva.
- Al abrir la ficha, el lead queda marcado como revisado automáticamente.

---

## 6. Seguimientos

- Se puede ver todo el historial de seguimientos como una conversación, de lo más nuevo a lo más viejo.
- Se puede filtrar los seguimientos por categoría.
- Se puede escribir un seguimiento nuevo eligiendo categoría y escribiendo el detalle.
- Al crear un seguimiento hay que marcar el resultado de la llamada (LNC., LC., LA., LNE.) y/o del mensaje de WhatsApp (MC., MNC., MA., MNE.). LNE. y MNE. son número errado. Por defecto vienen MNC. y LNC. Puede ser uno o los dos; sin al menos uno no se guarda.
- Esos resultados quedan en las columnas `llamada` y `mensaje` de `comentarios`. En el historial de la ficha y en la columna de seguimiento de la tabla el Detalle sale como `(MNC. - LNC.)` y después el texto.
- Si el seguimiento nació de un Recordatorio, el Detalle también muestra esas siglas delante de la observación. Se leen de `recordatorios` cuando el comentario no las trae (el disparador de la base suele copiar solo el texto).
- Cada seguimiento que se escribe en el portal también queda registrado en Respond.io, para que quien atienda el chat lo vea.
- Los seguimientos quedan marcados según de dónde salieron: gestión normal, resultado de pitch o recordatorio.

---

## 7. Recordatorios que programa el comercial

- Se puede programar un recordatorio para volver a contactar al lead, con fecha, hora y una nota del motivo.
- Al programarlo también hay que marcar llamada y/o mensaje, igual que en el seguimiento (por defecto MNC. y LNC.). Quedan en `llamada` y `mensaje` de `recordatorios`. El historial de Seguimiento (Detalle) y el historial de Recordatorio las muestran delante del texto / observación, también en recordatorios que ya estaban guardados.
- Al programarlo, el lead queda marcado como gestionado.
- Se puede ver el historial de recordatorios con su estado: programado, vencido o cancelado.
- Se puede ver todos los recordatorios en un calendario, con colores distintos para los vencidos, los de hoy y los que vienen.
- Se puede abrir el lead directamente desde el calendario.

---

## 8. Recordatorios automáticos (Emdi)

- El sistema puede seguir contactando al lead solo, sin que el comercial escriba, cuando el lead está en etapas de maduración (perfilamiento, gestionando, pendiente de agenda).
- Se puede activar esa secuencia desde la tabla o desde la ficha.
- Se puede ver cuánto falta para que salga el próximo mensaje.
- Se puede previsualizar el mensaje exacto que va a recibir el lead, sea WhatsApp o correo.
- Se puede posponer el envío si el comercial ya habló con el lead por otro medio.
- Se puede ver el historial de todo lo que ya se le envió automáticamente, agrupado por etapa.
- Si el lead escribe antes de que salga el mensaje, el envío se reprograma.
- Se puede filtrar en la tabla los leads que tienen esta secuencia activa y los que no.

---

## 9. Pitch: agenda y resultados

- Se puede registrar el resultado del pitch: si asistió o no, y en qué terminó (matrícula, no matrícula, pago pendiente, posible matrícula, reprobado, interés futuro).
- Se puede registrar una reprogramación con su motivo.
- Se puede calificar el trabajo del setter que agendó ese pitch.
- Se puede corregir un resultado ya registrado.
- Al registrar el motivo de una no matrícula, el sistema crea el seguimiento o el recordatorio correspondiente, sin que haya que escribirlo aparte.
- Al registrar el resultado, la etapa del lead se mueve en Pipefy según lo que pasó.
- Si el lead no asistió y no reprogramó, el lead vuelve solo al setter.
- Se puede ver el historial de todos los pitches anteriores de ese lead.
- El lead recibe confirmación cuando queda agendado, y recordatorios antes de la reunión (24 horas, 2 horas y 10 minutos antes).
- Esos recordatorios se cancelan solos si el pitch se reprograma o si el lead cambia de etapa.

---

## 10. Presentación personalizada

Detalle técnico en [presentacion-personalizada.md](./presentacion-personalizada.md).

- Se puede abrir, desde la ficha del lead, una presentación de ventas para acompañar el pitch.
- Se puede recorrer las diapositivas con animaciones, y decidir en el momento si mostrar ejemplos clínicos, hacer los tests o saltarse tramos según cómo va la conversación.
- Se puede volver a cualquier diapositiva ya vista desde un menú lateral.
- Se puede avanzar con el teclado, sin tener que apuntar con el mouse mientras se habla.
- Se puede ir llenando información durante la reunión: historial médico, confirmación clínica, embajadores y datos del lead (nombre, ocupación, edad, nivel de inglés).
- Se puede armar el presupuesto en vivo: valor total, bono y hasta cuatro opciones de plan.
- Se puede traer un plan del catálogo escribiendo su número, y el sistema completa inscripción, meses y cuota.
- Se puede autocompletar la modalidad de contado con un botón, que aplica el descuento Elite o Platinum según sea para una o dos personas.
- Se puede marcar cuál es el plan elegido por el lead.
- Se puede enviar el link de pago del plan elegido desde la misma presentación.
- Se puede enviar el contrato desde la diapositiva de embajadores.
- Todo lo que se llena queda como borrador; si se sale sin generar, se descarta y la próxima vez se arranca limpio.
- Se puede generar el resultado al final, agregando observaciones del asesor (opcionales, hasta 220 caracteres).
- Cada resultado generado queda como una versión numerada, y se puede volver a consultar cualquier versión anterior.

---

## 11. Lo que recibe el lead

- Se puede copiar un link para enviarle al lead una propuesta comercial en página web, con su nombre, sus planes y las observaciones del asesor.
- La propuesta cambia de formato sola según lo que se haya elegido: una versión para pago de contado y otra para las demás opciones de financiación.
- Si no se eligió ningún plan, la propuesta se envía igual, solo sin la sección de precios.
- El lead abre esos links sin necesidad de cuenta ni contraseña.
- Existe también un link para volver a ver la presentación tal como se le mostró en la reunión.

---

## 12. Notificaciones

- Se puede ver un contador de novedades en la campana del encabezado, con sonido cuando llega algo nuevo.
- Se puede recibir aviso cuando se asigna un lead nuevo o cuando le reasignan uno.
- Se puede filtrar las notificaciones por tipo y por si ya se revisaron.
- Se puede marcar varias como revisadas de una sola vez.
- Se puede abrir el lead directamente desde la notificación.
- Se puede seguir cargando notificaciones viejas bajando en la lista.
- El número de novedades también aparece en el título de la pestaña del navegador.

---

## 13. Métricas

**Pitch**

- Se puede ver diez indicadores: efectividad, asistencia, porcentaje de matrícula, no matrícula, pago pendiente, posible matrícula, reprobado, interés futuro, reprogramado y sin reprogramar.
- Se puede ver los pitches en un calendario por día y hora, con color según cómo terminó cada uno.
- Se puede abrir el lead desde cualquier pitch del calendario.
- Se puede cruzar todo eso por profesión, género, edad, ciudad y país.

**Análisis post-pitch**

- Se puede analizar por qué no se cerraron las ventas, entrando en cascada desde la categoría del motivo hasta el detalle.
- Se puede hacer el mismo análisis sobre tres grupos: los que no fueron matrícula, los reprobados y los que sí se matricularon.
- A la derecha hay un solo panel con tres pestañas: Participación (torta), Tendencia (en el tiempo) y Leads (personas distintas que coinciden con el filtro). Lo que se marque en Motivos recorta las tres. Clic en un nombre abre la misma ficha que en Gestión.
- La tendencia usa los mismos cortes que el calendario: día en bloques de 2 horas, periodo por día, mes cada dos días.

**Agendamiento**

- Se puede ver el canal con el que se agendó el pitch (WhatsApp, Llamada, Correo) y filtrarlo.
- A la derecha, el mismo panel de tres pestañas: Participación, Tendencia por canal y Leads. Lo que se marque en Canal recorta las tres. Clic en un nombre abre la ficha del lead.

**Conversión**

- Se puede ver el embudo de conversión etapa por etapa, y abrir cualquier etapa para ver el detalle por comercial.
- Se puede ver cuántas matrículas hubo en el periodo, quién es el mejor y el peor convertidor, y cuánto se demora en promedio un lead en llegar a matrícula.
- Se puede comparar cuántos leads se le asignaron a cada comercial en el periodo.

---

## 14. Informes mensuales

Solo supervisores. Arranca en el mes en curso, ya marcado. Los filtros son independientes de Gestión, pero el mes, el periodo y el día usan la misma lógica: el mes toma el rango comercial configurado en Gestión (`config_meses`), no el mes calendario. Si octubre está parametrizado del 29 de septiembre al 2 de noviembre, Informe cuenta exactamente esas fechas y lo dice debajo del título, por ejemplo «Octubre 2026 cuenta 29 sep 2026 – 2 nov 2026». El periodo es martes a lunes y el día es un día puntual. También se puede filtrar por país (varios), por comercial, por ocupación, por tags (los mismos de Gestión), por fuente (de dónde llegó el lead: el mismo de Gestión y del gráfico de procedencia), por género, por rango de edad y por si la fecha es de creación o de actualización. Todos se concatenan: el lead entra si cumple todos los que estén marcados, y las listas se recortan con lo ya elegido. Si el campo viene vacío aparece como Sin ocupación, Sin tag, Sin fuente, Sin género o Sin dato. Los números de 2024 y 2025 están fijos y no se recortan con esos filtros.

- Leads creados en el mes.
- Fuentes de donde vienen los leads.
- Cómo se repartieron los leads entre comerciales.
- Leads por país, día por día. El % de cada país es su participación sobre el total de leads.
- Sin contacto por país: leads del periodo que hoy están en Sin contacto. El % de cada país es sobre Leads por país.
- Gestionando por país: leads del periodo que hoy están en Gestionando, Pendiente de agenda, Listo para agendar, Agendado, Interés futuro, Reprogramar, Posible matrícula o Pago pendiente. El % de cada país es sobre Leads por país.
- Pitch por país: leads que entraron a Pitch en el periodo (primera vez). El % de cada país es sobre Leads por país.
- Matrícula por país: leads del periodo que hoy están en Matrícula. El % de cada país es sobre Leads por país.
- Descartados por país: leads del periodo que hoy están en Descartado, No se matriculó, Matrícula caída, Dejó de contestar, MINDTAP o Datos de contacto errados. El % de cada país es sobre Leads por país.

De Sin contacto en adelante el % de cada país es sobre Leads por país, no sobre la tabla de arriba. Al lado del % va entre paréntesis cuántos leads de ese país hay en Leads por país, por ejemplo Colombia 101 32.4% (414). Esos porcentajes no suman 100%. Si un país no tiene leads, el % sale como —. Pitch cuenta la primera vez que el lead entró a esa fase en el periodo; Sin contacto, Gestionando, Matrícula y Descartados miran en qué etapa está hoy.

En esas seis gráficas hay dos pestañas y cambian juntas. **Periodo** es el día a día del mes, periodo o día marcado arriba. **Todos los meses** va de noviembre 2025 hasta hoy: el gráfico es mes a mes, máximo 12 meses (los más recientes), y la lista es el acumulado. Esa pestaña no usa el filtro de mes, periodo o día; país, comercial, ocupación, tags, fuente, género, edad y creación/actualización sí aplican.

En las seis (Leads, Sin contacto, Gestionando, Pitch, Matrícula y Descartados) cada país tiene un checkbox, y arriba está **Todos**. Lo que se marque se combina en una sola serie y las seis gráficas se sincronizan. Un país es su línea; varios se suman. En las de funnel, **Periodo** muestra esa métrica junto a sus leads; **Todos los meses** pone barras de leads y la línea de % sobre esos leads. En Leads por país solo se ve el volumen combinado. La X del país (o desmarcar Todos) vuelve a la vista de siempre.

Si se baja por el Informe y el header tapa los filtros, esos mismos filtros se meten en el header para poder cambiarlos sin volver arriba.
- Leads por ocupación, día por día.
- Matrículas del mes, en histórico.
- Matrículas por ocupación.

---

## 15. Contacto

Tab después de Informe. Lo ven comercial y supervisor (como Métricas); el setter no. Si `puede_ver_todos` es true, hay selector de comercial; si es false, solo se ve lo propio. El comercial del filtro es **quién contactó**, no el dueño del lead.

Mide personas, no intentos. Tres seguimientos al mismo lead el mismo día son una persona. Si cada seguimiento fue llamada y mensaje, hay 6 intentos y 3 seguimientos. La fecha es cuándo lo registraron (Colombia), no la fecha programada del recordatorio.

El resultado del día no es el último intento: gana el más cerca del agendamiento. Llamada: LA > LC > LNC > LNE. WhatsApp: MA > MC > MNC > MNE. LNE./MNE. son número errado: salen en un KPI y como cuarto tramo ámbar en las barras de Llamadas y WhatsApp. No cuentan como contestación, efectividad ni “no contestó”, y no entran al heatmap ni a las cubetas. Contestación y efectividad se calculan sin quienes solo tuvieron número errado.

Los números salen de `comentarios.llamada` / `comentarios.mensaje`. Si el recordatorio no dejó comentario con sigla, se usa `recordatorios`. Un job a medianoche Colombia (`fn_contacto_materializar`, pg_cron 05:00 UTC) arma `contacto_intento` (cada intento con hora) y `contacto_diario` (la persona del día). Hay datos desde el 4 nov 2026, cuando nacieron las siglas.

Arriba: personas contactadas, contestación, efectividad, número errado, agendamientos (personas distintas; si agendó por llamada y WhatsApp cuenta 1) y seguimientos por persona. Luego las barras de llamada y WhatsApp (no contestaron, contestaron, efectivas, número errado), tres cubetas (1 / 2 / 3 o más seguimientos ese día, con su % de contestación) y un heatmap hora × día de la semana. Cada día tiene tres subfilas juntas: Contestaron, Agendaron y No contestaron, para ver si a las 13:00 contestan o solo es la hora en que llaman. Un filete y un fondo suave separan un día del siguiente. Toggle Llamada / WhatsApp / Ambos. El país y el comercial recortan el mapa. Clic en un tramo de Llamadas o WhatsApp abre las personas con las mismas columnas que Tiempo a contacto (creación, primer seguimiento del lead, sigla LNC./MC./etc., tiempo). Clic en una cubeta o una celda abre esas personas.

Los filtros son independientes de Gestión e Informe. Mes, periodo y día usan el rango comercial. País, ocupación, tags, fuente, género y edad recortan al lead. No hay toggle Creación/Actualización: la fecha es la del contacto.

Hay un filtro más, **Todos / Nuevos / En gestión**, al lado de Todos los días. Parte a las personas que se contactaron en el rango según `leads.created_at` (hora Colombia): Nuevos = creados en el mismo rango; En gestión = creados antes. En Nuevos aparece **Tiempo a contacto**: promedio hasta el primer seguimiento **después** de crear el lead, con hora y minuto reales del comentario (si el comentario no trae sigla, se heredan del recordatorio, pero la hora sigue siendo la del comentario). Solo entran leads creados entre las 9:00 y las 21:00 Colombia (un lead de las 2:00 no entra al promedio). Clic en esa tarjeta abre la lista de personas con hora de creación, hora del primer seguimiento (el comentario, no un recordatorio anterior ni el segundo intento), sigla (LNC. LC. LA. LNE. / MNC. MC. MA. MNE.) y cuánto tardó; primero los más lentos. Detalle técnico (tablas, job, backfill) en `docs/contacto.md`.

---

## 16. Quién ve qué

| Rol | Alcance |
|-----|---------|
| Comercial | Solo sus leads. Sus propias métricas de conversión y su propia contactación. |
| Setter | Solo las etapas que le corresponden. En la agenda de pitch, los que él mismo agendó. Sin métricas, informes ni Contacto. |
| Supervisor | Todos los leads, filtro por comercial, asignaciones del equipo, informes mensuales y Contacto del equipo (quién contactó). Puede definir las fechas de inicio y fin de un mes comercial. |

---

## 17. Con qué se conecta

| Herramienta | Para qué |
|-------------|----------|
| Google | Inicio de sesión. |
| Pipefy | Etapas del lead. El portal las cambia y Pipefy queda sincronizado. |
| Respond.io | Conversaciones de WhatsApp, crear contactos, dejar registrados los seguimientos. |
| WhatsApp | Ventana de 24 horas, recordatorios automáticos y de pitch. |
| n8n | Orquesta todo lo que sale del portal hacia afuera (mensajes, cambios de etapa, resúmenes). |
| Agenda del comercial | Link de booking para que el lead agende, y link de la reunión. |
| Link de pago | Se envía desde la presentación, con el plan elegido. |
| Contrato | Se envía desde la presentación. |
| Inteligencia artificial | Resumen del lead. |

---

## 18. Dos cosas que conviene saber desde el principio

**Casi toda la configuración vive en la base, no en el código.** Formularios, etapas, tags, tipos de notificación y catálogo de planes salen de tablas de configuración. Por eso una funcionalidad puede "no aparecer" o "no hacer nada" en un ambiente solo porque falta una fila, sin que haya ningún error en el código.

**El portal casi no manda mensajes por sí mismo.** Avisos al lead, cambios de etapa y recordatorios pasan por automatizaciones externas. Si algo no llegó, el problema puede estar del otro lado y no en la app.

---

## 19. CMS del blog público

- Se entra desde el inicio, con la tarjeta **CMS Blog página WEB MD**.
- Se puede crear un artículo en borrador y publicarlo cuando esté listo.
- Se puede pausar un artículo publicado (deja de verse en la web) y reanudarlo.
- Se puede buscar por título y filtrar por estado, destacado y novedades.
- Cada artículo tiene banner 16:9 (recomendado 2560×1440), título, subtítulo, categoría, autor, fecha, cuerpo por bloques y marcas de destacado / novedades.
- En el cuerpo se pueden mezclar títulos, subtítulos, párrafos con enlace, listas, media a todo el ancho (16:9) y texto + media cuadrado (1:1).
- Se puede ver el performance de un artículo: visitas totales, últimos 7 y 30 días, únicos y una curva de 30 días.
- El sitio público no se edita desde WordPress: lee los publicados en Supabase. Detalle técnico en `docs/cms-blog.md`.

---

## 20. Lo que no existe hoy

- Exportar leads, métricas o informes a Excel, CSV o PDF.
- Chat de WhatsApp dentro del portal (por fuera se abre Respond.io o WhatsApp Web).
- Administrar usuarios, roles, etapas o formularios desde la interfaz (se hace directo en la base).
- Módulos de Finanzas y Administración.
- El CMS no publica solo: el sitio mdenglish.us tiene que leer las tablas del blog.
