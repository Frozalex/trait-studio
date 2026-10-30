# Vérification de Trait Studio 1.3.0

Sources vérifiées : `d18f920528551c1554ac9968948afd0eb9d83514`.

- [Tests GitHub](https://github.com/Frozalex/trait-studio/actions/runs/41069441159) : réussite des tests du moteur sous Ubuntu 24.04 et Windows, ainsi que du job Linux de construction et d’export.
- [Atelier dans Chromium](https://github.com/Frozalex/trait-studio/actions/runs/41069441189) : réussite du parcours utilisateur automatisé.
- [Version et sources correspondantes](https://github.com/Frozalex/trait-studio/releases/tag/v1.3.0).

## Résultats

| Vérification | Résultat |
| --- | --- |
| Analyse locale du code | 1 733 fichiers JavaScript, aucune erreur de syntaxe ; 94 feuilles de style et 661 modules, aucun problème de lint CSS. |
| Tests JavaScript locaux | 3 806 tests : 3 781 réussis, 25 ignorés, aucun échec. Les tests ignorés dépendent de plateformes ou de fixtures absentes. |
| Régressions Trait | Huit tests couvrant mouvements, durée, insertion/annulation, application des poses, stockage, écritures concurrentes, rythme et sauvegarde. |
| Parcours navigateur | 13 contrôles réussis, dont insertion, annulation, articulations IK, poses, repères, rechargement et affichage sur un écran de 900 × 720. Aucune erreur JavaScript observée. |
| Tests Python locaux | 161 tests : 114 réussis, 47 ignorés en raison des conditions et fixtures disponibles, aucun échec. |
| Paquet Linux | Les ressources web et les modules natifs correspondent aux sources vérifiées ; le codec compilé et FFmpeg sont inclus. |
| Démarrage Linux | L’exécutable et l’AppImage ouvrent l’éditeur, sans exposer Node au contenu de la fenêtre. Les poses survivent à une fermeture et une relance. |
| Exports Linux | Un mouvement Trait de 24 images est exporté en MP4, WebM, AVI, WMV et GIF ; chaque fichier est décodé avec FFmpeg. |
| Dépendances de production | `npm audit --omit=dev` : aucune vulnérabilité signalée lors de la vérification. Ce résultat n’est pas un audit de sécurité complet. |

Les tests GitHub utilisent Node 24.11.0 et Python 3.12.9. La distribution publiée est **celle construite et testée par le job Linux de GitHub**, sans reconstruction locale après validation.

SHA-256 de `TraitStudio-1.3.0-linux-x86_64.AppImage` :

```text
71526178750bd8b38ab30eb2a1486a10916cafbc3366c219d164bea9efd6518f
```

## Portée

Les tests du moteur sous Windows ne valident pas un installateur Windows. Aucun binaire Windows, macOS ou mobile n’est fourni pour cette version. Le rendu de bureau a été vérifié sur le serveur Linux avec le moteur Canvas 2D de compatibilité ; cette vérification ne couvre pas tous les GPU.

Les mouvements proposés restent des bases éditables. Le tempo se règle manuellement ou par frappe et les repères restent dans l’atelier. La parité complète avec Stick Nodes Pro n’est pas revendiquée.
