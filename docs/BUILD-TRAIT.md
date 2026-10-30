# Construire Trait Studio

Le dépôt contient l’application de bureau et un serveur de développement local. Il ne dépend pas des services publics de StykAnimate. Le démarrage depuis les sources est décrit dans le [README](../README.md).

## Distribution Linux x86_64

La configuration de référence est [le job Linux](../.github/workflows/ci.yml), sur Ubuntu 24.04 avec Node 24.11.0 et Python 3.12.9. Construire les composants natifs sur le système et l’architecture de destination.

```bash
npm ci
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r scripts/requirements-build.txt
npm run build:frame-scan
npm run build:sidecar
npm run verify:sidecar
npm run build:video-encoder
npm run release:prepare
npm run changelog:check
npm run dist:linux -- --x64 --publish never
npm run verify:package
npm run test:boot:packaged
npm run test:export:packaged
```

Les deux derniers tests nécessitent un affichage. Sur un serveur Linux, utiliser `xvfb-run -a` comme dans le workflow. Le test de démarrage vérifie notamment la persistance des poses après fermeture et relance ; le test vidéo exporte un mouvement Trait et décode les fichiers produits.

Le résultat se trouve dans `release/`. Le paquet inclut le codec Python compilé et FFmpeg ; l’utilisateur final n’a pas besoin d’installer Python ou Node.

## Autres systèmes

Les scripts amont et les configurations Electron pour Windows et macOS restent présents. Ils nécessitent une construction native et leurs propres vérifications. La disponibilité de ces scripts ne constitue pas une validation de leurs installateurs pour Trait Studio.

Les anciens workflows de publication amont sont conservés dans `docs/upstream-workflows/` à titre de référence ; ils ne publient rien. Les mises à jour automatiques sont désactivées. Toute distribution de ce fork doit garder la licence GPL, les mentions tierces et l’accès aux sources correspondantes.
