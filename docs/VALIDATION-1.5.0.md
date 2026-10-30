# Validation de Trait Studio 1.5.0

Version publiée le **30 octobre 2026**, construite à partir du commit [`957e2c04464d1fc719b29ba3d87c255c849a6bdf`](https://github.com/Frozalex/trait-studio/commit/957e2c04464d1fc719b29ba3d87c255c849a6bdf).

[Téléchargements Windows et Linux](https://github.com/Frozalex/trait-studio/releases/tag/v1.5.0) · [Guide en français](QUICKSTART.fr.md)

## Changements validés

- Créateur de personnages Élan, Robot et Triangle : proportions, formes géométriques, couleurs, aperçu des articulations et essai indépendant de la scène.
- Insertion native avec quatre contrôles IK, annulation en une étape, retouche dans Construction et reprise des proportions après sauvegarde.
- Six mouvements adaptés aux proportions, longueurs constantes des membres, lecture et parcours image par image. Marche et course en déplacement avec appuis fixes ; saut avec anticipation et amorti.
- Mise à jour d’Electron vers 45.1.0 et des dépendances vulnérables, avec audits et scan antivirus obligatoires avant publication.

## Sécurité

| Contrôle au 30 octobre 2026 | Résultat |
| --- | --- |
| Audit npm complet, y compris Electron et les dépendances de développement | **0 vulnérabilité signalée**, 324 dépendances recensées. |
| Audit de l’environnement Python de construction et d’audit Linux | **0 vulnérabilité signalée**, 34 paquets. |
| Vérification supplémentaire des versions Python déclarées pour toutes les plateformes | **0 vulnérabilité signalée**, 10 paquets, y compris les outils Windows. |
| Scan antivirus des distributions et de leurs contenus extraits | **0 fichier infecté détecté**, 2 709 fichiers, 2,36 Gio analysés. |

Le scan utilise **ClamAV 1.5.4**, base **28169 du 30 octobre 2026 à 06:26:48 UTC**. Il contrôle l’AppImage, les exécutables Windows, les fichiers extraits de l’AppImage et du Setup, ainsi que le contenu des deux archives Electron `app.asar`.

Rapports conservés : [npm](validation/1.5.0/npm-audit.json), [environnement Python](validation/1.5.0/python-audit.json), [versions Python multiplateformes](validation/1.5.0/python-pins-audit.json), [scan antivirus](validation/1.5.0/antivirus-scan.txt), [version et signatures antivirus](validation/1.5.0/antivirus-version.txt).

Ces contrôles recherchent des vulnérabilités et signatures connues. Ils ne prouvent pas l’absence absolue de logiciel malveillant, de faille ou de bug. Une empreinte SHA-256 vérifie l’intégrité du fichier, pas son innocuité.

## Tests et distributions

| Vérification | Linux | Windows |
| --- | --- | --- |
| Tests JavaScript | 3 798 réussis, 25 ignorés, **0 échec** | 3 797 réussis, 26 ignorés, **0 échec** |
| Tests Python | 155 tests dont 48 ignorés, **0 échec** | 161 tests dont 47 ignorés, **0 échec** |
| Démarrage et redémarrage avec poses conservées | Exécutable empaqueté et AppImage | Exécutable empaqueté et application installée par le Setup |
| Exports courts décodés | MP4, WebM, AVI, WMV et GIF, 24 images chacun | Les cinq mêmes formats, 24 images chacun |
| Export long après sauvegarde et réouverture | MP4 de 90 secondes, 2 160 images, son décodé et mouvement vérifié | Même scénario réussi |

Le parcours Chromium de l’atelier comporte **29 vérifications réussies**, sans erreur JavaScript : personnages, articulations, sauvegarde, proportions, mouvements, poses, rythme et affichage compact. Les tests ciblés Trait comptent **25 tests réussis**, dont le verrouillage des pieds au sol et la conservation des longueurs jusqu’aux proportions extrêmes. Les contrôles de syntaxe, de styles et du changelog passent.

Les distributions sont construites avec Node 24.22.1 et Python 3.14.10. Les tests natifs ont utilisé le rendu Canvas 2D de repli ; ils ne certifient pas tous les GPU ou matériels. Les captures étroites ne constituent pas un test sur téléphone physique. Aucun binaire macOS, Android ou iOS n’est certifié ici. Les exécutables Windows ne sont pas signés numériquement.

## Traçabilité

- [Construction, tests et sécurité](https://github.com/Frozalex/trait-studio/actions/runs/41091739683) : six jobs réussis sur le même commit.
- [Parcours de l’atelier](https://github.com/Frozalex/trait-studio/actions/runs/41091739708) : réussi sur ce commit.
- [Publication](https://github.com/Frozalex/trait-studio/actions/runs/41093789360) : fichiers récupérés depuis les constructions vérifiées, sans reconstruction, puis contrôle des tailles et SHA-256 côté GitHub.
- Le tag public `v1.5.0` pointe sur le commit testé. La release contient le Setup, le Portable, l’AppImage, leurs métadonnées et [SHA256SUMS.txt](validation/1.5.0/SHA256SUMS.txt).

| Fichier | Taille en octets | SHA-256 |
| --- | ---: | --- |
| `TraitStudio-1.5.0-Setup-x64.exe` | 154,109,125 | `6b8b5b271b52c15c3a8c2cef469cce447cb008857f03b095b1bf9b718d25c39d` |
| `TraitStudio-1.5.0-Portable-x64.exe` | 153,876,673 | `22222051fd474d9cf370c2c7a8f501b032693fdfbe998354bdd59ea7c4857cc4` |
| `TraitStudio-1.5.0-linux-x86_64.AppImage` | 182,330,259 | `c0678940e2609a7c346607df62dfa78e5d060bddcfb4d08506752537361a9573` |
