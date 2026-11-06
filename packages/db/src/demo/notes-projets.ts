import type { DemoNote } from './types';

const PN = 'Projets / Palanotes';
const IDEES = 'Projets / Palanotes / Idées';
const BUGS = 'Projets / Palanotes / Bugs';
const PS = 'Projets / PalaServer';
const PVE = 'Projets / PalaServer / Proxmox';
const SAV = 'Projets / PalaServer / Sauvegardes';
const JEU = 'Projets / Jeu multijoueur';
const GAME = 'Projets / Jeu multijoueur / Gameplay';

export const PROJECT_NOTES: DemoNote[] = [
  {
    path: PN,
    title: 'Feuille de route',
    tags: ['palanotes', 'roadmap'],
    summary: 'Les grandes étapes prévues pour l’app de notes, de la saisie à la recherche.',
    content: `# Feuille de route

## Fait

- [x] Saisie et pochette
- [x] Rangement proposé puis appliqué
- [x] Recherche plein texte

## Ensuite

- [ ] Explorateur en trois colonnes
- [ ] Glisser-déposer des notes
- [ ] Filtres de recherche

## Plus tard

- Recherche par le sens (embeddings sur PalaServer)
- Ouverture à quelques testeurs`,
  },
  {
    path: PN,
    title: 'Choix de la pile technique',
    tags: ['palanotes', 'stack'],
    summary: 'Pourquoi Next.js, Postgres, pg-boss et Drizzle pour l’app de notes.',
    content: `- **Next.js** : une seule app pour les pages et les routes.
- **Postgres** : la recherche plein texte suffit, pas besoin d'Elasticsearch.
- **pg-boss** : la file d'attente vit dans la même base.
- **Drizzle** : SQL lisible, migrations générées.`,
  },
  {
    path: PN,
    title: 'Notes de déploiement',
    tags: ['palanotes', 'déploiement', 'docker'],
    summary: 'Points à vérifier à chaque mise en production : migrations, santé, sauvegarde.',
    content: `# Notes de déploiement

1. La CI est verte sur \`main\`.
2. Les migrations passent (\`docker compose logs migrate\`).
3. \`/notes/api/health\` répond 200.
4. La sauvegarde de la nuit est sur le NAS.

> Ne jamais lancer de migration destructive sans sauvegarde fraîche.`,
  },
  {
    path: IDEES,
    title: 'Compteurs de notes par dossier',
    tags: ['palanotes', 'idée', 'dossiers'],
    summary: 'Afficher le nombre de notes directes et totales à côté de chaque dossier.',
    content: `Afficher « 3 · 12 » : trois notes directes, douze avec les sous-dossiers. Peut-être seulement le total, avec le détail au survol.`,
  },
  {
    path: IDEES,
    title: 'Raccourci pour écrire depuis le téléphone',
    tags: ['palanotes', 'idée', 'mobile'],
    summary: 'Ajouter l’app à l’écran d’accueil et ouvrir directement la page d’écriture.',
    content: `Manifest web avec \`start_url\` sur la page d'écriture, icône kraft. Tester sur Android et iOS.`,
  },
  {
    path: IDEES,
    title: 'Import des anciennes notes Keep',
    tags: ['palanotes', 'idée', 'import'],
    summary: 'Récupérer l’export Google Takeout de Keep et faire ranger chaque note.',
    content: `# Import des anciennes notes Keep

- Export Takeout : un fichier JSON par note.
- Chaque note devient une entrée, rangée comme une saisie normale.
- Garder la date d'origine.
- Environ 400 notes : rangement par paquets de 20 pour ne pas saturer.`,
  },
  {
    path: IDEES,
    title: 'Tags cliquables',
    tags: ['palanotes', 'idée', 'tags'],
    summary: 'Un clic sur un tag lance une recherche filtrée sur ce tag.',
    content: `Cliquer sur un tag dans une note ouvre la recherche filtrée sur ce tag.`,
  },
  {
    path: IDEES,
    title: 'Résumé de la semaine',
    tags: ['palanotes', 'idée'],
    summary: 'Idée : une liste des notes créées dans la semaine, sans texte rédigé.',
    content: `Une page « Cette semaine » avec les notes créées et modifiées, groupées par dossier. Pas de texte généré, juste la liste.`,
  },
  {
    path: BUGS,
    title: 'Le compteur de caractères saute sur mobile',
    tags: ['palanotes', 'bug', 'mobile'],
    summary: 'Sur téléphone, le compteur sous la zone d’écriture décale le bouton Valider.',
    content: `Reproduit sur Firefox Android. Le compteur passe sur deux lignes au-delà de 9 999 caractères. Corrigé avec \`tabular-nums\` et une largeur minimale.`,
  },
  {
    path: BUGS,
    title: 'Recherche : extrait vide pour les notes courtes',
    tags: ['palanotes', 'bug', 'recherche'],
    summary: 'Les notes d’une ligne n’affichent pas d’extrait dans les résultats.',
    content: `# Extrait vide

Cas : note « Code du portail : 4512 ». Le titre reprend tout le contenu, l'extrait retiré du titre est vide.

Correction : si l'extrait est vide, afficher le résumé.`,
  },
  {
    path: BUGS,
    title: 'Double envoi avec Ctrl+Entrée',
    tags: ['palanotes', 'bug'],
    summary: 'Un appui long sur Ctrl+Entrée créait deux entrées identiques.',
    content: `Le raccourci ne vérifiait pas l'envoi en cours. Bloqué tant que la requête n'a pas répondu.`,
  },
  {
    path: PS,
    title: 'Inventaire des services',
    tags: ['palaserver', 'infra'],
    summary: 'Liste des services qui tournent sur PalaServer, avec leur VM et leur adresse.',
    content: `# Inventaire des services

| Service | VM | Exposé |
| --- | --- | --- |
| Authentik | vm-apps | auth.palawi.fr |
| Notes | vm-apps | palawi.fr/notes |
| Nextcloud | vm-apps | drive.palawi.fr |
| Minecraft | vm-games | non |
| Home Assistant | vm-domo | non |
| Uptime Kuma | vm-apps | interne |`,
  },
  {
    path: PS,
    title: 'Mise à jour de l’onduleur',
    tags: ['palaserver', 'matériel'],
    summary: 'Configurer NUT pour éteindre proprement le serveur en cas de coupure.',
    content: `NUT en mode serveur sur l'hôte Proxmox, arrêt des VM à 30 % de batterie. Test de coupure fait : arrêt propre en 4 minutes.`,
  },
  {
    path: PS,
    title: 'Supervision : sondes et alertes',
    tags: ['palaserver', 'supervision'],
    summary: 'Sondes blackbox, Uptime Kuma et alertes sur le téléphone.',
    content: `- Sonde HTTP sur chaque service public, toutes les minutes.
- Alerte sur Discord après trois échecs.
- Tableau Homepage pour l'état général.`,
  },
  {
    path: PVE,
    title: 'Créer une VM depuis un modèle cloud-init',
    tags: ['proxmox', 'cloud-init'],
    summary: 'Étapes pour créer un modèle Debian cloud-init et cloner des VM en une commande.',
    content: `# Modèle cloud-init

\`\`\`sh
qm create 9000 --name debian-13-cloud --memory 2048 --net0 virtio,bridge=vmbr0
qm importdisk 9000 debian-13-genericcloud-amd64.qcow2 local-lvm
qm set 9000 --scsi0 local-lvm:vm-9000-disk-0 --ide2 local-lvm:cloudinit --boot order=scsi0
qm template 9000
qm clone 9000 120 --name vm-test --full
\`\`\`

Penser à agrandir le disque après le clonage.`,
  },
  {
    path: PVE,
    title: 'Passthrough du disque du NAS',
    tags: ['proxmox', 'stockage'],
    summary: 'Donner un disque physique entier à une VM par son identifiant stable.',
    content: `\`qm set 110 -scsi1 /dev/disk/by-id/ata-WDC_WD40EFPX-...\`. Toujours par \`by-id\`, jamais \`/dev/sdX\`.`,
  },
  {
    path: PVE,
    title: 'Réseau : ponts et VLAN',
    tags: ['proxmox', 'réseau', 'vlan'],
    summary: 'Pont Linux compatible VLAN et répartition des VM par VLAN.',
    content: `# Ponts et VLAN

- \`vmbr0\` VLAN-aware, tagué sur le port du switch.
- VLAN 10 : administration
- VLAN 20 : applications
- VLAN 30 : jeux
- VLAN 40 : domotique

Le pare-feu OPNsense route entre les VLAN.`,
  },
  {
    path: SAV,
    title: 'Stratégie 3-2-1',
    tags: ['sauvegardes', 'palaserver'],
    summary: 'Trois copies, deux supports, une hors site : comment c’est appliqué chez moi.',
    content: `# Stratégie 3-2-1

1. Les données sur le serveur.
2. Une copie quotidienne sur le NAS (Proxmox Backup Server).
3. Une copie hebdomadaire chiffrée hors site.

Restauration testée tous les trois mois, noter la date ici.

- Test de mars : OK, 12 minutes pour la VM apps.
- Test de juin : OK.`,
  },
  {
    path: SAV,
    title: 'Sauvegarde de la base des notes',
    tags: ['sauvegardes', 'postgres'],
    summary: 'pg_dump quotidien de la base des notes, rotation et contrôle de fraîcheur.',
    content: `\`\`\`sh
pg_dump -Fc -U palanotes palanotes > /backup/palanotes-$(date +%F).dump
\`\`\`

Garder 14 jours. Alerte si le dernier fichier a plus de 26 heures.`,
  },
  {
    path: SAV,
    title: 'Restauration : procédure',
    tags: ['sauvegardes', 'restauration'],
    summary: 'Procédure pas à pas pour restaurer une VM ou une base depuis le NAS.',
    content: `# Restauration

1. Arrêter le service concerné.
2. Restaurer dans une base temporaire.
3. Vérifier les dernières données.
4. Basculer, redémarrer.
5. Noter la durée totale ici.`,
  },
  {
    path: JEU,
    title: 'Architecture serveur autoritaire',
    tags: ['jeu', 'réseau', 'architecture'],
    summary:
      'Le serveur fait foi : le client envoie des intentions, le serveur valide et diffuse l’état.',
    content: `# Serveur autoritaire

- Le client envoie des **intentions** (« je veux avancer »), jamais des positions.
- Le serveur simule à 20 ticks par seconde.
- Le client prédit son propre mouvement et corrige à la réception.
- Les autres joueurs sont interpolés avec 100 ms de retard.`,
  },
  {
    path: JEU,
    title: 'Choix du moteur',
    tags: ['jeu', 'moteur'],
    summary: 'Comparaison rapide de Godot et d’un moteur maison en TypeScript.',
    content: `Godot 4 pour le client, serveur Node en TypeScript pour la logique partagée. Décision à revoir après le prototype.`,
  },
  {
    path: GAME,
    title: 'Boucle de jeu d’une manche',
    tags: ['jeu', 'gameplay'],
    summary: 'Déroulé d’une manche : préparation, exploration, affrontement, score.',
    content: `# Boucle d'une manche

1. **Préparation** (30 s) : choix de l'équipement.
2. **Exploration** (3 min) : récolte de ressources.
3. **Affrontement** : la zone se resserre.
4. **Score** : points par ressource et par survie.`,
  },
  {
    path: GAME,
    title: 'Équilibrage des classes',
    tags: ['jeu', 'gameplay', 'équilibrage'],
    summary: 'Points de vie, vitesse et dégâts des trois classes du prototype.',
    content: `| Classe | Vie | Vitesse | Dégâts |
| --- | --- | --- | --- |
| Éclaireur | 80 | 1,3 | 8 |
| Gardien | 140 | 0,9 | 10 |
| Artificier | 100 | 1,0 | 14 |

Le gardien gagne trop souvent en duel, baisser sa vie à 125.`,
  },
  {
    path: GAME,
    title: 'Idées de pièges',
    tags: ['jeu', 'gameplay', 'idée'],
    summary: 'Pièges posables : mine sonore, filet, fausse ressource.',
    content: `- Mine sonore : révèle la position des joueurs proches
- Filet : ralentit 3 secondes
- Fausse ressource : explose quand on la ramasse`,
  },
];
