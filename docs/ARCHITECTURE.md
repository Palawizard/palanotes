# Architecture

## Vue d'ensemble

```
navigateur ──HTTPS──> Cloudflare (palawi.fr) ──tunnel──> Caddy / gateway
  /notes/*  ──> web (Next.js, port 3000)
                  │  écrit l'entrée brute et met une tâche en file
                  ▼
               Postgres  <──  worker (pg-boss)
                                │  demande un plan de rangement
                                ▼
                              packages/llm
                                ├─ mode abonnement : `claude -p` (CLI Claude Code)
                                └─ mode api : SDK Anthropic avec une clé
```

## Paquets

| Paquet          | Contenu                                                                                                     | Dépend de             |
| --------------- | ----------------------------------------------------------------------------------------------------------- | --------------------- |
| `packages/core` | types et règles métier : plan de rangement (schéma Zod), chemins de dossiers                                | zod                   |
| `packages/db`   | schéma Drizzle, client, migrations SQL                                                                      | drizzle-orm, postgres |
| `packages/llm`  | interface `LlmClient`, choix du mode par compte, puis les deux implémentations                              | rien pour l'instant   |
| `apps/web`      | pages, routes HTTP (`/api/...`), connexion OIDC, recherche                                                  | core, db, llm         |
| `apps/worker`   | file `sort-entry` : construit le contexte, appelle le modèle, enregistre le plan, l'applique en mode direct | core, db, llm         |

Le code métier de `packages/core` ne dépend ni de Next.js ni de pg-boss.

## Cycle d'une note

1. L'utilisateur valide son texte : une ligne `entries` est créée (statut `pending`) et une tâche `sort-entry` part en file.
2. Le worker envoie au modèle le texte brut et l'index de l'utilisateur (dossiers, titres, résumés, tags) et reçoit un plan (`SortPlan`) : créer une note dans un dossier, ou ajouter une section à une note existante.
3. Le plan est validé par Zod puis enregistré dans `sort_runs`.
4. Selon le réglage du compte (`users.sort_mode`) :
   - `review` : le plan est montré à l'utilisateur, qui l'accepte ou le refuse ;
   - `direct` : le plan est appliqué tout de suite, avec un bouton annuler.
5. Appliquer un plan crée les dossiers manquants, crée ou complète les notes, et écrit une ligne `note_versions` par modification. Annuler restaure les versions précédentes et passe le plan à `undone`.

L'entrée brute n'est jamais modifiée ni supprimée par le rangement : un rangement raté peut toujours être refait.

## Modes du modèle

`resolveLlmMode` (`packages/llm/src/mode.ts`) choisit le mode pour chaque compte :

- le compte dont le `sub` OIDC vaut `LLM_OWNER_SUBJECT` utilise `LLM_OWNER_MODE` (`subscription` par défaut) ;
- tous les autres utilisent `LLM_DEFAULT_MODE` (`api` ou `disabled`), jamais l'abonnement.

Le mode abonnement lance la CLI Claude Code en mode non interactif avec `CLAUDE_CODE_OAUTH_TOKEN` ; le mode api utilise `ANTHROPIC_API_KEY`. Chaque plan enregistre le mode, le modèle et les jetons consommés.

## Recherche

Le but est de retrouver une note même rangée au mauvais endroit. Chaque note a un titre, un résumé et des tags écrits au moment du rangement ; la recherche plein texte Postgres (configuration `french`, `unaccent`, `pg_trgm` pour les fautes de frappe) porte sur le titre, le résumé, les tags et le contenu. Chaque résultat affiche le chemin de son dossier. Une recherche par embeddings (pgvector) pourra s'ajouter plus tard si le plein texte ne suffit pas.

## Données

Tables : `users`, `folders` (arborescence par `parent_id`), `entries` (texte brut), `notes`, `sort_runs` (plans du modèle), `note_versions` (historique). Schéma : `packages/db/src/schema.ts`.

## Connexion

OIDC avec Authentik (`https://auth.palawi.fr/application/o/palanotes/`), code + PKCE. L'utilisateur est identifié par son `sub` (`users.auth_subject`), jamais par son e-mail. Cookie de session propre à l'app, `path=/notes`, `Secure`, `HttpOnly`, `SameSite=Lax`. Accès limité à un groupe Authentik.
