# Qué hace el sistema

Inventario de todo lo que se puede hacer en el portal, en lenguaje de negocio. Sirve como primera lectura para alguien que entra al proyecto: primero entender el producto, después el código.

Portal interno del equipo comercial de MD English (programa de inglés para profesionales de la salud). Todo gira alrededor del **lead**: entra, se gestiona, se le agenda un pitch, se le presenta el programa y se le envía una propuesta.

---

## 1. Entrar al sistema

- Se entra con la cuenta de Google corporativa (`@mdenglish.us`); cualquier otro correo queda bloqueado.
- Se puede entrar solo si el usuario está activo y tiene módulos asignados; si no, ve una pantalla de acceso no autorizado.
- Al entrar se elige el módulo con el que se va a trabajar.
- Se puede cerrar sesión desde el inicio o desde el tablero.

Hoy el módulo construido es **Operación Comercial**. En el inicio aparecen también Finanzas y Administración, pero todavía no tienen pantalla.

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
- En **Referido por** se puede escribir para ir filtrando la lista al momento (no distingue mayúsculas ni tildes). Si no hay coincidencias, muestra “Sin resultados”.
- Se puede filtrar por comercial dueño del lead (solo supervisores).
- Se puede filtrar por leads que llegaron con clase de cortesía.
- Se puede filtrar por tipo de gestión de WhatsApp: los que se atienden por Respond.io y los que se atienden desde el WhatsApp del comercial.
- Se puede filtrar por los que tienen novedades sin leer, los que tienen ventana de WhatsApp abierta y los que tienen recordatorio activo.
- Se puede limpiar todos los filtros de un golpe.

---

## 4. La tabla de leads (el día a día)

- Se puede ver todos los leads con su etapa actual y el último seguimiento que les hicieron, sin abrir cada ficha.
- Se puede ordenar por columnas, por ejemplo por fecha de última actualización.
- Se puede filtrar por etapa del embudo con chips agrupados (gestión, pitch, matrícula, etc.).
- Se puede separar los que están sin gestionar de los que ya se gestionaron.
- Se puede ver a qué leads se les puede escribir por WhatsApp, porque el sistema muestra si la ventana de 24 horas sigue abierta y cuánto le queda.
- Se puede marcar un lead como HOT, y filtrar solo por esos.
- Se puede filtrar los que no tienen ningún seguimiento todavía.
- Se puede cambiar la etapa del lead desde la misma fila, y el cambio queda reflejado en Pipefy.
- Se puede abrir la conversación del lead en Respond.io, o crearle el contacto ahí mismo si todavía no existe.
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
- Cuando el lead ya está listo para agendar, aparece un aviso con el link de agenda del comercial asignado.
- Cuando el lead ya tiene pitch agendado, aparece la fecha y el link de la reunión.
- Se puede pedir un resumen del lead hecho con inteligencia artificial, y volverlo a generar cuando haya información nueva.
- Al abrir la ficha, el lead queda marcado como revisado automáticamente.

---

## 6. Seguimientos

- Se puede ver todo el historial de seguimientos como una conversación, de lo más nuevo a lo más viejo.
- Se puede filtrar los seguimientos por categoría.
- Se puede escribir un seguimiento nuevo eligiendo categoría y escribiendo el detalle.
- Cada seguimiento que se escribe en el portal también queda registrado en Respond.io, para que quien atienda el chat lo vea.
- Los seguimientos quedan marcados según de dónde salieron: gestión normal, resultado de pitch o recordatorio.

---

## 7. Recordatorios que programa el comercial

- Se puede programar un recordatorio para volver a contactar al lead, con fecha, hora y una nota del motivo.
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
- Se puede ver esos motivos en torta y también su tendencia en el tiempo.

**Conversión**

- Se puede ver el embudo de conversión etapa por etapa, y abrir cualquier etapa para ver el detalle por comercial.
- Se puede ver cuántas matrículas hubo en el periodo, quién es el mejor y el peor convertidor, y cuánto se demora en promedio un lead en llegar a matrícula.
- Se puede comparar cuántos leads se le asignaron a cada comercial en el periodo.

---

## 14. Informes mensuales

Solo supervisores. Se elige un mes y cada informe compara contra años anteriores.

- Leads creados en el mes.
- Fuentes de donde vienen los leads.
- Cómo se repartieron los leads entre comerciales.
- Leads por país, día por día.
- Pitches por país.
- Matrículas por país.
- Leads por ocupación, día por día.
- Matrículas del mes, en histórico.
- Matrículas por ocupación.

---

## 15. Quién ve qué

| Rol | Alcance |
|-----|---------|
| Comercial | Solo sus leads. Sus propias métricas de conversión. |
| Setter | Solo las etapas que le corresponden. En la agenda de pitch, los que él mismo agendó. Sin métricas ni informes. |
| Supervisor | Todos los leads, filtro por comercial, asignaciones del equipo e informes mensuales. Puede definir las fechas de inicio y fin de un mes comercial. |

---

## 16. Con qué se conecta

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

## 17. Dos cosas que conviene saber desde el principio

**Casi toda la configuración vive en la base, no en el código.** Formularios, etapas, tags, tipos de notificación y catálogo de planes salen de tablas de configuración. Por eso una funcionalidad puede "no aparecer" o "no hacer nada" en un ambiente solo porque falta una fila, sin que haya ningún error en el código.

**El portal casi no manda mensajes por sí mismo.** Avisos al lead, cambios de etapa y recordatorios pasan por automatizaciones externas. Si algo no llegó, el problema puede estar del otro lado y no en la app.

---

## 18. Lo que no existe hoy

- Exportar leads, métricas o informes a Excel, CSV o PDF.
- Chat de WhatsApp dentro del portal (solo se abre Respond.io por fuera).
- Administrar usuarios, roles, etapas o formularios desde la interfaz (se hace directo en la base).
- Módulos de Finanzas y Administración.
