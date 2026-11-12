# Oficina Virtual — MD English

Portal interno de comerciales (leads, pitch, presentaciones, recordatorios).

## Setup

```bash
npm install
cp .env.example .env   # pedir credenciales al equipo
npm run dev            # http://localhost:5173
```

Ver flujo Git, ambientes y reglas en [CONTRIBUTING.md](./CONTRIBUTING.md).

Para **cerrar y publicar** un trabajo (depurar, probar, documentar, commit, staging y prod): [Protocolo Despliegue](./docs/protocolo-despliegue.md). Al agente: **«ejecuta el Protocolo Despliegue»**.

## Ambientes

| Ambiente | URL | Deploy |
|----------|-----|--------|
| Local | http://localhost:5173 | `npm run dev` |
| Staging | https://oficina-virtual-md.web.app | `develop` vía Protocolo Despliegue |
| Producción | https://portal.mdenglish.us | `main` vía Protocolo Despliegue |

## Presentación personalizada

Documentación completa (rutas, landing `/propuesta`, migraciones, webhooks, checklist):

→ [docs/presentacion-personalizada.md](./docs/presentacion-personalizada.md)

Entrada: sidebar del lead → **Pitch** → **Presentación**.
Tras generar: el link que se envía al lead es `/propuesta/{version}/{cardId}`.
