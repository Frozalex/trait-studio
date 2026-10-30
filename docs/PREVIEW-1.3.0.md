Première version publique de **Trait Studio**, un studio d’animation libre et local, dérivé de [StykAnimate](https://github.com/filippocalippo/StykAnimate-App) sous GPL-3.0-or-later.

### L’atelier Trait

- Six mouvements modifiables : course, marche, saut, salut, respiration et moonwalk.
- Personnage Élan avec membres souples et contrôles IK.
- Bibliothèque de poses avec sauvegarde locale persistante et import/export JSON.
- Tempo, décalage d’introduction et repères musicaux enregistrés dans le projet.
- Identité indépendante et absence de connexion aux services amont.

Les outils de dessin, les articulations, les calques, la timeline, l’audio, la caméra, les effets et les exports proviennent du moteur StykAnimate. Les crédits, l’historique Git et la licence sont conservés.

### Installation Linux x86_64

Télécharge le fichier `.AppImage`, rends-le exécutable, puis lance-le. Le fichier `SHA256SUMS.txt` permet de vérifier le téléchargement. Les sources complètes sont disponibles au tag de cette version ; les instructions de lancement local sont dans le README.

### Limites de cette première version

L’atelier est en français. Le tempo se règle manuellement ou par frappe ; la détection automatique des basses n’est pas fournie. Les repères sont visibles dans l’atelier. Aucun binaire Windows, macOS, Android ou iOS n’est publié ici. Cette version ne prétend pas à une parité totale avec Stick Nodes Pro.

La numérotation 1.3.0 poursuit celle de la base technique ; il s’agit de la première édition de Trait Studio.

### Vérifications

La distribution ci-jointe provient du [job Linux réussi](https://github.com/Frozalex/trait-studio/actions/runs/41069441159/job/124109609641) : comparaison du paquet aux sources, démarrage de l’exécutable et de l’AppImage, persistance des poses après relance et export/décodage MP4, WebM, AVI, WMV et GIF. Le [parcours de l’atelier dans Chromium](https://github.com/Frozalex/trait-studio/actions/runs/41069441189) passe également.

Empreinte SHA-256 de l’AppImage : `71526178750bd8b38ab30eb2a1486a10916cafbc3366c219d164bea9efd6518f`.
