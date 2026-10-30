# Premiers pas dans Trait Studio

## Créer un personnage

Ouvre **Atelier → Personnage** et pars du modèle Élan, Robot ou Triangle. Règle la taille, les bras, les jambes, le buste, la tête, les formes et les couleurs. Les points de l’aperçu indiquent les articulations.

**Tester les articulations** ouvre un essai indépendant : déplace les points ou change leur angle, puis reviens à l’atelier. Ces essais ne modifient pas ta scène. **Insérer le personnage** ajoute une figure avec quatre contrôles IK ; **Insérer et retoucher les formes** ouvre le mode Construction pour modifier chaque segment ou polygone. Une seule annulation retire l’insertion complète.

Le modèle choisi est partagé avec l’onglet Mouvements pendant la session. Après réouverture d’un projet, sélectionne un personnage créé avec cet outil et utilise **Reprendre le modèle sélectionné** pour retrouver ses proportions initiales. Les retouches manuelles effectuées ensuite ne sont pas reconstruites par ce bouton.

## Créer un mouvement

Ouvre **Atelier → Mouvements**, choisis un cycle et règle sa durée en images. **Insérer le mouvement** ajoute un clip modifiable à la scène. Ouvre ce clip pour retoucher les poses avec les outils d’articulation. Pour partir d’un squelette sans animation, choisis **Ajouter un personnage**.

Le bouton **Lire/Pause** et le curseur **Image du mouvement** permettent de vérifier les poses. La marche et la course proposent **Avancer dans la scène** : les pieds restent en place pendant leur appui. Ces déplacements se jouent une fois, pour éviter un retour brusque au début. Les cycles sur place bouclent ; le saut se joue une fois. Les longueurs des membres restent constantes, y compris avec des proportions personnalisées.

Les mouvements utilisent les modèles paramétrés de l’atelier. Ils ne se transfèrent pas automatiquement à n’importe quel squelette importé. Chaque image est éditable dans le clip ; les proportions nouvelles s’appliquent aux nouvelles insertions.

Une seconde à 24 images/s correspond à 24 images. Allonger l’exposition d’un clip en boucle le fait continuer ; cela ne crée pas automatiquement de nouvelles poses différentes. Les personnages déjà présents restent dans la scène : déplace ou supprime ceux dont tu n’as pas besoin.

## Réutiliser des poses

Sélectionne un seul personnage articulé, puis ouvre **Mes poses**. Donne un nom à la pose et enregistre-la. Les vignettes, la recherche et **Renommer** permettent de garder une bibliothèque lisible.

**Appliquer** reprend les articulations de la pose sur un personnage de même structure, en conservant son emplacement et son apparence. **Insérer** ajoute un nouveau personnage. Pour capturer une pose à l’intérieur d’un mouvement, entre d’abord dans son clip.

Les poses sont sauvegardées localement et séparément du projet. **Exporter les poses** produit un JSON pour les transférer vers un autre ordinateur ; conserve ce fichier avec tes sauvegardes.

## Caler une animation sur la musique

1. Importe le son depuis le bouton Audio de la timeline.
2. Ouvre **Atelier → Rythme → Analyser le son**. Seules les pistes audibles sont prises en compte.
3. Vérifie la suggestion à l’écoute. **Utiliser la suggestion** enregistre le tempo, le décalage et un repère d’entrée des basses ; Annuler restaure les réglages précédents.
4. Corrige le BPM et le début du rythme si nécessaire, puis choisis **Appliquer la grille**. **Taper le tempo** permet de trouver une pulsation manuellement.
5. Ajoute des repères nommés pour l’introduction, les accents ou les changements de plan. Clique un repère ou un temps dans l’atelier pour déplacer le curseur.

Les traits et drapeaux apparaissent dans la timeline avancée ; la timeline simple affiche un badge sur les images concernées. Un repère placé après la fin de la scène ne l’allonge pas. L’exposition des calques doit couvrir la durée souhaitée.

L’analyse est indicative et limitée aux dix premières minutes. Une chanson peut être ressentie à la moitié ou au double du tempo proposé ; les réglages manuels restent disponibles. Le son ne quitte pas ton appareil.

## Enregistrer et partager

Enregistre d’abord le projet natif pour conserver les calques, clips, figures, sons et repères éditables. Exporte ensuite en MP4 ou dans un autre format proposé par ton installation. Une vidéo exportée ne remplace pas le projet source.

Les téléchargements, le code et les signalements de bugs sont disponibles sur [le dépôt Trait Studio](https://github.com/Frozalex/trait-studio). Le [périmètre fonctionnel](FEATURE-COVERAGE.md) indique aussi les fonctions et plateformes qui ne sont pas couvertes.
