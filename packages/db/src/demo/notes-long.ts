import type { DemoNote } from './types';

export const LONG_NOTES: DemoNote[] = [
  {
    path: 'Cours / Réseau',
    title: 'Synthèse de révision : réseau, semestre 1',
    tags: ['réseau', 'révisions', 'synthèse', 'partiel'],
    summary:
      'Fiche de révision complète du semestre de réseau : modèles, adressage, transport, routage, services et sécurité.',
    content: `# Synthèse de révision : réseau, semestre 1

Fiche à relire la veille du partiel. Les détails sont dans les notes de chaque chapitre.

## 1. Modèles en couches

Le modèle OSI a sept couches, le modèle TCP/IP en a quatre (accès réseau, internet, transport, application). Chaque couche ajoute son en-tête : c'est l'**encapsulation**. À la réception, chaque couche retire le sien.

| OSI | TCP/IP | Unité | Équipement |
| --- | --- | --- | --- |
| 7, 6, 5 | Application | message | passerelle |
| 4 | Transport | segment | pare-feu à états |
| 3 | Internet | paquet | routeur |
| 2, 1 | Accès réseau | trame, bit | switch, câble |

## 2. Adressage IPv4

- 32 bits, notation décimale pointée.
- Le masque sépare partie réseau et partie hôte.
- Nombre d'hôtes : \`2^(32 - n) - 2\`.
- Adresses privées : \`10/8\`, \`172.16/12\`, \`192.168/16\`.

Méthode pour découper un réseau :

1. Compter les hôtes nécessaires dans le plus grand sous-réseau.
2. Prendre la puissance de deux au-dessus (en comptant réseau et broadcast).
3. En déduire le masque, puis enchaîner les plages en commençant par la plus grande.

Exemple : 50, 20 et 10 hôtes dans \`192.168.10.0/24\` donnent \`/26\`, \`/27\` et \`/28\` :

- \`192.168.10.0/26\` (62 hôtes)
- \`192.168.10.64/27\` (30 hôtes)
- \`192.168.10.96/28\` (14 hôtes)

## 3. IPv6 en bref

- 128 bits, hexadécimal, \`::\` une seule fois.
- Toujours une adresse link-local en \`fe80::/10\`.
- Pas de broadcast : du multicast.
- Autoconfiguration SLAAC à partir du préfixe annoncé.

## 4. Transport

**TCP** : connexion (SYN, SYN-ACK, ACK), numéros de séquence, accusés, retransmission, fenêtre glissante, contrôle de congestion (slow start puis évitement, division par deux sur perte).

**UDP** : 8 octets d'en-tête, pas d'état, pas de garantie. Idéal quand la fraîcheur compte plus que la complétude (voix, jeu, DNS).

> Piège classique : la fenêtre de réception (contrôle de flux, côté récepteur) n'est pas la fenêtre de congestion (côté réseau).

## 5. Routage

- Le préfixe le plus long gagne.
- Statique : simple, mais rien ne bouge en cas de panne.
- RIP : vecteur de distance, nombre de sauts, lent à converger.
- OSPF : état de liens, Dijkstra, zones, coût lié au débit.
- BGP : entre systèmes autonomes, selon des politiques.

\`\`\`sh
ip route show
traceroute palawi.fr
\`\`\`

## 6. Services

| Service | Port | Transport | Rôle |
| --- | --- | --- | --- |
| DNS | 53 | UDP (TCP si gros) | noms vers adresses |
| DHCP | 67, 68 | UDP | configuration automatique |
| HTTP | 80 | TCP | web |
| HTTPS | 443 | TCP (ou QUIC) | web chiffré |
| SSH | 22 | TCP | administration |

DHCP se déroule en quatre messages (DORA). DNS résout de la racine vers le serveur qui fait autorité, avec un cache réglé par le TTL.

## 7. Sécurité

- **TLS** : authentifie le serveur par certificat, chiffre la session, forward secrecy avec les clés éphémères.
- **Pare-feu à états** : politique par défaut à refuser, retour autorisé par le suivi de connexion.
- **VPN** : WireGuard pour un poste ou un petit site, IPsec entre équipements.
- **Attaques locales** : ARP spoofing, DHCP pirate, VLAN hopping, et leurs contre-mesures sur les switchs.

## 8. Questions qui tombent souvent

1. Pourquoi la poignée de main TCP a trois messages ?
2. Calculer le nombre de sous-réseaux et d'hôtes pour un masque donné.
3. Lire une table de routage et dire par où part un paquet.
4. Expliquer la différence entre un switch et un routeur.
5. Donner le déroulé d'une requête DNS.
6. Écrire une règle de pare-feu qui n'autorise que SSH et HTTPS.

## 9. Planning des révisions

- [x] Lundi : adressage, exercices de sous-réseaux
- [x] Mardi : transport et TCP
- [ ] Mercredi : routage, refaire le TP
- [ ] Jeudi : services et sécurité
- [ ] Vendredi : annales des deux dernières années`,
  },
  {
    path: 'Projets / Palanotes',
    title: 'Cahier des charges de l’explorateur',
    tags: ['palanotes', 'explorateur', 'spécification'],
    summary:
      'Spécification de l’explorateur de notes : trois colonnes, mobile, glisser-déposer, actions sur les dossiers, tri et compteurs.',
    content: `# Cahier des charges de l'explorateur

## Contexte

Avec plus de deux cents notes, la vue des dossiers ne suffit plus : tout est au même niveau, sans repère. L'explorateur doit permettre de trouver une note sans chercher, et de ranger à la main ce que le rangement automatique a mal placé.

## Ordinateur

Trois colonnes :

1. **Arborescence** à gauche : dossiers imbriqués, chevrons pour replier, dossier courant bien visible, compteur de notes.
2. **Liste** au milieu : titre, extrait d'une ligne, tags, date. Tri par date de modification, date de création ou titre.
3. **Note** à droite : lecture directe, sans quitter la liste.

Les colonnes doivent rester lisibles en 1280 et 1440 pixels.

## Téléphone

Navigation empilée : dossiers, puis notes, puis note. Un bouton retour et un fil d'Ariane en haut.

## Ranger à la main

- Glisser une note sur un dossier de l'arborescence.
- Glisser un dossier dans un autre (jamais dans lui-même ou un de ses enfants).
- Sans souris : « Déplacer vers… » avec un sélecteur de dossier.

## Actions sur les dossiers

| Action | Règle |
| --- | --- |
| Créer | nom unique parmi les frères |
| Renommer | idem |
| Déplacer | pas dans un descendant |
| Fusionner | notes et sous-dossiers vont dans la cible |
| Supprimer | seulement si vide, avec confirmation |

## Critères d'acceptation

- [ ] L'arbre se navigue aux flèches.
- [ ] Un lecteur d'écran annonce le dossier et son niveau.
- [ ] Un déplacement est annoncé.
- [ ] La liste reste fluide avec trois cents notes.
- [ ] Rien n'est supprimé par erreur : aucune note ne disparaît par une action sur un dossier.

## Hors périmètre

- Palette de commandes.
- Partage de dossiers.
- Sélection multiple (peut-être plus tard).`,
  },
  {
    path: 'Perso / Voyages / Bretagne',
    title: 'Carnet de voyage : une semaine dans le Finistère',
    tags: ['bretagne', 'voyage', 'carnet', 'randonnée'],
    summary:
      'Récit jour par jour d’une semaine dans le Finistère : presqu’île de Crozon, Ouessant, Locronan, avec les adresses à retenir.',
    content: `# Carnet de voyage : une semaine dans le Finistère

## Samedi : arrivée à Crozon

Train jusqu'à Brest puis car. Arrivés au gîte vers 18 h, vue sur la baie de Morgat. Premier dîner : galettes complètes et cidre brut.

## Dimanche : pointe de Pen-Hir

Boucle de 12 km par le GR34 depuis Camaret. Vent très fort sur la pointe, les Tas de Pois dans la brume. Pique-nique abrité derrière le monument.

- Distance : 12 km
- Dénivelé : 280 m
- Difficulté : facile, mais prévoir un coupe-vent

## Lundi : grottes de Morgat

Sortie en bateau pour les grottes marines, une heure. Les couleurs de la roche changent avec la lumière. L'après-midi : plage de l'Île-Vierge, accès par un sentier raide.

> Réserver le bateau la veille, c'était complet le matin même.

## Mardi : Ouessant

Départ du Conquet à 9 h 45, une heure de traversée, mer agitée. Location de vélos au port de Stiff.

1. Phare du Créac'h et son musée des phares et balises.
2. Pointe de Pern, les rochers les plus à l'ouest.
3. Crêpes au bourg de Lampaul.

Retour à 18 h, tout le monde a dormi dans le bateau.

## Mercredi : pluie et Locronan

Journée de pluie. Locronan, ses maisons de granit et sa place pavée, puis Quimper : cathédrale et musée départemental breton.

## Jeudi : Cap de la Chèvre

Boucle de 9 km, beaucoup de bruyère et d'ajoncs. Phoques aperçus au loin avec les jumelles.

## Vendredi : marché et retour

Marché de Crozon le matin : kouign-amann, sardines en boîte pour les amis, sel de Guérande.

## Bilan

| Poste | Dépense |
| --- | --- |
| Train | 140 € |
| Gîte (6 nuits, à trois) | 210 € |
| Bateaux | 65 € |
| Repas | 160 € |
| Vélos et divers | 40 € |

À refaire : Ouessant en dormant sur place, pour voir le phare la nuit.`,
  },
  {
    path: 'Cours / Développement / Bases de données',
    title: 'Projet de BDD : schéma d’une médiathèque',
    tags: ['bdd', 'projet', 'sql', 'modélisation'],
    summary:
      'Projet de modélisation d’une médiathèque : entités, schéma relationnel, contraintes, requêtes demandées et index.',
    content: `# Projet de BDD : schéma d'une médiathèque

## Sujet

Modéliser la base d'une médiathèque : documents (livres, DVD, revues), exemplaires, adhérents, emprunts, réservations. Rendu : schéma, script SQL, dix requêtes.

## Entités

- **document** (id, titre, type, année, éditeur)
- **auteur** (id, nom, prénom)
- **exemplaire** (id, document_id, cote, état)
- **adherent** (id, nom, prénom, e-mail, date d'inscription)
- **emprunt** (id, exemplaire_id, adherent_id, date de sortie, date de retour prévue, date de retour)
- **reservation** (id, document_id, adherent_id, date)

Un document a plusieurs auteurs et un auteur plusieurs documents : table d'association \`document_auteur\`.

## Script

\`\`\`sql
create table document (
  id bigint generated always as identity primary key,
  titre text not null,
  type text not null check (type in ('livre', 'dvd', 'revue')),
  annee int check (annee between 1450 and 2100)
);

create table exemplaire (
  id bigint generated always as identity primary key,
  document_id bigint not null references document (id),
  cote text not null unique,
  etat text not null default 'bon'
);

create table emprunt (
  id bigint generated always as identity primary key,
  exemplaire_id bigint not null references exemplaire (id),
  adherent_id bigint not null references adherent (id),
  sortie date not null default current_date,
  retour_prevu date not null,
  retour date,
  check (retour is null or retour >= sortie)
);

-- Un exemplaire ne peut avoir qu'un emprunt en cours.
create unique index emprunt_en_cours on emprunt (exemplaire_id) where retour is null;
\`\`\`

## Requêtes demandées

1. Les documents jamais empruntés.
2. Les adhérents en retard, avec le nombre de jours.
3. Le top 10 des documents les plus empruntés sur l'année.
4. Le nombre d'emprunts par mois (fonction de fenêtre pour le cumul).
5. Les exemplaires disponibles d'un document.

\`\`\`sql
select a.nom, a.prenom, current_date - e.retour_prevu as jours_de_retard
from emprunt e
join adherent a on a.id = e.adherent_id
where e.retour is null and e.retour_prevu < current_date
order by jours_de_retard desc;
\`\`\`

## Index

- \`emprunt (adherent_id)\` pour l'historique d'un adhérent.
- \`emprunt (retour_prevu) where retour is null\` pour les retards.
- \`exemplaire (document_id)\` pour la disponibilité.

## Répartition dans le groupe

| Partie | Qui |
| --- | --- |
| Modèle conceptuel | moi |
| Script et contraintes | Léa |
| Requêtes 1 à 5 | Hugo |
| Requêtes 6 à 10 | moi |
| Rapport | tout le monde |

Rendu le vendredi avant les vacances, soutenance de dix minutes.`,
  },
];
