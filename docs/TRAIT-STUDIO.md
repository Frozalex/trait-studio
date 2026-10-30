# Trait Studio — architecture des ajouts

Trait Studio est un fork GPL-3.0-or-later de StykAnimate, démarré à partir du commit indiqué dans `UPSTREAM.md`. Le modèle natif, les codecs et les noms internes `styk` restent compatibles. Le nom du produit, ses icônes, son profil local, son protocole et sa publication sont distincts.

## Atelier

Le bouton **Atelier** ouvre trois outils. L’interface est actuellement en français ; les autres parties de l’application conservent les langues disponibles dans la base.

- **Mouvements** : course, marche, saut, salut, respiration, moonwalk. Chaque clip contient huit poses et une fermeture de cycle, sous forme de données natives. Durée de 8 à 600 images, cinq couleurs, direction inversable, segments courbes facultatifs. Le saut se lit une fois ; les autres clips bouclent. L’insertion étend le calque si nécessaire et constitue une seule opération annulable. Double-cliquer le clip permet de modifier son contenu avec les outils habituels.
- **Mes poses** : jusqu’à 48 poses avec vignettes, recherche et renommage, sauvegardées localement, exportables et importables en JSON. L’application d’une pose exige la même topologie et conserve l’emplacement, l’échelle et l’apparence du personnage cible. Les cibles IK sont déplacées avec lui. Le navigateur utilise son stockage local ; l’application bureau écrit atomiquement dans son profil natif pour survivre aux redémarrages. La bibliothèque est distincte des projets : exporter les poses sert à les transférer vers un autre poste.
- **Rythme** : tempo de 20 à 300 BPM, frappe du tempo, décalage de l’introduction, mesure de 1 à 12 temps et 256 repères nommés au maximum. Les positions sont calculées à partir du temps absolu, puis arrondies à l’image, sans accumulation d’erreur. Les réglages et les repères se sauvegardent dans le projet et s’annulent. Une analyse locale du mix audible suggère un tempo entre 60 et 200 BPM et une arrivée des basses. Elle traite jusqu’aux dix premières minutes, ignore les pistes muettes et reste annulable. La suggestion est appliquée explicitement ; un rythme irrégulier ou une production complexe peut nécessiter une correction manuelle.

Les temps et repères apparaissent aussi sur la règle avancée et les vignettes de la timeline simple. Les repères de la règle donnent leur nom au survol ; ceux de l’atelier permettent de déplacer précisément le curseur. Leur visibilité se règle dans Rythme. Un repère au-delà de la fin de la scène ne l’allonge pas automatiquement.

## Répartition

| Module | Responsabilité |
| --- | --- |
| `src/trait/motions.mjs` | Poses originales et conversion vers les clips natifs. |
| `src/trait/poses.mjs` | Capture, validation, bibliothèque et application des poses. |
| `src/trait/rhythm.mjs` | Calcul des temps, repères, métadonnées et historique. |
| `src/trait/audio-analysis.mjs` | Enveloppes audio, suggestions de tempo et basses ; blocs PCM d’une seconde dans le worker audio existant. |
| `src/trait/timeline-rhythm.mjs` | Repères et temps calculés seulement pour la plage visible. |
| `src/trait/studio.mjs` | Interface de l’atelier, aperçu avec le moteur natif, intégration des commandes. |
| `tests/trait-studio.test.mjs` | Géométrie, durées, insertion atomique, poses, persistance et rythme. |
| `tests/trait-studio.browser.mjs` | Parcours utilisateur dans le navigateur et redémarrage. |

La géométrie, l’historique, la sauvegarde, les clips, les articulations et le rendu restent possédés par leurs modules existants. Les ajouts ne constituent pas un deuxième moteur d’animation.

## Services

La télémétrie distante est désactivée et aucun service de communauté amont n’est connecté. Les mises à jour automatiques amont sont désactivées : les téléchargements de Trait Studio passent par son dépôt GitHub. Les bibliothèques locales, l’import de fichiers et l’export restent disponibles.

## Priorités suivantes

1. Évaluation artistique et amélioration des mouvements, avec références de poses et contrôles d’appuis.
2. Traduction de l’atelier et commandes de rythme au clavier.
3. Validation sur appareils tactiles physiques et davantage de cartes graphiques ; optimisation seulement après mesure.
4. macOS et applications mobiles natives : plateformes non distribuées pour le moment.

Cette liste ne décrit pas des fonctions déjà livrées.
