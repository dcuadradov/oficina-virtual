# Guía de Desarrollo - Oficina Virtual MD English

## 🚀 Configuración Inicial

1. Clona el repositorio:
```bash
git clone https://github.com/dcuadradov/oficina-virtual.git
cd oficina-virtual
```

2. Instala las dependencias:
```bash
npm install
```

3. Copia el archivo de variables de entorno:
```bash
cp .env.example .env
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

5. Abre http://localhost:5173 en tu navegador

---

## 🔧 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo local |
| `npm run build` | Compila el proyecto |
| `npm run deploy:staging` | Despliega a staging |
| `npm run deploy:prod` | Despliega a producción |
| `npm run lint` | Ejecuta el linter |

---

## 🌍 Ambientes

| Ambiente | URL | Base de Datos |
|----------|-----|---------------|
| Local | http://localhost:5173 | Staging |
| Staging | https://oficina-virtual-md.web.app | Staging |
| Producción | https://portal.mdenglish.us | Producción |

---

## Protocolo Despliegue

Cómo se cierra y publica trabajo (depurar, probar, documentar, commit, staging **y** prod):

→ [docs/protocolo-despliegue.md](./docs/protocolo-despliegue.md)

Al agente: **«ejecuta el Protocolo Despliegue»**.

---

## Ramas

```
main     → producción (portal.mdenglish.us)
develop  → staging (oficina-virtual-md.web.app)
feat/…   → WIP que todavía no debe salir a staging
```

`develop` es desplegable. Lo que no deba ir al aire no se mezcla en `develop`.

El GitHub Action de Firebase tiene el token vencido: el deploy real es local (`npm run deploy:staging` / `deploy:prod`) y lo hace el **Protocolo Despliegue**.

---

## ⚠️ Reglas Importantes

1. Cerrar trabajo con el **Protocolo Despliegue** (staging y prod, el mismo árbol).
2. **NUNCA** modifiques datos de producción directamente en Supabase.
3. **NUNCA** force-push a `develop` ni a `main`.

---

## 🗄️ Base de Datos

- **Staging**: Para desarrollo y pruebas (puedes crear/borrar datos libremente)
- **Producción**: Datos reales de usuarios (¡cuidado!)

Migraciones SQL versionadas en `db/migrations/`. Aplicarlas manualmente en Supabase
(staging primero) antes de probar features que las requieran.

### Presentación personalizada

Ver [docs/presentacion-personalizada.md](./docs/presentacion-personalizada.md) para
tablas, webhooks, assets y checklist de staging.

---

## 🔑 Credenciales

Las credenciales están en el archivo `.env` (no se sube a Git).
Pide al administrador el archivo `.env` si no lo tienes.

---

## 📞 Contacto

Si tienes dudas, contacta al equipo de desarrollo.

