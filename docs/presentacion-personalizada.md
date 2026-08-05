# Presentación personalizada (Pitch)

Flujo comercial para armar y generar una presentación personalizada por lead, con borradores, presupuesto, selección de plan, webhooks y resultado público versionado.

## Rutas

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/presentation/:cardId` | Autenticado | Presentación editable |
| `/result/:version/:cardId` | Público | Resultado generado (solo lectura) |

Entrada desde el sidebar del lead → tab **Pitch** → **Presentación**.

## Assets

- Runtime: `public/presentation/` (`manifest.json`, `anim.json`, `Slides/…`)
- Pipeline local (no se sube a Git el media pesado): `presentation-raw/`  
  - Rebuild animaciones: `node presentation-raw/build-anim.mjs`

## Persistencia (draft → Generar)

Mientras se presenta:

- `lead_presentation_data` — formularios (historial, confirmación, embajadores, etc.)
- `lead_presentation_budget` — montos + modalidad de contado
- `lead_presentation_budget_options` — hasta 4 filas (3 alternativas + 1 bajo modalidad)

Todas con `run_id IS NULL` = draft.

Al **Generar**:

1. Se crea `lead_presentation_runs` (versión por `card_id`)
2. Los drafts se asocian con ese `run_id`
3. Webhook: `https://api.mdenglish.us/webhook/envio_presentacion_personalizada`  
   (`card_id`, `result` = `{version}/{card_id}`)

Al **Salir** sin generar: se borran solo drafts (`run_id` null). No se toca `leads` ni runs ya generados.

## Plan de vinculación (slides 31 / 32 / 33)

Catálogo: `lead_presentation_budget_plan_options`.

- Número de plan + Enter rellena la fila
- **Plan 1**: columna Inscripción usa `inscripcion` y cuota mensual muestra "No aplica"
- **Plan 2+**: columna Inscripción usa `cuota_mensual`
- Checkbox de selección única (alternativa, fila extra o modalidad contado)
- Al guardar con cambios: modal de confirmación
- Si hay plan seleccionado: checkbox **Enviar comprobante de pago**  
  → GET `https://api.mdenglish.us/webhook/link_de_pago?card_id=&plan=`

## Navegación lateral (sidebar de recorrido)

Componente: `src/pages/Presentation/SlideNavSidebar.jsx`

- Botón en el borde izquierdo (cerrado por defecto) abre miniaturas del **recorrido visitado** (`path`)
- Solo permite saltar a slides ya recorridos; el contador del header muestra `{posición} / {total}`
- **Saltar atrás no borra el futuro**: si vas del slide 30 al 20, el camino 21–30 se conserva; al avanzar con Continuar se rehace ese tramo o se bifurca si eliges otra opción
- Si hay cambios sin guardar (formularios o plan en embajadores), el salto dispara el modal de guardar
- Mismo sidebar en `/result/:version/:cardId` (solo lectura)
- El panel queda **entre header y footer** para que el último thumbnail sea clicable

## Embajadores (slide 34)

- Si hay plan ya elegido: al Continuar pide guardar y checkbox **Enviar el contrato**  
  → GET `https://api.mdenglish.us/webhook/envio_contrato?card_id=&plan=`
- Si no hay plan pero hay cambios en el form: solo modal de guardar
- Flujo: `34 → 35 → 36 → 37 (end)`

## Migraciones (aplicar en Supabase staging antes de probar)

Orden sugerido:

1. `db/migrations/2026-07-29_lead_presentation_runs.sql`
2. `db/migrations/2026-07-30_lead_presentation_data.sql`
3. `db/migrations/2026-07-30_lead_presentation_data_confirmacion.sql`
4. `db/migrations/2026-08-03_lead_presentation_data_beneficio.sql`
5. `db/migrations/2026-07-30_lead_presentation_budget.sql`
6. `db/migrations/2026-08-03_lead_presentation_budget_plan_options.sql`
7. `db/migrations/2026-08-03_budget_options_selected.sql`

Relacionado (cron recordatorios, no bloquea la presentación):

- `db/migrations/2026-07-31_fix_procesar_recordatorios_vencidos_fallback_comercial.sql`

## Checklist staging

1. Aplicar migraciones en **Supabase staging**
2. Merge / push a `develop` → deploy Firebase staging
3. Abrir https://oficina-virtual-md.web.app
4. Lead → Pitch → Presentación
5. Probar slides 31/32/33 (guardar + link de pago; plan 1 vs plan 2+ en Inscripción)
6. Probar slide 34 (contrato si hay plan)
7. Sidebar: abrir recorrido, saltar atrás/adelante, último slide clicable
8. Generar resultado y abrir `/result/{version}/{cardId}` (sidebar en replay)

## Notas

- Los webhooks de pago/contrato están registrados en n8n como **GET** (no POST).
- Staging usa `.env.staging` / `npm run build:staging`.
