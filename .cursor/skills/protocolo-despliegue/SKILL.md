---
name: protocolo-despliegue
description: >-
  Cierra y publica trabajo de oficina-virtual: depura lo que no sirvió o caducó,
  prueba, documenta, commit, push a develop y main, Firebase staging y prod.
  Usar cuando el usuario dice Protocolo Despliegue, ejecuta el protocolo de
  despliegue, publica, desplegar, deploy, staging, prod, o pedir que suba el
  trabajo actual al aire.
---

# Protocolo Despliegue

Playbook canónico: `docs/protocolo-despliegue.md`.

Si el usuario dice **«ejecuta el Protocolo Despliegue»** (o equivalente), corre **toda** la secuencia sobre el trabajo actual. No preguntes si va a prod: va a staging **y** prod. No hagas cherry-pick aislado.

## Secuencia (no reordenar)

1. **Depurar.** Borrar experimentos que no sirvieron y lo reemplazado que caduca (archivos, componentes, imports, flags). El árbol a publicar es el producto, no el taller.
2. **Probar.** `npm test`. Si hubo cambio de UI, verificar el flujo en el navegador. Si falla, arreglar aquí.
3. **Documentar.** `docs/funcionalidades.md` en lenguaje de negocio. Doc de feature si existe (`docs/contacto.md`, etc.).
4. **Commit.** Solo archivos de este trabajo. Estilo del repo: `feat(dashboard): …` / `fix(dashboard): …`. Nunca `.firebase/`, SQL viejo suelto, `public/brochure/`, `s15-a.png`.
5. **Publicar el mismo árbol a git y al aire.**

## Publicar

- `develop` = staging (https://oficina-virtual-md.web.app). `main` = prod (https://portal.mdenglish.us).
- Fuente de verdad: GitHub. Nada al aire que no esté en origin.
- `git fetch`. Si local y origin divergieron, merge `origin/develop` en local (conflicto: gana el trabajo que se está cerrando). Nunca `--force`.
- Push `develop` con `gh auth switch --user dcuadradov`; al terminar, `gh auth switch --user ouexperience`.
- Merge `--no-ff` `develop` → `main` y push. Usar worktree limpio para no llevar el working copy sucio.
- Firebase desde **ese** commit en worktree limpio (`npm ci`, `npm run deploy:staging`, `npm run deploy:prod`). El `FIREBASE_TOKEN` de Actions está vencido; se usa `firebase login` local (`dcuadrado@mdenglish.us`).
- SQL solo si este trabajo añade migración y el usuario no dijo que la base ya está al día.

## Prohibido

- `firebase deploy` con commits que no están en origin.
- Cherry-pick sobre `origin/develop` para “solo este commit” si en el portal ya hay cosas que solo existen en local: se pisa el sitio.
- Staging sin prod, o al revés.
- Saltar depurar, pruebas o docs.

## Cierre

Confirmar que `HEAD`, `origin/develop` y `origin/main` tienen el mismo árbol, y que staging y prod sirven ese build. Devolver las URLs.
