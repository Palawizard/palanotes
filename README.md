# Palanotes

Prise de notes rapide avec rangement automatique. On écrit en vrac (markdown ou texte brut), on ajoute si on veut une consigne (« à ranger avec mes cours de réseau »), puis on valide : Claude met la note en forme et la range dans un dossier, dans une nouvelle note ou à la suite d'une note existante. Une recherche plein texte retrouve les notes, même mal rangées.

Servi sous `https://palawi.fr/notes`, connexion par le compte palawi.fr (Authentik).

## Prérequis

- Node 22.12 ou plus récent
- pnpm 10.28 (`npm install -g pnpm@10.28.0`)
- Docker, pour la base de développement

## Démarrage

```sh
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

L'app répond sur `http://localhost:3000/notes`, et `http://localhost:3000/notes/api/health` renvoie `{"status":"ok"}`.

## Scripts

| Commande                            | Rôle                                                                  |
| ----------------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                          | web et worker en mode développement                                   |
| `pnpm build`                        | build de production du web                                            |
| `pnpm typecheck`                    | vérification des types de tous les paquets                            |
| `pnpm test`                         | tests Vitest                                                          |
| `pnpm lint`                         | ESLint du web                                                         |
| `pnpm format` / `pnpm format:check` | Prettier                                                              |
| `pnpm db:up` / `pnpm db:down`       | Postgres de développement (port 5434)                                 |
| `pnpm db:generate`                  | nouvelle migration après un changement de `packages/db/src/schema.ts` |
| `pnpm db:migrate`                   | applique les migrations                                               |

## Structure

```
apps/web         Next.js : interface, routes HTTP, connexion
apps/worker      tâches de fond (pg-boss) : rangement des notes
packages/core    logique métier sans dépendance au framework
packages/db      schéma Drizzle et migrations
packages/llm     accès au modèle, par abonnement ou par clé d'API
docker/          Postgres de développement
```

Détails dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
