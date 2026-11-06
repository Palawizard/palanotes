import type { DemoNote } from './types';

const TCP = 'Cours / Réseau / TCP-IP';
const TRANSPORT = 'Cours / Réseau / TCP-IP / Couche transport';
const ROUTAGE = 'Cours / Réseau / TCP-IP / Routage';
const SECU = 'Cours / Réseau / Sécurité réseau';
const FW = 'Cours / Réseau / Sécurité réseau / Pare-feu';

export const NETWORK_NOTES: DemoNote[] = [
  {
    path: 'Cours / Réseau',
    title: 'Modèle OSI en sept couches',
    tags: ['réseau', 'osi', 'révisions'],
    summary: 'Les sept couches du modèle OSI, leur rôle et un exemple de protocole pour chacune.',
    content: `# Modèle OSI en sept couches

Moyen mnémotechnique : « Pour Le Réseau, Tout Se Passe Automatiquement ».

| Couche | Nom | Exemple |
| --- | --- | --- |
| 7 | Application | HTTP, DNS, SMTP |
| 6 | Présentation | TLS, encodage |
| 5 | Session | RPC |
| 4 | Transport | TCP, UDP |
| 3 | Réseau | IP, ICMP |
| 2 | Liaison | Ethernet, Wi-Fi |
| 1 | Physique | câble, fibre |

## À retenir

- Chaque couche ne parle qu'à ses voisines directes.
- L'encapsulation ajoute un en-tête à chaque descente.
- En pratique on raisonne surtout en modèle TCP/IP (4 couches).

> Le prof insiste : savoir placer un équipement (switch = couche 2, routeur = couche 3).`,
  },
  {
    path: 'Cours / Réseau',
    title: 'Vocabulaire réseau à connaître',
    tags: ['réseau', 'vocabulaire'],
    summary: 'Petit glossaire : trame, paquet, segment, MTU, latence, débit.',
    content: `- **Trame** : unité de la couche liaison
- **Paquet** : unité de la couche réseau
- **Segment** : unité TCP (datagramme pour UDP)
- **MTU** : taille max d'une trame, 1500 octets en Ethernet
- **Latence** : temps aller, à ne pas confondre avec le débit`,
  },
  {
    path: TCP,
    title: 'Adressage IPv4 et masques',
    tags: ['ipv4', 'sous-réseaux', 'masque'],
    summary: 'Calcul des sous-réseaux IPv4, notation CIDR et nombre d’hôtes par masque.',
    content: `# Adressage IPv4 et masques

Une adresse IPv4 fait 32 bits, écrite en quatre octets : \`192.168.1.10\`.

## Notation CIDR

\`/24\` veut dire que les 24 premiers bits sont la partie réseau.

| Masque | CIDR | Hôtes utilisables |
| --- | --- | --- |
| 255.255.255.0 | /24 | 254 |
| 255.255.255.128 | /25 | 126 |
| 255.255.255.192 | /26 | 62 |
| 255.255.255.224 | /27 | 30 |
| 255.255.255.252 | /30 | 2 |

Formule : \`2^(32 - n) - 2\` (on retire l'adresse réseau et le broadcast).

## Exemple de TD

Découper \`10.0.0.0/24\` en quatre sous-réseaux :

1. \`10.0.0.0/26\`
2. \`10.0.0.64/26\`
3. \`10.0.0.128/26\`
4. \`10.0.0.192/26\`

## Plages privées

- \`10.0.0.0/8\`
- \`172.16.0.0/12\`
- \`192.168.0.0/16\``,
  },
  {
    path: TCP,
    title: 'ARP et table de voisinage',
    tags: ['arp', 'réseau'],
    summary: 'Comment ARP associe une adresse IP à une adresse MAC sur le réseau local.',
    content: `ARP demande en broadcast « qui a 192.168.1.1 ? », la machine concernée répond avec sa MAC.

\`\`\`sh
ip neigh show
arp -a
\`\`\`

Attention à l'ARP spoofing : une machine peut répondre à la place du routeur.`,
  },
  {
    path: TCP,
    title: 'DNS : résolution pas à pas',
    tags: ['dns', 'réseau'],
    summary:
      'Chemin d’une requête DNS du résolveur local aux serveurs racine, et types d’enregistrements.',
    content: `# DNS : résolution pas à pas

1. Le navigateur demande au résolveur (box ou 1.1.1.1).
2. Le résolveur interroge la racine, qui renvoie vers \`.fr\`.
3. Le serveur \`.fr\` renvoie vers les serveurs du domaine.
4. Le serveur faisant autorité répond avec l'enregistrement.

## Types d'enregistrements

- \`A\` / \`AAAA\` : adresse IPv4 / IPv6
- \`CNAME\` : alias
- \`MX\` : serveur mail
- \`TXT\` : texte libre (SPF, vérifications)

\`\`\`sh
dig palawi.fr A +short
dig -x 1.1.1.1
\`\`\`

Le TTL dit combien de temps garder la réponse en cache.`,
  },
  {
    path: TCP,
    title: 'DHCP en quatre messages',
    tags: ['dhcp', 'réseau'],
    summary: 'Le dialogue DORA : Discover, Offer, Request, Ack.',
    content: `**DORA** : Discover (broadcast), Offer, Request, Ack.

Le bail a une durée ; le client renouvelle à 50 %.`,
  },
  {
    path: TCP,
    title: 'IPv6 : les bases',
    tags: ['ipv6', 'réseau'],
    summary: 'Format des adresses IPv6, abréviations, adresses link-local et SLAAC.',
    content: `# IPv6 : les bases

128 bits, écrits en huit groupes hexadécimaux : \`2001:0db8:0000:0000:0000:0000:0000:0001\`.

## Abréviations

- On retire les zéros en tête de groupe : \`2001:db8:0:0:0:0:0:1\`
- Une seule suite de groupes nuls devient \`::\` : \`2001:db8::1\`

## Types d'adresses

- \`fe80::/10\` : link-local, toujours présente
- \`2000::/3\` : globales
- \`::1\` : boucle locale

SLAAC : la machine fabrique son adresse à partir du préfixe annoncé par le routeur.`,
  },
  {
    path: TRANSPORT,
    title: 'TCP : poignée de main en trois temps',
    tags: ['tcp', 'transport'],
    summary: 'Ouverture de connexion TCP (SYN, SYN-ACK, ACK) et fermeture en quatre temps.',
    content: `# TCP : poignée de main en trois temps

\`\`\`
Client            Serveur
  | --- SYN ------> |
  | <-- SYN-ACK --- |
  | --- ACK ------> |
\`\`\`

Les numéros de séquence initiaux sont aléatoires (protection contre l'usurpation).

## Fermeture

FIN, ACK, FIN, ACK. L'état \`TIME_WAIT\` dure deux fois la durée de vie max d'un segment.

## Questions d'examen

- Pourquoi trois messages et pas deux ? Pour que chaque côté confirme le numéro de séquence de l'autre.
- Qu'est-ce qu'une attaque SYN flood ?`,
  },
  {
    path: TRANSPORT,
    title: 'TCP contre UDP',
    tags: ['tcp', 'udp', 'transport'],
    summary: 'Comparaison TCP et UDP : fiabilité, ordre, coût, usages typiques.',
    content: `| | TCP | UDP |
| --- | --- | --- |
| Connexion | oui | non |
| Fiabilité | accusés, retransmission | aucune |
| Ordre | garanti | non |
| En-tête | 20 octets | 8 octets |
| Usages | web, ssh, mail | DNS, jeux, visio |

QUIC refait la fiabilité au-dessus d'UDP.`,
  },
  {
    path: TRANSPORT,
    title: 'Contrôle de congestion',
    tags: ['tcp', 'congestion'],
    summary: 'Slow start, évitement de congestion, fenêtre et réaction aux pertes.',
    content: `# Contrôle de congestion

- **Slow start** : la fenêtre double à chaque aller-retour jusqu'au seuil.
- **Évitement** : ensuite +1 segment par aller-retour.
- **Perte détectée** (trois ACK dupliqués) : la fenêtre est divisée par deux.
- **Timeout** : retour à une fenêtre de 1.

Courbe en dents de scie typique de Reno. Cubic est l'algorithme par défaut sous Linux.

\`\`\`sh
sysctl net.ipv4.tcp_congestion_control
\`\`\``,
  },
  {
    path: TRANSPORT,
    title: 'Ports à connaître par cœur',
    tags: ['ports', 'révisions'],
    summary: 'Liste des ports bien connus demandés au partiel.',
    content: `- 22 SSH
- 25 SMTP
- 53 DNS
- 80 HTTP
- 443 HTTPS
- 3306 MySQL
- 5432 PostgreSQL`,
  },
  {
    path: ROUTAGE,
    title: 'Routage statique et table de routage',
    tags: ['routage', 'réseau'],
    summary: 'Lire une table de routage, route par défaut, préfixe le plus long.',
    content: `# Routage statique

La règle : **le préfixe le plus long gagne**.

\`\`\`sh
ip route show
ip route add 10.10.0.0/16 via 192.168.1.254
\`\`\`

| Destination | Passerelle | Interface |
| --- | --- | --- |
| 0.0.0.0/0 | 192.168.1.1 | eth0 |
| 10.10.0.0/16 | 192.168.1.254 | eth0 |
| 192.168.1.0/24 | directe | eth0 |`,
  },
  {
    path: ROUTAGE,
    title: 'OSPF : états et zones',
    tags: ['ospf', 'routage'],
    summary: 'Fonctionnement d’OSPF : voisinage, LSA, calcul de Dijkstra et zone 0.',
    content: `# OSPF

Protocole à état de liens : chaque routeur connaît la carte entière de sa zone et calcule les plus courts chemins avec Dijkstra.

## États du voisinage

Down, Init, 2-Way, ExStart, Exchange, Loading, Full.

## Zones

- La zone 0 est le cœur, toutes les autres s'y raccordent.
- Un routeur de bordure (ABR) résume les routes entre zones.

Coût par défaut : 10^8 / débit.`,
  },
  {
    path: ROUTAGE,
    title: 'BGP en deux phrases',
    tags: ['bgp', 'routage'],
    summary: 'BGP relie les systèmes autonomes d’internet selon des politiques.',
    content: `BGP échange des routes entre systèmes autonomes (AS). Il choisit selon des politiques, pas selon la distance.`,
  },
  {
    path: ROUTAGE,
    title: 'TP routage : maquette trois routeurs',
    tags: ['tp', 'routage', 'packet tracer'],
    summary: 'Compte rendu du TP de routage statique puis OSPF sur trois routeurs.',
    content: `# TP routage : maquette trois routeurs

## Objectif

Relier trois LAN par trois routeurs, d'abord en statique, puis en OSPF.

## Étapes

1. Adresser les interfaces (\`10.1.12.0/30\`, \`10.1.23.0/30\`, \`10.1.13.0/30\`).
2. Ajouter les routes statiques, tester avec \`ping\` et \`traceroute\`.
3. Supprimer les routes, activer OSPF zone 0.
4. Couper un lien et observer la reconvergence.

## Ce qui a coincé

- Oubli du \`no shutdown\` sur R2.
- Masque en /24 au lieu de /30 sur un lien : les voisins ne montaient pas.

Temps de reconvergence mesuré : environ 4 secondes.`,
  },
  {
    path: SECU,
    title: 'TLS : ce qui se passe à la connexion',
    tags: ['tls', 'sécurité', 'https'],
    summary: 'Négociation TLS 1.3, certificats, chaîne de confiance et forward secrecy.',
    content: `# TLS 1.3

1. ClientHello : versions, suites, clé éphémère.
2. ServerHello + certificat + signature.
3. Les deux côtés dérivent les clés de session.

Un seul aller-retour, contre deux en TLS 1.2.

## Chaîne de confiance

Certificat du site, signé par une autorité intermédiaire, signée par une racine présente dans le navigateur.

> Forward secrecy : voler la clé privée du serveur plus tard ne permet pas de déchiffrer les anciennes sessions.`,
  },
  {
    path: SECU,
    title: 'Attaques courantes sur un réseau local',
    tags: ['sécurité', 'attaques'],
    summary: 'ARP spoofing, DHCP pirate, VLAN hopping et contre-mesures.',
    content: `- **ARP spoofing** : inspection ARP dynamique
- **DHCP pirate** : DHCP snooping sur les switchs
- **VLAN hopping** : désactiver le DTP, VLAN natif inutilisé
- **MAC flooding** : port security`,
  },
  {
    path: SECU,
    title: 'VPN : IPsec ou WireGuard',
    tags: ['vpn', 'wireguard', 'ipsec'],
    summary: 'Comparaison rapide d’IPsec et WireGuard pour relier des sites ou des postes.',
    content: `# VPN : IPsec ou WireGuard

WireGuard : quelques milliers de lignes, clés publiques comme SSH, très rapide.

\`\`\`ini
[Interface]
PrivateKey = ...
Address = 10.8.0.2/24

[Peer]
PublicKey = ...
Endpoint = vpn.example.org:51820
AllowedIPs = 10.8.0.0/24
\`\`\`

IPsec reste la norme entre équipements d'entreprise.`,
  },
  {
    path: FW,
    title: 'nftables : règles de base',
    tags: ['nftables', 'pare-feu', 'linux'],
    summary: 'Jeu de règles nftables minimal pour un serveur : SSH, HTTP, HTTPS, le reste refusé.',
    content: `# nftables : règles de base

\`\`\`
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    ct state established,related accept
    iif lo accept
    tcp dport { 22, 80, 443 } accept
    icmp type echo-request limit rate 5/second accept
  }
}
\`\`\`

- Politique par défaut : **drop**.
- Toujours garder une console ouverte avant d'appliquer.

\`\`\`sh
nft -f /etc/nftables.conf
nft list ruleset
\`\`\``,
  },
  {
    path: FW,
    title: 'Pare-feu à états',
    tags: ['pare-feu', 'conntrack'],
    summary: 'Pourquoi le suivi de connexion simplifie les règles d’un pare-feu.',
    content: `Le pare-feu se souvient des connexions ouvertes (conntrack) : les réponses passent sans règle dédiée.`,
  },
  {
    path: FW,
    title: 'OPNsense : alias et règles',
    tags: ['opnsense', 'pare-feu'],
    summary: 'Organisation des règles OPNsense avec des alias par service et par réseau.',
    content: `# OPNsense : alias et règles

- Un alias par groupe de ports (\`web\` = 80, 443).
- Un alias par réseau (\`lan_admin\`, \`vm_apps\`).
- Les règles se lisent de haut en bas, la première qui correspond gagne.
- Journaliser les refus sur l'interface WAN seulement, sinon le journal déborde.`,
  },
];
