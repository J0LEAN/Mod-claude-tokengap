# tokengap — mod Claude Code

Une petite bande affichée **au-dessus de la barre de chat** de Claude Code qui te dit :

1. **Quel Opus utiliser**
   - 🏆 **Qualité max** : Opus 5.5 avec un effort élevé (`max` → `high` selon tes limites)
   - 💰 **Meilleur rapport qualité/coût** : Opus 5.5 avec un effort `medium` → `low`
   - le modèle actuel de la session, avec ✓ s'il est déjà le bon (sinon `→ /model opus`)

   Opus 5.5 est à la fois l'Opus le plus capable **et** le moins cher de la gamme
   (4 $ / 20 $ par million de tokens, contre 5 $ / 25 $ pour Opus 5 et 4.8) :
   c'est donc le niveau d'**effort** qui fait la différence entre qualité et économie.

2. **Une jauge de tes limites d'usage** (fenêtres 5 h et 7 jours de ton abonnement)

   ```
   🏆 Qualité : Opus 5.5 · effort high   💰 Qualité/coût : Opus 5.5 · effort low   actuel : Opus 5.5 ✓
   🟠 ██████████░░ Ralentis  5h 85% (reset 1h00) · 7j 41%  — requêtes ciblées, effort bas
   ```

   | Niveau | Seuil (fenêtre la plus remplie) | Conseil |
   | --- | --- | --- |
   | 🟢 Large | < 50 % | grosses requêtes OK |
   | 🟡 Modéré | 50 – 80 % | garde les grosses requêtes pour l'essentiel |
   | 🟠 Ralentis | 80 – 95 % | requêtes ciblées, effort bas |
   | 🔴 Stop | ≥ 95 % | attends la réinitialisation |

   Si ton **rythme** actuel te ferait dépasser 100 % avant la réinitialisation (flèche ↗),
   la jauge monte d'un cran. Un toast t'avertit quand tu passes en 🟠 ou 🔴.

La jauge lit les limites que Claude Code reçoit de l'API : elle n'apparaît qu'avec un
abonnement Claude (Pro/Max/Team…) et après la première réponse de la session.

## Installation

Dans une session Claude Code (terminal) :

```
/plugin install tokengap --marketplace j0lean/mod-claude-tokengap
```

Ou depuis un shell :

```bash
claude plugin install tokengap --marketplace j0lean/mod-claude-tokengap
```

Dans l'app desktop : `+` à côté du prompt → Plugins → Add marketplace `j0lean/mod-claude-tokengap` → Add plugin.

Pour l'essayer depuis un clone local :

```bash
claude --plugin-dir ./mod-claude-tokengap
```

## Développement

```bash
claude plugin validate .
claude plugin test .
```

- `hooks/advice.ts` : logique (seuils, projection du rythme, recommandation, tarifs)
- `hooks/register.tsx` : la bande `AbovePrompt`, la mise à jour sur `session.measure`, les toasts
- `tests/band.test.tsx` : tests
