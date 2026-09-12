# FollowCure

```bash
bun i
bun dev
bun test:unit
bun run build
```

[localhost:3000](http://localhost:3000). Données fictives, en mémoire, recalculées autour de la date du jour. Tout est simulé : aucun SMS, paiement ou rendez-vous réel.

## Utiliser

**FollowCure** est la file de suivis, **Patients** la liste complète.

1. **À traiter** : trois patients sur neuf. Chaque ligne donne la fin de cure estimée et sur quoi elle est basée.
2. **Suivre un patient** : choisir la suite (renouvellement, rendez-vous, les deux), le message se réécrit — il reste modifiable.
3. **Voir l’aperçu patient**, revenir, **Valider et envoyer**. le patient passe dans _Envoyés_.
4. **Voir côté patient** → **Commander** : la commande clôt le cycle, plus aucune relance pour cette cure.
5. **Démo → Avancer de 7 jours** : le suivi reporté de Chloé revient tout seul. **Réinitialiser** remet tout à zéro.
