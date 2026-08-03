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

## 📝 Flujo de Trabajo (Git Flow)

### Estructura de Ramas
```
main (producción) ←── Solo código probado y aprobado
  │
  └── develop (staging) ←── Integración de features
        │
        ├── feature/calendario-pitch
        ├── feature/resumen-ia
        └── fix/bug-login
```

### 1. Crear rama para tu tarea
```bash
# Desde develop, crear rama nueva
git checkout develop
git pull origin develop
git checkout -b feature/nombre-del-feature
```

### 2. Desarrollar
```bash
# Programas con hot reload
npm run dev

# Haces commits
git add .
git commit -m "Add: descripción del cambio"
```

### 3. Subir tu rama
```bash
git push origin feature/nombre-del-feature
```

### 4. Crear Pull Request
- En GitHub, crea un PR de `feature/nombre` → `develop`
- Espera revisión de código
- Una vez aprobado, haz merge

### 5. Deploy Automático a Staging
- Al hacer merge a `develop`, se despliega automáticamente a staging
- Prueba en: https://oficina-virtual-md.web.app

### 6. Release a Producción
```bash
# Cuando develop está listo para producción
git checkout main
git pull origin main
git merge develop
git push origin main
```
- Esto dispara deploy automático a producción

---

## ⚠️ Reglas Importantes

1. **NUNCA** hagas `deploy:prod` sin probar en staging primero
2. **NUNCA** modifiques datos de producción directamente en Supabase
3. **SIEMPRE** crea una rama para cada feature/bugfix
4. **SIEMPRE** haz Pull Request para revisar el código antes de merge

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

