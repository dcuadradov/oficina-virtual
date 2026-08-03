# Oficina Virtual — MD English

Portal interno de comerciales (leads, pitch, presentaciones, recordatorios).

## Setup

```bash
npm install
cp .env.example .env   # pedir credenciales al equipo
npm run dev            # http://localhost:5173
```

Ver flujo Git, ambientes y reglas en [CONTRIBUTING.md](./CONTRIBUTING.md).

## Ambientes

| Ambiente | URL | Deploy |
|----------|-----|--------|
| Local | http://localhost:5173 | `npm run dev` |
| Staging | https://oficina-virtual-md.web.app | push/merge a `develop` |
| Producción | https://portal.mdenglish.us | merge a `main` |

```bash
npm run deploy:staging   # build staging + Firebase hosting:staging
npm run deploy:prod      # solo tras validar staging
```

## Presentación personalizada

Documentación completa (rutas, migraciones, webhooks, checklist):

→ [docs/presentacion-personalizada.md](./docs/presentacion-personalizada.md)

Entrada: sidebar del lead → **Pitch** → **Presentación**.
