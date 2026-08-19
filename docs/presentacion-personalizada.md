# Presentación personalizada (Pitch)

Flujo comercial para armar y generar una presentación personalizada por lead, con borradores, presupuesto, selección de plan, webhooks y resultado público versionado.

## Rutas

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/presentation/:cardId` | Autenticado | Presentación editable |
| `/result/:version/:cardId` | Público | Resultado generado (solo lectura del recorrido) |
| `/propuesta/:version/:cardId` | Público | Landing comercial (brochure) enviada al lead |

Entrada desde el sidebar del lead → tab **Pitch** → **Presentación**.

Tras **Generar**, el comercial copia el link de `/propuesta/{version}/{cardId}` (no el de `/result/…`).

Preview local (datos mock): `/propuesta/preview/otras` y `/propuesta/preview/contado`.

## Assets

- Runtime presentación: `public/presentation/` (`manifest.json`, `anim.json`, `Slides/…`)
- Runtime propuesta: `public/brochure/landing-otras-desktop.svg` y `landing-contado-desktop.svg`
- Pipeline local (no se sube a Git el media pesado): `presentation-raw/`  
  - Rebuild animaciones: `node presentation-raw/build-anim.mjs`

La landing renderiza el SVG de Figma a ancho completo y solo inyecta HTML encima de las zonas variables (pago y observaciones).

## Persistencia (draft → Generar)

Mientras se presenta:

- `lead_presentation_data` — formularios (historial, confirmación, embajadores, observaciones, etc.)
- `lead_presentation_budget` — montos + modalidad de contado
- `lead_presentation_budget_options` — hasta 4 filas (3 alternativas + 1 bajo modalidad)

Todas con `run_id IS NULL` = draft.

Al pulsar **Generar resultado**:

1. Modal **Ingresar observaciones (opcional)** — máximo 220 caracteres (incluidos espacios), con contador. Cancelar cierra; Generar continúa.
2. Se crea `lead_presentation_runs` (versión por `card_id`)
3. Los drafts se asocian con ese `run_id` (incluye `observaciones`)
4. Webhook: `https://api.mdenglish.us/webhook/envio_presentacion_personalizada`  
   (`card_id`, `result` = `{version}/{cardId}` de `/result/`, `propuesta` = `{version}/{cardId}` de `/propuesta/`)

**Ya no es obligatorio** seleccionar un plan de pago para generar. Si no hay plan marcado, la landing se genera igual y la sección de pago queda vacía (sin overlays). Si hay modalidad de contado, se usa el SVG de contado; si no, el de otras opciones.

Al **Salir** sin generar: se borran solo drafts (`run_id` null). No se toca `leads` ni runs ya generados.

## Propuesta (landing / brochure)

Componente: `src/pages/Presentation/PropuestaPage.jsx`

- **Otras opciones**: valor total queda en el SVG; overlays de 3 planes + caja “Pago de contado” + observaciones
- **Pago de contado**: overlays de plan seleccionado / descuento / valor final (navy) + observaciones
- **Observaciones de su asesor**: texto de `lead_presentation_data.observaciones`, misma tipografía que el pago (`2.52cqw` Montserrat)

## Navegación ejemplos / tests (slides 16–25)

En `public/presentation/manifest.json`:

| Slide | Opciones |
|-------|----------|
| **s16** | Comodín MFC-MEC → s17; Ejemplos a–d; Tests a–c; **Saltar** → s25 |
| **s17** | Ejemplos a–d; Tests a–c; **Saltar** → s25 |
| **s18–s21** (ejemplos) | Tests a–c; **Saltar** → s25 |
| **s22–s24** (tests) | Siguiente → s25 |

Tests: a → s22, b → s23, c → s24.

## Plan de vinculación (slides 31 / 32 / 33)

Catálogo: `lead_presentation_budget_plan_options`.

- Número de plan + Enter rellena la fila
- **Plan 1**: columna Inscripción usa `inscripcion` y cuota mensual muestra "No aplica"
- **Plan 2+**: columna Inscripción usa `cuota_mensual`
- Checkbox de selección única (alternativa, fila extra o modalidad contado)
- Al guardar con cambios: modal de confirmación
- Si hay plan seleccionado: checkbox **Enviar link de pago**  
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
5. `db/migrations/2026-08-19_lead_presentation_data_observaciones.sql`
6. `db/migrations/2026-07-30_lead_presentation_budget.sql`
7. `db/migrations/2026-08-03_lead_presentation_budget_plan_options.sql`
8. `db/migrations/2026-08-03_budget_options_selected.sql`

Relacionado (cron recordatorios, no bloquea la presentación):

- `db/migrations/2026-07-31_fix_procesar_recordatorios_vencidos_fallback_comercial.sql`

**Nueva en este release:** `2026-08-19_lead_presentation_data_observaciones.sql` (columna `observaciones`). Hay que aplicarla en Supabase staging **antes** de generar propuestas con observaciones.

## Checklist staging

1. Aplicar migraciones en **Supabase staging** (incluida `observaciones`)
2. Merge / push a `develop` → deploy Firebase staging
3. Abrir https://oficina-virtual-md.web.app
4. Lead → Pitch → Presentación
5. Slides 16/17: Ejemplos a–d, Tests a–c, Saltar → 25; s16 también comodín MFC-MEC
6. Slides 18–21: Tests a–c y Saltar → 25
7. Probar slides 31/32/33 (guardar + **Enviar link de pago**; plan 1 vs plan 2+ en Inscripción)
8. Probar slide 34 (contrato si hay plan)
9. Sidebar: abrir recorrido, saltar atrás/adelante, último slide clicable
10. **Generar resultado** sin plan seleccionado → propuesta con pago vacío
11. Generar con observaciones (≤ 220 caracteres) y abrir `/propuesta/{version}/{cardId}`
12. Generar con contado vs otras opciones y verificar overlays + observaciones

## Notas

- Los webhooks de pago/contrato están registrados en n8n como **GET** (no POST).
- Staging usa `.env.staging` / `npm run build:staging`.
- Los SVG de brochure pesan ~12–13 MB cada uno; es esperado (export Figma a paths).
