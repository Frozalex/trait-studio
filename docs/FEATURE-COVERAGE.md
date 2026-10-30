# Périmètre fonctionnel de Trait Studio

Comparaison établie le 30 octobre 2026 à partir de la [fiche officielle Stick Nodes Pro](https://play.google.com/store/apps/details?id=org.fortheloss.sticknodespro&hl=en) et du [site officiel](https://sticknodes.com/). Les mentions de prise en charge ci-dessous décrivent les outils de Trait Studio ; elles ne promettent ni une interface identique, ni la lecture de tout fichier propriétaire, ni une supériorité artistique.

| Usage | Trait Studio | Vérification ou limite |
| --- | --- | --- |
| Créer et articuler un stickman | Créateur de figures, nœuds, segments, IK, étirement et jointures | Modèle natif ; créateur paramétré Élan, Robot et Triangle, essai des articulations et insertion annulable. |
| Animer image par image | Timeline simple, images clés, pelure d’oignon, annuler/rétablir | Tests des brouillons, de l’historique et de la timeline. |
| Interpoler et organiser une scène | Timeline avancée, calques, courbes d’interpolation et clips réutilisables | Six mouvements adaptés aux proportions des modèles Trait ; longueur constante des membres et appuis fixes en déplacement. Pas de transfert automatique sur un squelette arbitraire. |
| Utiliser formes, images et texte | Formes, dégradés, import d’images, texte et dessin | Modules natifs ; aucun contenu du catalogue propriétaire inclus. |
| Caméra et effets | Caméra, zoom, mouvements et effets dont flou/lueur | Tests des caméras, effets et exports. |
| Son | Pistes, montage, volume, mute/solo, fondus et export audio/vidéo | Mixeur local ; scénario de vérification MP4 de 90 secondes avec son. |
| Export vidéo et animation | MP4, WebM, GIF, APNG, séquences d’images ; AVI/WMV sur bureau | Formats annoncés selon les codecs disponibles. Les cinq formats principaux sont décodés en CI. |
| Synchronisation musicale | BPM manuel ou frappé, suggestion du tempo et des basses, repères dans les deux timelines | Analyse indicative limitée à dix minutes ; validation synthétique, correction manuelle possible. |
| Réutiliser des poses | Bibliothèque locale avec vignettes, recherche, renommage et JSON | Même squelette requis pour l’application ; 48 poses et 4 Mo au maximum. |
| Projet éditable | Sauvegarde native, récupération, import de formats pris en charge par le moteur | Les formats propriétaires peuvent évoluer ; compatibilité exhaustive non garantie. |
| Gratuit et modifiable | Sources GPL-3.0-or-later ; pas de publicité ni de filigrane ajouté | Crédits et dépendances conservés ; pas de serveur ni de compte requis. |
| Communauté et catalogue | Bibliothèque personnelle et import local | Le catalogue Stick Nodes et ses milliers de créations ne sont pas reproduits. |
| Plateformes | Application bureau Electron et lancement navigateur depuis les sources | Binaires publiés uniquement pour les systèmes ayant passé les vérifications de la release. Pas d’application Android/iOS ni de support macOS validé. |
| Fonctionnalités propres à Stick Nodes | Pas de promesse de copie intégrale | Pas de convertisseur de skins Minecraft, de boutique ni de services communautaires propriétaires. |

La cible est un studio d’animation libre utilisable sur ordinateur. La qualité d’une animation dépend encore de la mise en scène et du travail des poses. Les clips proposés servent de base modifiable.

## Vérification d’une version

Une release bureau doit passer les audits complets des dépendances npm et Python, le scan antivirus des distributions et de leurs contenus extraits, les tests unitaires, les parcours de l’atelier dans Chromium, la vérification du contenu empaqueté, un démarrage et un redémarrage réels, puis l’export et le décodage des vidéos. Windows ajoute l’installation silencieuse du programme généré et le contrôle de son contenu. La scène longue emploie un son synthétique ; aucune musique privée n’est publiée.

Les captures en mode téléphone vérifient l’agencement dans Chromium. Elles ne certifient pas le fonctionnement sur un téléphone physique. Les essais automatisés sans GPU dédié ne remplacent pas une campagne sur plusieurs matériels.
