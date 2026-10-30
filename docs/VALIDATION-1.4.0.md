# Trait Studio 1.4.0 — validation de distribution

Source vérifiée : `d248fea0fc26302397e6f8affdf8819df6989e97`.

- [Tests Windows/Linux et construction](https://github.com/Frozalex/trait-studio/actions/runs/41082623773).
- [Parcours de l’atelier dans Chromium](https://github.com/Frozalex/trait-studio/actions/runs/41082623771).

## Contrôles

| Contrôle | Résultat |
| --- | --- |
| Syntaxe, styles, références de traduction | 1 741 fichiers JavaScript, aucune erreur de syntaxe ; 94 feuilles de style et 666 modules, aucune erreur de style. |
| Suite JavaScript | 3 817 tests par plateforme : Linux 3 792 réussis et 25 ignorés ; Windows 3 791 réussis et 26 ignorés ; aucun échec. |
| Suite Python | Linux : 155 tests dont 48 ignorés ; Windows : 161 dont 47 ignorés ; aucun échec. Les cas ignorés nécessitent notamment des corpus locaux ou des composants propres à une autre plateforme. |
| Nouveaux comportements Trait | 19 tests : mouvements, poses, persistance, renommage, tempo, basses, phase stéréo, début immédiat, annulation, grille et historique. |
| Navigateur | 20 contrôles réussis : atelier, insertion, IK, vignette, recherche/renommage, application, rythme, analyse, annulation puis nouvelle analyse, mute, sauvegarde et écrans étroits. |
| Timelines | Contrôle local supplémentaire sur une scène de 90 secondes : repères avancés au survol, badge simple, visibilité et annulation. |
| Linux | Paquet vérifié, exécutable et AppImage démarrés, poses conservées après fermeture et redémarrage complets. |
| Windows | Paquet vérifié et démarré ; Setup installé dans un dossier temporaire, exécutable et archive comparés au paquet, programme installé démarré et redémarré avec conservation des poses. |
| Exports Linux et Windows | MP4, WebM, AVI, WMV et GIF : 24 images décodées pour chaque fichier. |
| Scène longue Linux et Windows | MP4 de 90 secondes, 320 × 240 à 24 images/s : 2 160 images décodées, plusieurs images distinctes, audio décodé de plus de 89 secondes et non silencieux. Le projet avait été sauvegardé puis rechargé avant l’export. |

La scène longue emploie un son synthétique ; aucun son ni projet privé n’est joint. Le test valide une chaîne d’export, pas la qualité artistique d’un film de démonstration.

## Portée

Les builds utilisent Node 24.11.0 et Python 3.12.9. Le rendu des tests automatisés utilise le mode de compatibilité Canvas 2D quand WebGPU n’est pas disponible. Ces résultats ne certifient pas toutes les cartes graphiques, toutes les distributions Linux, tous les fichiers propriétaires ou tous les périphériques audio.

L’agencement étroit a été contrôlé dans Chromium à 390 × 844 ; aucun téléphone physique ni application mobile native n’a été validé. macOS ne fait pas partie de cette release. Windows n’est pas signé numériquement. Les mises à jour sont téléchargées manuellement depuis GitHub.

## Publication

[Release publique 1.4.0](https://github.com/Frozalex/trait-studio/releases/tag/v1.4.0), publiée le 30 octobre 2026, hors brouillon et hors préversion. Le [workflow de publication](https://github.com/Frozalex/trait-studio/actions/runs/41083978882) a récupéré exactement les artefacts vérifiés ; aucune recompilation n’a eu lieu pour la mise en ligne. L’étiquette `v1.4.0` pointe sur le commit source indiqué en tête de ce document.

Les sept fichiers sont présents. Les six empreintes du [manifeste SHA-256](https://github.com/Frozalex/trait-studio/releases/download/v1.4.0/SHA256SUMS.txt) téléchargé ont été comparées aux empreintes des pièces jointes publiées, ainsi que l’empreinte du manifeste lui-même. Tous les contrôles concordent.

| Distribution | Octets | SHA-256 |
| --- | ---: | --- |

| `TraitStudio-1.4.0-Setup-x64.exe` | 134488648 | `9ba45213c19f9200e392a006905319f838670efdb82d5abeec602e87056d346a` |
| `TraitStudio-1.4.0-Portable-x64.exe` | 134256196 | `73654c9719ecec353a7d45d9c128c97788844e9c0c9171298f739d642910f0b8` |
| `TraitStudio-1.4.0-linux-x86_64.AppImage` | 169008450 | `fe4d25a043bc1041330ef5b6f7a4f58d7964f2393f7e68ffacf99f5eddec9e42` |
