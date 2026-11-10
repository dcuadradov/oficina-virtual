# Contacto

Tab del dashboard que mide **quién contactó** a los leads: personas, no intentos. Inventario de negocio en `docs/funcionalidades.md` §15.

## Quién lo ve

Igual que Métricas → Performance. El setter no ve la pestaña.

| `usuarios.puede_ver_todos` | Qué ve |
|----------------------------|--------|
| `false` | Solo intentos con `autor_email` = su correo. |
| `true` | Todo el equipo, selector de comercial y ranking “Por quien contactó”. |

El comercial del filtro es quien registró la llamada o el mensaje, no el dueño del lead.

## De dónde salen los números

Siglas en `comentarios.llamada` / `comentarios.mensaje` (LNC. LC. LA. / MNC. MC. MA.). Si el recordatorio no dejó un comentario con sigla a ±60 s y el mismo texto, entra `recordatorios`.

Un seguimiento puede abrir 0, 1 o 2 intentos (llamada, WhatsApp o ambos). El resultado del día por canal no es el último: gana el más cerca del agendamiento (`LA > LC > LNC`, `MA > MC > MNC`).

Hay datos desde el **4 nov 2026**, cuando nacieron las siglas.

## Tablas

Migración: `db/migrations/2026-11-09_contacto_materializado.sql`. Correrla a mano en el SQL Editor de staging y de producción. Después el backfill:

```sql
select public.fn_contacto_materializar(
  '2026-11-04',
  (timezone('America/Bogota', now()))::date
);
```

| Tabla | Grano | Para qué |
|-------|--------|----------|
| `contacto_intento` | cada llamada o mensaje, con hora Colombia | heatmap, cubetas, re-rankeo al filtrar comercial |
| `contacto_diario` | persona × día × canal | referencia materializada; el front recalcula el diario desde intentos para que el filtro de comercial no use al autor “ganador” global |

RLS: `SELECT` para `authenticated`. El RPC `fn_contacto_materializar(p_desde, p_hasta)` es `security definer` y lo puede ejecutar un usuario logueado (la pestaña lo llama para el día de hoy si el rango lo incluye).

Job `contacto-materializar`: pg_cron `0 5 * * *` (05:00 UTC = medianoche Colombia), últimos 7 días + hoy. Si pg_cron no está activo, el `DO` avisa y hay que materializar a mano.

Ventana de fechas: `p_desde` y `p_hasta` inclusive, en `America/Bogota` (`05:00:00+00` del día → exclusive el día siguiente).

## Front

`src/pages/Dashboard/components/Contacto/`. Las reglas (prioridad, KPIs, barras, cubetas, heatmap, ranking) viven en `contactoReglas.js` y se cubren con `contactoReglas.test.js`.

Filtros independientes de Gestión e Informe. Mes / periodo / día usan `config_meses`. País, ocupación, tags, fuente, género y edad recortan al lead. No hay Creación/Actualización: la fecha es la del contacto.

## Nuevos / En gestión

Dropdown al lado de Todos los días: **Todos** (default), **Nuevos**, **En gestión**. El reloj es `leads.created_at` en `America/Bogota`, no `fecha_asignacion` (esa columna se pisa al reasignar y no nace en todos los leads).

- Nuevos: contactados en el rango y creados en el mismo rango.
- En gestión: contactados en el rango y creados antes.
- Tiempo a contacto (solo en Nuevos): primer seguimiento **después** de `leads.created_at`, con minuto real. Si `intentado_at` viene vacío se lee `comentarios.created_at` / `recordatorios.created_at`. Un intento redondeado a la hora en punto *antes* de crear el lead no cuenta (evita 19:21 → 19:00 = 0 min). Solo entran leads creados entre 9:00 y 21:00 inclusive. Clic en el KPI abre la lista (creación, primer seguimiento, duración), de mayor a menor tiempo. Columna `contacto_intento.intentado_at`: migración `db/migrations/2026-11-10_contacto_intentado_at.sql` y volver a materializar.
