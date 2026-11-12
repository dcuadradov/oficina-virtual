# Protocolo Despliegue

Nombre que se le dice al agente: **«ejecuta el Protocolo Despliegue»**.

Cierra el trabajo en curso y lo deja igual en local, GitHub, staging y producción. No es un cherry-pick suelto ni un deploy solo a staging.

Orden fijo: **depurar → probar → documentar → commit → publicar staging y prod.**

## 1. Depurar

Antes de probar, el árbol que va a salir tiene que ser el producto, no el taller.

- Quitar lo que se experimentó y **no sirvió**.
- Quitar lo que se **reemplazó** y ya no se usa (archivo viejo, componente duplicado, import muerto, flag temporal).
- No dejar dos implementaciones de lo mismo.
- No meter al commit cache de Firebase, SQL suelto viejo, brochure, ni `s15-a.png`.

## 2. Probar

- Correr `npm test`.
- Si tocó UI, verificar en el navegador el flujo real (no solo un screenshot).
- Si algo falla, se arregla aquí. No se documenta ni se commitea con pruebas rotas.

## 3. Documentar

- Inventario de negocio en `docs/funcionalidades.md` (lenguaje de producto, no de código).
- Si el feature tiene doc propia (`docs/contacto.md`, etc.), actualizarla.
- El commit no sale sin esta nota.

## 4. Commit

- Solo archivos de **este** trabajo.
- Mensaje al estilo del repo: `feat(dashboard): …` / `fix(dashboard): …`, en español, el *por qué*.
- No commit hasta que depurar + pruebas + docs estén listos.

## 5. Publicar (staging y prod, el mismo árbol)

GitHub es la fuente de verdad. Si está en el aire, tiene que estar en git.

| Ambiente | Rama | URL |
|----------|------|-----|
| Staging | `develop` | https://oficina-virtual-md.web.app |
| Producción | `main` | https://portal.mdenglish.us (también https://oficina-virtual-prod.web.app) |

`develop` es desplegable. Lo que no deba salir no vive en `develop`; va en una rama `feat/…`.

### Cómo publicar

1. `git fetch origin`. Local `develop` debe incluir el commit nuevo. Si hay divergencia, merge de `origin/develop` hacia local (en conflicto, gana el trabajo local que se está cerrando). **Nunca force-push.**
2. Push de `develop` con `gh auth switch --user dcuadradov`, luego volver a `ouexperience`.
3. Merge `--no-ff` de `develop` → `main` y push de `main`. Preferir un worktree limpio para no mezclar archivos sucios del working copy.
4. Firebase **desde ese commit limpio** (worktree sin brochure ni untracked de `public/`):
   - `npm ci`
   - `npm run deploy:staging`
   - `npm run deploy:prod`
5. El token de GitHub Actions (`FIREBASE_TOKEN`) está vencido: el deploy real es local, con `firebase login` de `dcuadrado@mdenglish.us`.
6. SQL de Supabase **solo** si este trabajo trae migración nueva y el usuario no dijo que la base ya está al día. Staging primero, después prod.

### Prohibido

- Publicar a Firebase commits que no estén en origin.
- Cherry-pick aislado sobre `origin/develop` para “sacar solo este commit”, salvo que el usuario lo pida **y** lo que ya está vivo en staging/prod esté ya en GitHub. Si no, el sitio se pisa y desaparecen tabs o features que solo estaban en local.
- Staging sin prod, o prod sin staging.
- Saltar depurar, pruebas o docs.

## Listo cuando

Local `develop`, `origin/develop` y `origin/main` tienen el **mismo árbol de archivos**, y staging y prod sirven ese build (Contacto, Mis Pitch, etc. coinciden con local).
