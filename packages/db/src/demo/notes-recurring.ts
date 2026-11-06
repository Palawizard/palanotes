import type { Random } from './random';
import type { DemoNote } from './types';

const DAY = 86_400_000;

const longDate = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Paris',
});
const shortDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Paris',
});

function dayBefore(now: Date, daysAgo: number): Date {
  return new Date(now.getTime() - daysAgo * DAY);
}

// Spreads `count` days over the last `span` days, oldest first, never on the same day.
function spreadDays(random: Random, count: number, span: number, minGap = 1): number[] {
  const days = new Set<number>();
  while (days.size < count) {
    const day = random.int(1, span);
    if ([...days].every((other) => Math.abs(other - day) >= minGap)) {
      days.add(day);
    }
  }
  return [...days].sort((a, b) => b - a);
}

const MOODS = [
  'Journée calme',
  'Grosse journée',
  'Fatigué mais content',
  'Journée productive',
  'Un peu dispersé aujourd’hui',
  'Bonne énergie',
];
const EVENTS = [
  'Cours de réseau le matin, TD de sous-réseaux l’après-midi.',
  'Révisions à la bibliothèque, trois heures sans téléphone.',
  'Séance de course au parc, 7 km.',
  'Appel avec la famille le soir.',
  'Avancé sur le prototype du jeu : la prédiction côté client marche.',
  'Réglé un souci de sauvegarde sur PalaServer.',
  'Repas avec Léa et Hugo, pizza maison.',
  'Lu cinquante pages de Monte-Cristo.',
  'Courses faites, frigo rempli pour la semaine.',
  'Ménage et lessive, rien d’autre.',
  'Partiel blanc de probabilités, plutôt bien passé.',
  'Réunion de projet en visio, on a découpé le travail.',
  'Balade le long du canal au coucher du soleil.',
  'Testé une nouvelle recette de dahl.',
  'Migré une VM vers le nouveau modèle cloud-init.',
];
const LEARNED = [
  'Le préfixe le plus long gagne dans une table de routage.',
  'unaccent n’est pas immuable, d’où le trigger pour la recherche.',
  'Une fenêtre TCP divisée par deux à chaque perte, ça se voit sur les graphes.',
  'Le far breton se fait sans levure.',
  'systemctl list-timers montre la prochaine exécution.',
  'En japonais, sumimasen sert à presque tout.',
  'Les fonctions de fenêtre évitent une sous-requête.',
];

function journal(random: Random, now: Date): DemoNote[] {
  return spreadDays(random, 70, 360).map((daysAgo) => {
    const date = dayBefore(now, daysAgo);
    const label = longDate.format(date);
    const events = random.sample(EVENTS, random.int(1, 3));
    const lines = [
      `# ${label.charAt(0).toUpperCase()}${label.slice(1)}`,
      '',
      `${random.pick(MOODS)}.`,
      '',
      ...events.map((event) => `- ${event}`),
    ];
    if (random.next() < 0.4) {
      lines.push('', `Appris : ${random.pick(LEARNED)}`);
    }
    if (random.next() < 0.25) {
      lines.push('', '> À faire demain : relire les notes du cours et répondre aux e-mails.');
    }
    return {
      path: 'Perso / Journal',
      title: `Journal du ${shortDate.format(date)}`,
      tags: ['journal'],
      summary: `Notes de la journée : ${events[0]?.toLowerCase().replace(/\.$/, '') ?? ''}.`,
      content: lines.join('\n'),
      daysAgo,
    };
  });
}

const GROCERIES = [
  'pâtes',
  'riz basmati',
  'lentilles corail',
  'lait',
  'œufs',
  'beurre',
  'pain',
  'yaourts',
  'pommes',
  'bananes',
  'tomates',
  'courgettes',
  'oignons',
  'ail',
  'parmesan',
  'lait de coco',
  'café',
  'thé',
  'farine',
  'chocolat noir',
  'liquide vaisselle',
  'papier toilette',
  'lessive',
  'éponges',
  'jambon',
  'poulet',
  'saumon',
  'haricots noirs',
  'tortillas',
  'avocats',
  'citrons',
];

function groceries(random: Random, now: Date): DemoNote[] {
  return spreadDays(random, 42, 360, 3).map((daysAgo) => {
    const date = dayBefore(now, daysAgo);
    const items = random.sample(GROCERIES, random.int(4, 12));
    const done = random.next() < 0.8;
    return {
      path: 'Courses',
      title: `Courses du ${shortDate.format(date)}`,
      tags: ['courses'],
      summary: `Liste de courses : ${items.slice(0, 3).join(', ')}…`,
      content: items.map((item) => `- [${done ? 'x' : ' '}] ${item}`).join('\n'),
      daysAgo,
    };
  });
}

function runs(random: Random, now: Date): DemoNote[] {
  const kinds = [
    { name: 'Sortie facile', pace: [6.0, 6.4] },
    { name: 'Fractionné', pace: [5.0, 5.4] },
    { name: 'Sortie longue', pace: [5.9, 6.3] },
    { name: 'Tempo', pace: [5.3, 5.6] },
  ] as const;
  return spreadDays(random, 32, 330, 2).map((daysAgo) => {
    const date = dayBefore(now, daysAgo);
    const kind = random.pick(kinds);
    const km = kind.name === 'Sortie longue' ? random.int(10, 17) : random.int(5, 9);
    const pace = kind.pace[0] + random.next() * (kind.pace[1] - kind.pace[0]);
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    const paceText = `${minutes} min ${String(seconds).padStart(2, '0')}`;
    const feel = random.pick([
      'Jambes lourdes au début, mieux après 3 km.',
      'Très bonnes sensations.',
      'Vent de face au retour.',
      'Point de côté vers le 5e km.',
      'Pluie fine, agréable.',
    ]);
    return {
      path: 'Perso / Sport / Course à pied',
      title: `${kind.name} du ${shortDate.format(date)}`,
      tags: ['course', 'séance'],
      summary: `${kind.name} de ${km} km à ${paceText} au kilomètre.`,
      content: `- Distance : ${km} km\n- Allure : ${paceText} / km\n- Ressenti : ${feel}`,
      daysAgo,
    };
  });
}

function workouts(random: Random, now: Date): DemoNote[] {
  return spreadDays(random, 22, 300, 3).map((daysAgo, index) => {
    const date = dayBefore(now, daysAgo);
    const upper = index % 2 === 0;
    const base = 40 + index;
    const rows = upper
      ? [
          `| Développé couché | 4 × 6 | ${base} kg |`,
          `| Rowing barre | 4 × 8 | ${base - 5} kg |`,
          `| Tractions | 3 × ${random.int(4, 9)} | poids du corps |`,
        ]
      : [
          `| Squat | 4 × 6 | ${base + 15} kg |`,
          `| Soulevé de terre roumain | 3 × 8 | ${base + 5} kg |`,
          `| Fentes | 3 × 10 | ${random.int(8, 14)} kg |`,
        ];
    return {
      path: 'Perso / Sport / Musculation',
      title: `Séance ${upper ? 'haut' : 'bas'} du ${shortDate.format(date)}`,
      tags: ['musculation', 'séance'],
      summary: `Séance ${upper ? 'haut du corps' : 'bas du corps'}, charges notées.`,
      content: ['| Exercice | Séries | Charge |', '| --- | --- | --- |', ...rows].join('\n'),
      daysAgo,
    };
  });
}

const VOCAB: readonly [string, string][] = [
  ['throughput', 'débit'],
  ['latency', 'latence'],
  ['to deploy', 'déployer'],
  ['a bottleneck', 'un goulot d’étranglement'],
  ['to troubleshoot', 'diagnostiquer une panne'],
  ['a requirement', 'une exigence'],
  ['to roll back', 'revenir en arrière'],
  ['a stakeholder', 'une partie prenante'],
  ['a deadline', 'une échéance'],
  ['to outsource', 'sous-traiter'],
  ['reliable', 'fiable'],
  ['a workaround', 'une solution de contournement'],
  ['to schedule', 'planifier'],
  ['an outage', 'une panne'],
  ['to scale', 'monter en charge'],
  ['a feature', 'une fonctionnalité'],
];

function english(random: Random, now: Date): DemoNote[] {
  return spreadDays(random, 14, 300, 7).map((daysAgo, index) => {
    const words = random.sample(VOCAB, 6);
    return {
      path: 'Cours / Anglais',
      title: `Vocabulaire, leçon ${index + 1}`,
      tags: ['anglais', 'vocabulaire'],
      summary: `Mots d’anglais technique de la leçon ${index + 1} : ${words[0]?.[0] ?? ''}, ${words[1]?.[0] ?? ''}…`,
      content: [
        '| Anglais | Français |',
        '| --- | --- |',
        ...words.map(([en, fr]) => `| ${en} | ${fr} |`),
      ].join('\n'),
      daysAgo,
    };
  });
}

const IDEAS = [
  'Offrir un carnet kraft à Léa pour son anniversaire.',
  'Regarder si la bibliothèque prête des liseuses.',
  'Faire un script qui renomme les photos par date.',
  'Tester le pain au levain ce week-end.',
  'Apprendre les raccourcis de Vim pour de bon.',
  'Monter une étagère au-dessus du bureau.',
  'Podcast à écouter : épisode sur les réseaux de neurones.',
  'Proposer une sortie escalade au groupe.',
  'Changer le mot de passe du Wi-Fi.',
  'Acheter une multiprise avec interrupteur.',
  'Écrire un article sur la sauvegarde 3-2-1.',
  'Faire réparer le vélo : frein arrière.',
  'Essayer la méthode Pomodoro pour les révisions.',
  'Ranger les câbles du bureau dans une boîte.',
  'Planter du basilic sur le balcon.',
  'Regarder les horaires de la piscine.',
  'Idée de nom pour le jeu : « Contrevent ».',
  'Prendre des nouvelles de Théo.',
  'Vérifier la date de fin du forfait.',
  'Imprimer le plan de Kyoto.',
  'Chercher un livre sur l’histoire d’internet.',
  'Faire une liste des cadeaux de Noël.',
  'Nettoyer le clavier.',
  'Mettre à jour le CV avec le projet de notes.',
  'Trouver une recette de ramen maison.',
  'Réserver le restaurant pour les 22 ans de Hugo.',
];

function shortIdeas(random: Random): DemoNote[] {
  return IDEAS.map((idea) => ({
    path: 'Idées en vrac',
    title: idea.replace(/[.:].*$/, '').slice(0, 60),
    tags: random.next() < 0.5 ? ['idée'] : ['idée', 'à faire'],
    summary: idea,
    content: idea,
  }));
}

function projectLog(random: Random, now: Date): DemoNote[] {
  const topics = [
    'Ajout de la file d’attente de rangement',
    'Première version de la pochette',
    'Recherche tolérante aux fautes',
    'Mode à valider ou direct',
    'Annulation d’un rangement',
    'Déploiement sur vm-apps',
    'Sauvegardes et supervision',
    'Revue du design en sombre',
    'Lecture des notes en Markdown',
    'Renommage des dossiers',
    'Tests de bout en bout',
    'Garde de l’abonnement par compte',
    'Nettoyage des comptes orphelins',
    'Écran de proposition',
    'Compteurs dans l’arborescence',
    'Retours après une semaine d’usage',
  ];
  return spreadDays(random, topics.length, 200, 4).map((daysAgo, index) => {
    const topic = topics[index] ?? 'Point d’étape';
    return {
      path: 'Projets / Palanotes',
      title: `Journal de bord : ${topic.charAt(0).toLowerCase()}${topic.slice(1)}`,
      tags: ['palanotes', 'journal de bord'],
      summary: `Point d’étape du projet de notes : ${topic.toLowerCase()}.`,
      content: `## Fait\n\n- ${topic}\n- Tests à jour\n\n## Reste\n\n- ${random.pick(['Relire le diff', 'Vérifier sur téléphone', 'Mesurer le temps de réponse', 'Écrire la doc'])}`,
      daysAgo,
    };
  });
}

// Notes that come back regularly in a real account: journal, shopping lists, training logs.
export function recurringNotes(random: Random, now: Date): DemoNote[] {
  return [
    ...journal(random, now),
    ...groceries(random, now),
    ...runs(random, now),
    ...workouts(random, now),
    ...english(random, now),
    ...shortIdeas(random),
    ...projectLog(random, now),
  ];
}
