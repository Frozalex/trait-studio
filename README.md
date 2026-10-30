# Trait Studio

**Un studio d’animation de stickmen, libre et local.** Crée des personnages, anime leurs articulations, travaille avec l’audio et exporte tes scènes sans abonnement.

Trait Studio est une version indépendante de [StykAnimate](https://github.com/filippocalippo/StykAnimate-App), publiée sous **GPL-3.0-or-later**. Le moteur et les fonctions de base viennent de ce projet ; nos ajouts sont décrits ci-dessous. Voir [les crédits](UPSTREAM.md), [la licence](LICENSE) et [les dépendances tierces](THIRD_PARTY_NOTICES.md).

![Atelier Trait Studio](docs/images/workshop.png)

## L’atelier Trait

- **Six mouvements éditables** : course, marche, saut, salut, respiration et moonwalk. Choisis couleur, durée, souplesse et direction ; ouvre ensuite le clip pour retoucher chaque pose.
- **Personnage Élan** : tête creuse, traits fins, membres courbes et quatre contrôles IK pour déplacer mains et pieds.
- **Bibliothèque de poses** : enregistrement local, application au même squelette, insertion, import/export JSON.
- **Repères musicaux** : frappe du tempo, BPM, décalage de l’intro, mesures et repères nommés sauvegardés avec le projet.
- **Identité indépendante** : icône propre, palette verte, profil local séparé ; aucune télémétrie distante ni connexion au catalogue amont.

## Fonctions héritées

Création de figures à partir de lignes, cercles, polygones, images et texte ; articulations, IK et étirement ; timelines simple et avancée ; calques, images clés et interpolations ; pelure d’oignon ; dessin ; caméra et effets ; pistes audio ; annuler/rétablir ; sauvegarde et récupération ; import des formats Pivot et Stick Nodes pris en charge par le moteur.

L’édition bureau propose notamment MP4, WebM, GIF, APNG et séquences d’images. Les codecs disponibles dans le navigateur dépendent de celui-ci ; l’application indique les formats utilisables. L’import de tous les fichiers propriétaires possibles n’est pas garanti.

## Télécharger

[Préversion Linux x86_64 · 1.3.0](https://github.com/Frozalex/trait-studio/releases/tag/v1.3.0) · [Résultats des vérifications](docs/VALIDATION-1.3.0.md)

Télécharge l’AppImage, rends-la exécutable, puis ouvre-la :

```bash
chmod +x TraitStudio-1.3.0-linux-x86_64.AppImage
./TraitStudio-1.3.0-linux-x86_64.AppImage
```

Les binaires Windows, macOS et mobiles ne sont pas fournis dans cette première préversion.

## Démarrer depuis les sources

Prérequis : **Node.js 22+** et **Python 3.11+**. Les constructions automatisées utilisent Node 24.11 et Python 3.12.9.

```bash
git clone https://github.com/Frozalex/trait-studio.git
cd trait-studio
npm ci
npm run serve
```

Ouvre l’adresse affichée, normalement **http://127.0.0.1:47831**. Tout le traitement des projets se fait sur ton ordinateur. Aucun compte n’est nécessaire.

Pour lancer la fenêtre bureau Electron :

```bash
npm start
```

Avec npm 12, si l’installation du binaire Electron est bloquée, examine les scripts avec `npm install-scripts ls`, puis autorise celui du paquet officiel Electron avec `npm install-scripts approve electron`. Les fichiers natifs de distribution sont construits avec les scripts du projet ; voir [la construction bureau](docs/BUILD-TRAIT.md).

## Premier mouvement

1. Ouvre un projet et clique **Atelier** dans la barre du haut.
2. Choisis un mouvement, ajuste sa durée et clique **Insérer le mouvement**.
3. Ouvre le clip pour modifier ses poses, puis utilise la timeline et le bouton Lecture.
4. Importe la musique avec le bouton Audio de la timeline. L’onglet **Rythme** de l’atelier permet de caler l’intro et les temps.
5. Enregistre le projet natif pour conserver les données éditables, puis exporte une vidéo.

L’atelier est actuellement en français. Les autres panneaux conservent les langues de la base ; le choix s’effectue dans les paramètres.

## Vérification

```bash
npm run check
npm test
npm run test:trait
npx playwright install chromium
npm run test:trait:browser
python3 -m unittest discover -s backend -p 'test_*.py'
```

Le test navigateur lance et arrête lui-même son serveur local. Les tests utilisent des données de démonstration, sans la musique ni les projets privés du créateur.

## État du projet

Première version de Trait Studio, **1.3.0**, construite sur une base déjà développée. Les nouveaux outils sont fonctionnels ; ce numéro poursuit la numérotation technique amont et ne signifie pas plusieurs versions antérieures de Trait Studio. Ce n’est pas une promesse de parité totale ou de supériorité sur Stick Nodes Pro.

Le tempo se règle manuellement ou par frappe ; la détection automatique des basses n’est pas encore implémentée. La grille se consulte dans l’atelier, pas sur la règle principale. Les mouvements sont des points de départ éditables, à affiner selon la scène. Les applications Android/iOS natives ne sont pas fournies.

[Architecture et prochaines étapes](docs/TRAIT-STUDIO.md) · [Historique](CHANGELOG.md) · [Signaler un problème](https://github.com/Frozalex/trait-studio/issues)
