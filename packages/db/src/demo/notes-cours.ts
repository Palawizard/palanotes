import type { DemoNote } from './types';

const LINUX = 'Cours / Systèmes / Linux';
const SHELL = 'Cours / Systèmes / Linux / Scripts shell';
const VIRT = 'Cours / Systèmes / Virtualisation';
const TS = 'Cours / Développement / TypeScript';
const BDD = 'Cours / Développement / Bases de données';
const SQL = 'Cours / Développement / Bases de données / SQL avancé';
const ALGO = 'Cours / Développement / Algorithmique';
const PROBA = 'Cours / Mathématiques / Probabilités';

export const COURSE_NOTES: DemoNote[] = [
  {
    path: LINUX,
    title: 'Droits Unix et umask',
    tags: ['linux', 'droits'],
    summary: 'Lecture des droits rwx, notation octale, umask, setuid et sticky bit.',
    content: `# Droits Unix

\`-rwxr-x---\` : propriétaire rwx, groupe r-x, autres rien. En octal : \`750\`.

| Lettre | Valeur |
| --- | --- |
| r | 4 |
| w | 2 |
| x | 1 |

\`\`\`sh
chmod 640 secret.txt
chown palawi:www-data site/
umask 027
\`\`\`

## Bits spéciaux

- **setuid** (\`4000\`) : s'exécute avec les droits du propriétaire (\`passwd\`).
- **sticky** (\`1000\`) : dans \`/tmp\`, seul le propriétaire supprime ses fichiers.`,
  },
  {
    path: LINUX,
    title: 'systemd : services et timers',
    tags: ['systemd', 'linux'],
    summary: 'Écrire un service systemd et un timer à la place d’une tâche cron.',
    content: `# systemd : services et timers

\`\`\`ini
# /etc/systemd/system/backup.service
[Unit]
Description=Sauvegarde quotidienne

[Service]
Type=oneshot
ExecStart=/opt/backup/run.sh
\`\`\`

\`\`\`ini
# /etc/systemd/system/backup.timer
[Timer]
OnCalendar=*-*-* 03:15
Persistent=true

[Install]
WantedBy=timers.target
\`\`\`

\`\`\`sh
systemctl enable --now backup.timer
systemctl list-timers
journalctl -u backup.service -n 50
\`\`\``,
  },
  {
    path: LINUX,
    title: 'Processus et signaux',
    tags: ['linux', 'processus'],
    summary: 'ps, top, kill : les signaux SIGTERM, SIGKILL, SIGHUP.',
    content: `- SIGTERM (15) : demande polie d'arrêt
- SIGKILL (9) : arrêt forcé, impossible à intercepter
- SIGHUP (1) : souvent « relis ta config »

\`\`\`sh
ps aux --sort=-%mem | head
kill -TERM 1234
\`\`\``,
  },
  {
    path: LINUX,
    title: 'Partitions, LVM et montage',
    tags: ['linux', 'lvm', 'disques'],
    summary: 'Créer un volume LVM, le formater, le monter au démarrage.',
    content: `# Partitions, LVM et montage

\`\`\`sh
pvcreate /dev/sdb
vgcreate data /dev/sdb
lvcreate -L 50G -n photos data
mkfs.ext4 /dev/data/photos
\`\`\`

Dans \`/etc/fstab\`, monter par UUID (\`blkid\`) plutôt que par nom de périphérique.

Agrandir à chaud : \`lvextend -r -L +10G /dev/data/photos\`.`,
  },
  {
    path: LINUX,
    title: 'SSH : clés et config',
    tags: ['ssh', 'linux'],
    summary: 'Générer une clé ed25519, fichier ~/.ssh/config, désactiver le mot de passe.',
    content: `\`\`\`sh
ssh-keygen -t ed25519 -C "palawi@portable"
ssh-copy-id palawi@vm-apps
\`\`\`

\`\`\`
Host vm-apps
  HostName 10.0.20.11
  User palawi
\`\`\`

Côté serveur : \`PasswordAuthentication no\`.`,
  },
  {
    path: SHELL,
    title: 'Bash : boucles et conditions',
    tags: ['bash', 'scripts'],
    summary: 'Syntaxe des boucles for et while, tests et codes de retour en Bash.',
    content: `# Bash : boucles et conditions

\`\`\`bash
for fichier in *.log; do
  gzip "$fichier"
done

while read -r ligne; do
  echo "> $ligne"
done < liste.txt

if [[ -f config.env ]]; then
  source config.env
fi
\`\`\`

Toujours mettre les variables entre guillemets. Début de script conseillé : \`set -euo pipefail\`.`,
  },
  {
    path: SHELL,
    title: 'Script de rotation des journaux',
    tags: ['bash', 'scripts', 'logs'],
    summary:
      'Petit script qui compresse les journaux de plus de sept jours et supprime ceux de plus de trente.',
    content: `\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
dir=/var/log/monapp
find "$dir" -name '*.log' -mtime +7 -exec gzip {} +
find "$dir" -name '*.gz' -mtime +30 -delete
\`\`\`

À lancer par un timer systemd, pas par cron.`,
  },
  {
    path: SHELL,
    title: 'awk et sed : aide-mémoire',
    tags: ['awk', 'sed', 'scripts'],
    summary: 'Les commandes awk et sed les plus utiles pour traiter du texte.',
    content: `\`\`\`sh
awk -F: '{ print $1 }' /etc/passwd
awk '$3 > 100 { n++ } END { print n }' data.txt
sed -i 's/ancien/nouveau/g' fichier.txt
sed -n '10,20p' fichier.txt
\`\`\``,
  },
  {
    path: VIRT,
    title: 'Conteneurs contre machines virtuelles',
    tags: ['virtualisation', 'conteneurs'],
    summary: 'Différences entre conteneurs et VM : isolation, noyau partagé, coût.',
    content: `# Conteneurs contre machines virtuelles

| | VM | Conteneur |
| --- | --- | --- |
| Noyau | le sien | partagé avec l'hôte |
| Démarrage | dizaines de secondes | une seconde |
| Isolation | forte | namespaces et cgroups |
| Taille | plusieurs Go | quelques dizaines de Mo |

Les deux se combinent : des conteneurs Docker dans une VM Proxmox.`,
  },
  {
    path: VIRT,
    title: 'Docker : commandes utiles',
    tags: ['docker', 'conteneurs'],
    summary: 'Aide-mémoire Docker : images, conteneurs, volumes, compose.',
    content: `\`\`\`sh
docker compose up -d --wait
docker compose logs -f web
docker exec -it palanotes-db psql -U palanotes
docker system df
docker image prune
\`\`\`

Épingler les images par version, jamais \`latest\`.`,
  },
  {
    path: VIRT,
    title: 'Namespaces et cgroups',
    tags: ['linux', 'conteneurs', 'noyau'],
    summary: 'Les briques du noyau Linux derrière les conteneurs.',
    content: `# Namespaces et cgroups

**Namespaces** (ce que le processus voit) : pid, net, mnt, uts, ipc, user, cgroup.

**cgroups** (ce qu'il consomme) : CPU, mémoire, entrées-sorties.

\`\`\`sh
unshare --pid --fork --mount-proc bash
cat /sys/fs/cgroup/memory.max
\`\`\``,
  },
  {
    path: TS,
    title: 'Types utilitaires de TypeScript',
    tags: ['typescript', 'types'],
    summary: 'Partial, Pick, Omit, Record, ReturnType et quand les utiliser.',
    content: `# Types utilitaires

\`\`\`ts
interface Note {
  id: string;
  title: string;
  tags: string[];
}

type NoteDraft = Omit<Note, 'id'>;
type NoteTitle = Pick<Note, 'id' | 'title'>;
type ParDossier = Record<string, Note[]>;
type Maj = Partial<Note>;
\`\`\`

- \`ReturnType<typeof f>\` évite de répéter un type de retour.
- \`satisfies\` vérifie un objet sans élargir son type.`,
  },
  {
    path: TS,
    title: 'Unions discriminées',
    tags: ['typescript', 'types'],
    summary: 'Modéliser des états avec une union discriminée et vérifier l’exhaustivité.',
    content: `\`\`\`ts
type Etat =
  | { kind: 'chargement' }
  | { kind: 'ok'; notes: string[] }
  | { kind: 'erreur'; message: string };

function rendu(etat: Etat): string {
  switch (etat.kind) {
    case 'chargement':
      return '…';
    case 'ok':
      return etat.notes.join(', ');
    case 'erreur':
      return etat.message;
  }
}
\`\`\`

Avec \`noImplicitReturns\`, oublier un cas devient une erreur.`,
  },
  {
    path: TS,
    title: 'Génériques avec contraintes',
    tags: ['typescript', 'génériques'],
    summary: 'Écrire une fonction générique contrainte par extends et keyof.',
    content: `\`\`\`ts
function trierPar<T, K extends keyof T>(items: T[], cle: K): T[] {
  return [...items].sort((a, b) => String(a[cle]).localeCompare(String(b[cle]), 'fr'));
}
\`\`\``,
  },
  {
    path: TS,
    title: 'Valider les entrées avec Zod',
    tags: ['typescript', 'zod', 'validation'],
    summary: 'Schéma Zod, safeParse et type déduit pour valider un corps de requête.',
    content: `# Valider avec Zod

\`\`\`ts
import { z } from 'zod';

const corps = z.object({
  titre: z.string().trim().min(1).max(200),
  dossierId: z.uuid().optional(),
});

type Corps = z.infer<typeof corps>;

const resultat = corps.safeParse(await request.json());
if (!resultat.success) {
  return Response.json({ error: 'bad_request' }, { status: 400 });
}
\`\`\`

Valider à la frontière, faire confiance au type ensuite.`,
  },
  {
    path: BDD,
    title: 'Formes normales',
    tags: ['bdd', 'normalisation'],
    summary: 'Première, deuxième et troisième formes normales avec un exemple de commandes.',
    content: `# Formes normales

1. **1FN** : valeurs atomiques, pas de liste dans une colonne.
2. **2FN** : 1FN + chaque attribut dépend de toute la clé.
3. **3FN** : 2FN + pas de dépendance entre attributs non clés.

Exemple : \`commande(id, client_nom, client_ville, produit)\` viole la 3FN, la ville dépend du client. On sort une table \`client\`.`,
  },
  {
    path: BDD,
    title: 'Index B-tree et GIN',
    tags: ['bdd', 'postgres', 'index'],
    summary:
      'Quand créer un index B-tree, quand un index GIN, et comment le vérifier avec EXPLAIN.',
    content: `# Index B-tree et GIN

- **B-tree** : égalité et intervalles, tri. Le cas par défaut.
- **GIN** : contenus multiples (tableaux, jsonb, recherche plein texte, trigrammes).

\`\`\`sql
create index notes_user_folder_idx on notes (user_id, folder_id);
create index notes_search_idx on notes using gin (search);
explain analyze select * from notes where user_id = $1 order by updated_at desc limit 20;
\`\`\`

L'ordre des colonnes compte : l'égalité d'abord, l'intervalle ensuite.`,
  },
  {
    path: BDD,
    title: 'Transactions et niveaux d’isolation',
    tags: ['bdd', 'transactions'],
    summary: 'Read committed, repeatable read, serializable et les anomalies évitées.',
    content: `| Niveau | Lecture sale | Non répétable | Fantôme |
| --- | --- | --- | --- |
| Read committed | non | possible | possible |
| Repeatable read | non | non | non (Postgres) |
| Serializable | non | non | non |

Postgres est en read committed par défaut.`,
  },
  {
    path: SQL,
    title: 'Requêtes récursives',
    tags: ['sql', 'récursif', 'arborescence'],
    summary: 'Parcourir une arborescence de dossiers avec WITH RECURSIVE.',
    content: `# Requêtes récursives

\`\`\`sql
with recursive sous_dossiers as (
  select id, parent_id, name, 1 as niveau
  from folders where id = $1
  union all
  select f.id, f.parent_id, f.name, s.niveau + 1
  from folders f
  join sous_dossiers s on f.parent_id = s.id
)
select * from sous_dossiers order by niveau;
\`\`\`

Penser à une limite de profondeur si les données peuvent contenir un cycle.`,
  },
  {
    path: SQL,
    title: 'Fonctions de fenêtre',
    tags: ['sql', 'fenêtre'],
    summary: 'row_number, rank et sommes cumulées avec OVER (PARTITION BY ...).',
    content: `\`\`\`sql
select folder_id, title,
       row_number() over (partition by folder_id order by updated_at desc) as rang
from notes;
\`\`\`

Pratique pour « les trois dernières notes de chaque dossier ».`,
  },
  {
    path: SQL,
    title: 'Recherche plein texte dans Postgres',
    tags: ['sql', 'postgres', 'recherche'],
    summary: 'tsvector, tsquery, configuration française, unaccent et trigrammes pour les fautes.',
    content: `# Recherche plein texte

\`\`\`sql
select title
from notes
where search @@ websearch_to_tsquery('french', 'modèle osi')
order by ts_rank_cd(search, websearch_to_tsquery('french', 'modèle osi')) desc;
\`\`\`

- \`unaccent\` pour ignorer les accents.
- \`pg_trgm\` et \`word_similarity\` pour les fautes de frappe.
- \`ts_headline\` pour l'extrait surligné.`,
  },
  {
    path: ALGO,
    title: 'Complexité : notations O',
    tags: ['algo', 'complexité'],
    summary: 'Ordres de grandeur O(1), O(log n), O(n), O(n log n), O(n²) avec exemples.',
    content: `# Complexité

| Notation | Exemple |
| --- | --- |
| O(1) | accès à un tableau |
| O(log n) | recherche dichotomique |
| O(n) | parcours |
| O(n log n) | tri fusion |
| O(n²) | double boucle naïve |

On compte le pire cas, sauf mention contraire.`,
  },
  {
    path: ALGO,
    title: 'Parcours de graphe',
    tags: ['algo', 'graphes'],
    summary: 'Parcours en largeur et en profondeur, et à quoi sert chacun.',
    content: `# Parcours de graphe

- **Largeur** (file) : plus court chemin en nombre d'arêtes.
- **Profondeur** (pile ou récursion) : détection de cycle, tri topologique.

\`\`\`ts
function largeur(depart: string, voisins: Map<string, string[]>): string[] {
  const vus = new Set([depart]);
  const file = [depart];
  for (let i = 0; i < file.length; i += 1) {
    for (const v of voisins.get(file[i]!) ?? []) {
      if (!vus.has(v)) {
        vus.add(v);
        file.push(v);
      }
    }
  }
  return file;
}
\`\`\``,
  },
  {
    path: ALGO,
    title: 'Dijkstra',
    tags: ['algo', 'graphes', 'plus court chemin'],
    summary: 'Algorithme de Dijkstra avec file de priorité, poids positifs uniquement.',
    content: `Toujours prendre le sommet non traité le plus proche. Avec un tas binaire : O((V + E) log V). Ne marche pas avec des poids négatifs (Bellman-Ford dans ce cas).`,
  },
  {
    path: ALGO,
    title: 'Tri fusion et tri rapide',
    tags: ['algo', 'tri'],
    summary: 'Principe, complexité et stabilité du tri fusion et du tri rapide.',
    content: `# Tri fusion et tri rapide

**Fusion** : couper en deux, trier chaque moitié, fusionner. Toujours O(n log n), stable, mémoire en plus.

**Rapide** : choisir un pivot, partitionner, recommencer. O(n log n) en moyenne, O(n²) au pire, en place.`,
  },
  {
    path: PROBA,
    title: 'Loi binomiale',
    tags: ['maths', 'probabilités'],
    summary: 'Définition, espérance et variance de la loi binomiale, exemple du QCM.',
    content: `# Loi binomiale

X suit B(n, p) : nombre de succès en n essais indépendants de probabilité p.

- P(X = k) = C(n, k) p^k (1 - p)^(n - k)
- E(X) = np
- V(X) = np(1 - p)

Exemple : QCM de 20 questions à 4 choix au hasard, E(X) = 5.`,
  },
  {
    path: PROBA,
    title: 'Probabilités conditionnelles',
    tags: ['maths', 'probabilités', 'bayes'],
    summary: 'Formule de Bayes et arbre de probabilités sur l’exemple du test médical.',
    content: `P(A | B) = P(B | A) P(A) / P(B)

Test fiable à 99 %, maladie qui touche 1 personne sur 1000 : un test positif ne donne que 9 % de chances d'être malade.`,
  },
  {
    path: PROBA,
    title: 'Loi normale et intervalle de confiance',
    tags: ['maths', 'statistiques'],
    summary: 'Loi normale centrée réduite, règle 68-95-99,7 et intervalle de confiance à 95 %.',
    content: `# Loi normale

- 68 % des valeurs à un écart type de la moyenne
- 95 % à deux écarts types (1,96 exactement)
- 99,7 % à trois

Intervalle de confiance d'une proportion : p ± 1,96 √(p(1 - p) / n).`,
  },
  {
    path: 'Cours / Mathématiques',
    title: 'Matrices : produit et inverse',
    tags: ['maths', 'matrices'],
    summary: 'Règles du produit matriciel, déterminant 2x2 et inverse.',
    content: `Le produit n'est pas commutatif. Pour une matrice 2x2 [[a, b], [c, d]], det = ad - bc, inverse = 1/det × [[d, -b], [-c, a]].`,
  },
  {
    path: 'Cours / Mathématiques',
    title: 'Logique et ensembles',
    tags: ['maths', 'logique'],
    summary: 'Implication, contraposée, lois de De Morgan.',
    content: `- Contraposée de A ⇒ B : non B ⇒ non A (équivalente)
- Réciproque : B ⇒ A (pas équivalente)
- De Morgan : non (A et B) = non A ou non B`,
  },
];
