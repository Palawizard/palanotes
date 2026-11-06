import type { DemoNote } from './types';

const SALE = 'Perso / Cuisine / Recettes salées';
const SOIR = 'Perso / Cuisine / Recettes salées / Plats du soir';
const DESSERTS = 'Perso / Cuisine / Desserts';
const JAPON = 'Perso / Voyages / Japon 2027';
const BZH = 'Perso / Voyages / Bretagne';
const ROMANS = 'Perso / Lectures / Romans';
const ESSAIS = 'Perso / Lectures / Essais';

function recipe(
  path: string,
  title: string,
  tags: string[],
  summary: string,
  ingredients: string[],
  steps: string[],
  tip?: string,
): DemoNote {
  const body = [
    `# ${title}`,
    '',
    '## Ingrédients',
    '',
    ...ingredients.map((item) => `- ${item}`),
    '',
    '## Étapes',
    '',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    ...(tip ? ['', `> ${tip}`] : []),
  ].join('\n');
  return { path, title, tags: ['cuisine', ...tags], summary, content: body };
}

export const PERSONAL_NOTES: DemoNote[] = [
  recipe(
    SALE,
    'Quiche lorraine',
    ['quiche', 'four'],
    'Quiche lorraine classique : pâte brisée, lardons, œufs et crème.',
    ['1 pâte brisée', '200 g de lardons', '3 œufs', '20 cl de crème', '20 cl de lait', 'muscade'],
    [
      'Faire revenir les lardons sans matière grasse.',
      'Battre œufs, crème et lait, saler peu, muscade.',
      'Garnir la pâte, verser l’appareil.',
      'Cuire 35 minutes à 180 °C.',
    ],
    'Piquer la pâte et la précuire 10 minutes pour un fond croustillant.',
  ),
  recipe(
    SALE,
    'Dahl de lentilles corail',
    ['lentilles', 'végétarien', 'rapide'],
    'Dahl de lentilles corail au lait de coco et aux épices, prêt en 25 minutes.',
    [
      '250 g de lentilles corail',
      '40 cl de lait de coco',
      '1 oignon',
      '2 gousses d’ail',
      'gingembre',
      'curry, cumin, curcuma',
    ],
    [
      'Faire fondre l’oignon, ajouter ail, gingembre et épices.',
      'Ajouter les lentilles rincées, le lait de coco et 40 cl d’eau.',
      'Cuire 20 minutes en remuant.',
      'Servir avec du riz basmati et de la coriandre.',
    ],
  ),
  recipe(
    SALE,
    'Pâte à pizza',
    ['pizza', 'pâte'],
    'Pâte à pizza à longue pousse, 60 % d’hydratation.',
    [
      '500 g de farine T45',
      '300 g d’eau',
      '10 g de sel',
      '3 g de levure sèche',
      'un filet d’huile d’olive',
    ],
    [
      'Mélanger farine et levure, ajouter l’eau puis le sel.',
      'Pétrir 10 minutes, laisser lever 2 heures.',
      'Faire des pâtons, 24 heures au frigo.',
      'Sortir 2 heures avant, étaler à la main, four au maximum.',
    ],
  ),
  recipe(
    SALE,
    'Gratin dauphinois',
    ['gratin', 'pommes de terre', 'four'],
    'Gratin dauphinois sans fromage, à la crème et à l’ail.',
    ['1 kg de pommes de terre', '50 cl de crème', '25 cl de lait', '1 gousse d’ail', 'beurre'],
    [
      'Frotter le plat avec l’ail, beurrer.',
      'Couper les pommes de terre en fines rondelles, ne pas les laver.',
      'Les cuire 10 minutes dans le lait et la crème.',
      'Verser dans le plat, 1 heure à 160 °C.',
    ],
  ),
  recipe(
    SOIR,
    'Pâtes au citron et parmesan',
    ['pâtes', 'rapide'],
    'Pâtes au citron, beurre et parmesan, prêtes en 12 minutes.',
    ['200 g de spaghettis', '1 citron bio', '40 g de beurre', '50 g de parmesan', 'poivre'],
    [
      'Cuire les pâtes, garder un verre d’eau de cuisson.',
      'Faire fondre le beurre avec le zeste.',
      'Mélanger pâtes, jus de citron, parmesan et eau de cuisson.',
    ],
  ),
  recipe(
    SOIR,
    'Riz sauté aux légumes',
    ['riz', 'wok', 'restes'],
    'Riz sauté au wok avec les restes de riz et de légumes de la semaine.',
    ['riz cuit de la veille', '2 œufs', 'petits pois, carottes', 'sauce soja', 'oignon vert'],
    [
      'Saisir les légumes au wok.',
      'Pousser sur le côté, brouiller les œufs.',
      'Ajouter le riz froid, sauce soja, mélanger fort.',
    ],
  ),
  recipe(
    SOIR,
    'Omelette aux champignons',
    ['œufs', 'rapide'],
    'Omelette baveuse aux champignons de Paris et à la ciboulette.',
    ['3 œufs', '150 g de champignons', 'ciboulette', 'beurre'],
    [
      'Faire dorer les champignons.',
      'Verser les œufs battus, remuer au début.',
      'Plier quand le dessus est encore baveux.',
    ],
  ),
  recipe(
    SOIR,
    'Soupe de potimarron',
    ['soupe', 'automne'],
    'Velouté de potimarron à la châtaigne, sans éplucher le potimarron.',
    ['1 potimarron', '1 oignon', '100 g de châtaignes cuites', '1 l de bouillon', 'crème'],
    [
      'Couper le potimarron avec la peau.',
      'Cuire 25 minutes dans le bouillon avec l’oignon et les châtaignes.',
      'Mixer, ajouter un peu de crème.',
    ],
  ),
  recipe(
    SOIR,
    'Tacos express',
    ['tacos', 'rapide'],
    'Tacos de haricots noirs et maïs, garniture prête en dix minutes.',
    ['tortillas de maïs', '1 boîte de haricots noirs', 'maïs', 'avocat', 'citron vert', 'cumin'],
    [
      'Chauffer haricots et maïs avec le cumin.',
      'Écraser l’avocat avec le citron vert.',
      'Garnir les tortillas chaudes.',
    ],
  ),
  recipe(
    DESSERTS,
    'Crêpes',
    ['crêpes', 'chandeleur'],
    'Pâte à crêpes pour une quinzaine de crêpes, repos d’une heure.',
    [
      '250 g de farine',
      '4 œufs',
      '50 cl de lait',
      '50 g de beurre fondu',
      '1 pincée de sel',
      '1 cuillère de sucre',
    ],
    [
      'Mélanger farine, sel et sucre.',
      'Ajouter les œufs puis le lait petit à petit.',
      'Ajouter le beurre fondu, laisser reposer 1 heure.',
    ],
    'Une cuillère de rhum ou de fleur d’oranger dans la pâte.',
  ),
  recipe(
    DESSERTS,
    'Fondant au chocolat',
    ['chocolat', 'gâteau'],
    'Fondant au chocolat noir, cœur coulant, 20 minutes de cuisson.',
    ['200 g de chocolat noir', '150 g de beurre', '150 g de sucre', '4 œufs', '50 g de farine'],
    [
      'Faire fondre chocolat et beurre.',
      'Ajouter sucre, œufs, puis farine.',
      'Cuire 20 minutes à 180 °C, le centre doit trembler.',
    ],
  ),
  recipe(
    DESSERTS,
    'Cookies aux pépites',
    ['cookies', 'biscuits'],
    'Cookies moelleux au beurre noisette et aux pépites de chocolat.',
    [
      '120 g de beurre',
      '150 g de sucre roux',
      '1 œuf',
      '200 g de farine',
      '1/2 sachet de levure',
      '150 g de pépites',
    ],
    [
      'Faire un beurre noisette, laisser tiédir.',
      'Mélanger avec le sucre, l’œuf, puis farine et levure.',
      'Ajouter les pépites, boules sur plaque, 10 minutes à 180 °C.',
    ],
  ),
  recipe(
    DESSERTS,
    'Far breton',
    ['far', 'bretagne'],
    'Far breton aux pruneaux de la recette de mamie.',
    ['125 g de farine', '125 g de sucre', '4 œufs', '75 cl de lait', '250 g de pruneaux'],
    [
      'Mélanger farine, sucre et œufs.',
      'Ajouter le lait chaud.',
      'Verser sur les pruneaux, 1 heure à 180 °C.',
    ],
  ),
  {
    path: 'Perso / Cuisine',
    title: 'Idées de repas pour la semaine',
    tags: ['cuisine', 'menus'],
    summary: 'Liste de plats simples à faire tourner quand je n’ai pas d’idée.',
    content: `- Dahl de lentilles
- Pâtes au citron
- Quiche et salade
- Riz sauté
- Soupe et tartines
- Pizza maison le samedi`,
  },
  {
    path: 'Perso / Cuisine',
    title: 'Temps de cuisson des légumes à la vapeur',
    tags: ['cuisine', 'vapeur'],
    summary: 'Tableau des temps de cuisson vapeur des légumes courants.',
    content: `| Légume | Minutes |
| --- | --- |
| Brocoli | 8 |
| Carottes en rondelles | 15 |
| Haricots verts | 12 |
| Pommes de terre en cubes | 20 |
| Courgettes | 7 |`,
  },
  {
    path: 'Perso / Sport',
    title: 'Objectifs sportifs de l’année',
    tags: ['sport', 'objectifs'],
    summary: 'Courir un semi-marathon, trois séances par semaine, dix tractions.',
    content: `- [x] Courir 10 km sans s'arrêter
- [ ] Semi-marathon en moins de 2 heures
- [ ] Dix tractions d'affilée
- [x] Trois séances par semaine pendant deux mois`,
  },
  {
    path: 'Perso / Sport / Course à pied',
    title: 'Plan semi-marathon en dix semaines',
    tags: ['course', 'semi-marathon', 'plan'],
    summary:
      'Plan d’entraînement de dix semaines pour un semi-marathon, trois sorties par semaine.',
    content: `# Plan semi-marathon

| Semaine | Sortie 1 | Sortie 2 | Sortie longue |
| --- | --- | --- | --- |
| 1 | 30 min facile | 6 × 1 min vite | 8 km |
| 2 | 35 min facile | 5 × 2 min | 9 km |
| 3 | 35 min | 4 × 3 min | 10 km |
| 4 | 30 min récup | 20 min tempo | 8 km |
| 5 | 40 min | 5 × 3 min | 12 km |
| 6 | 40 min | 25 min tempo | 14 km |
| 7 | 45 min | 6 × 3 min | 15 km |
| 8 | 35 min récup | 30 min tempo | 12 km |
| 9 | 40 min | 4 × 5 min | 16 km |
| 10 | 30 min | 15 min tempo | course |

Allure semi visée : 5 min 40 au kilomètre.`,
  },
  {
    path: 'Perso / Sport / Course à pied',
    title: 'Chaussures : comparatif',
    tags: ['course', 'matériel'],
    summary: 'Paires essayées en magasin, amorti, poids et prix.',
    content: `- Paire A : très amortie, un peu lourde, 140 €
- Paire B : légère, drop 6 mm, 120 €
- Paire C : pour le trail, crampons, 130 €

Prise : la B pour la route.`,
  },
  {
    path: 'Perso / Sport / Musculation',
    title: 'Programme haut et bas du corps',
    tags: ['musculation', 'programme'],
    summary: 'Programme sur quatre séances : deux haut du corps, deux bas du corps.',
    content: `# Programme haut et bas

## Haut

- Développé couché 4 × 6
- Rowing barre 4 × 8
- Développé militaire 3 × 8
- Tractions 3 × max

## Bas

- Squat 4 × 6
- Soulevé de terre roumain 3 × 8
- Fentes 3 × 10
- Gainage 3 × 45 s`,
  },
  {
    path: 'Perso / Santé',
    title: 'Rendez-vous médicaux à prévoir',
    tags: ['santé', 'rendez-vous'],
    summary: 'Dentiste, ophtalmo et rappel de vaccin à planifier.',
    content: `- [ ] Dentiste : détartrage annuel
- [ ] Ophtalmo : contrôle, ordonnance lunettes expirée
- [x] Rappel tétanos fait en janvier`,
  },
  {
    path: 'Perso / Santé',
    title: 'Sommeil : ce qui marche',
    tags: ['santé', 'sommeil'],
    summary: 'Habitudes qui améliorent le sommeil : écran coupé, horaires fixes.',
    content: `- Pas d'écran 30 minutes avant de dormir
- Coucher avant minuit en semaine
- Pas de café après 15 h
- Chambre fraîche, 18 °C`,
  },
  {
    path: 'Perso / Santé',
    title: 'Mutuelle : remboursements',
    tags: ['santé', 'mutuelle'],
    summary: 'Ce que rembourse la mutuelle étudiante : optique, dentaire, consultations.',
    content: `Optique : 150 € tous les deux ans. Dentaire : 200 % de la base. Envoyer les factures par l'appli.`,
  },
  {
    path: JAPON,
    title: 'Itinéraire de trois semaines',
    tags: ['japon', 'voyage', 'itinéraire'],
    summary:
      'Itinéraire Tokyo, Kyoto, Osaka, Hiroshima et les Alpes japonaises sur trois semaines.',
    content: `# Itinéraire Japon

| Jours | Étape | À voir |
| --- | --- | --- |
| 1 à 5 | Tokyo | Asakusa, Shibuya, Akihabara |
| 6 à 7 | Hakone | onsen, vue sur le Fuji |
| 8 à 11 | Kyoto | Fushimi Inari, Arashiyama |
| 12 | Nara | les daims, Tōdai-ji |
| 13 à 15 | Osaka | Dōtonbori, château |
| 16 à 17 | Hiroshima, Miyajima | mémorial, torii |
| 18 à 20 | Takayama, Shirakawa-go | villages |
| 21 | Tokyo | retour |`,
  },
  {
    path: JAPON,
    title: 'Budget prévisionnel',
    tags: ['japon', 'voyage', 'budget'],
    summary: 'Budget estimé du voyage au Japon : vol, logements, transports, repas.',
    content: `| Poste | Estimation |
| --- | --- |
| Vol aller-retour | 900 € |
| Logements (20 nuits) | 1 200 € |
| Transports | 450 € |
| Repas | 600 € |
| Visites et divers | 300 € |
| **Total** | **3 450 €** |`,
  },
  {
    path: JAPON,
    title: 'Phrases utiles en japonais',
    tags: ['japon', 'langue'],
    summary: 'Quelques phrases de base en japonais pour le voyage.',
    content: `- Bonjour : konnichiwa
- Merci : arigatō gozaimasu
- Excusez-moi : sumimasen
- L'addition s'il vous plaît : okaikei onegaishimasu
- Où est la gare ? : eki wa doko desu ka`,
  },
  {
    path: JAPON,
    title: 'Pass ferroviaire : vaut-il le coup ?',
    tags: ['japon', 'train'],
    summary: 'Calcul du coût des trajets en train comparé au prix du pass.',
    content: `Le pass a beaucoup augmenté. Trajets prévus : environ 380 € au détail, pass de 21 jours plus cher. Conclusion : billets à l'unité et pass régionaux.`,
  },
  {
    path: BZH,
    title: 'Week-end à Saint-Malo',
    tags: ['bretagne', 'voyage', 'week-end'],
    summary: 'Programme d’un week-end à Saint-Malo et Dinard, marées et restaurants.',
    content: `# Week-end à Saint-Malo

- Tour des remparts à marée haute
- Fort National à marée basse (vérifier l'horaire)
- Bateau pour Dinard
- Crêperie dans l'intra-muros

Coefficient de marée du samedi : 98, grande marée.`,
  },
  {
    path: BZH,
    title: 'Randonnée sur le sentier des douaniers',
    tags: ['bretagne', 'randonnée'],
    summary: 'Étape du GR34 entre Perros-Guirec et Ploumanac’h, 6 km.',
    content: `Côte de granit rose, 6 km aller, compter 2 heures avec les arrêts photo. Partir tôt l'été.`,
  },
  {
    path: ROMANS,
    title: 'Liste de romans à lire',
    tags: ['lecture', 'romans', 'à lire'],
    summary: 'Pile de romans à lire, avec ceux déjà terminés cochés.',
    content: `- [x] L'Étranger, Camus
- [x] Dune, Herbert
- [ ] Le Comte de Monte-Cristo, Dumas
- [ ] Les Furtifs, Damasio
- [ ] La Horde du Contrevent, Damasio
- [ ] Le Problème à trois corps, Liu Cixin`,
  },
  {
    path: ROMANS,
    title: 'Dune : notes de lecture',
    tags: ['lecture', 'romans', 'science-fiction'],
    summary: 'Ce que j’ai retenu de Dune : écologie, pouvoir, religion.',
    content: `# Dune

- L'épice comme ressource qui organise tout l'empire.
- L'écologie d'Arrakis, l'eau comme monnaie.
- Méfiance envers les héros messianiques, c'est le vrai sujet.

> « La peur tue l'esprit. »`,
  },
  {
    path: ROMANS,
    title: 'L’Étranger : citations',
    tags: ['lecture', 'romans', 'citations'],
    summary: 'Citations relevées dans L’Étranger de Camus.',
    content: `> « Aujourd'hui, maman est morte. Ou peut-être hier, je ne sais pas. »

Lu en deux soirs.`,
  },
  {
    path: ESSAIS,
    title: 'Sapiens : idées principales',
    tags: ['lecture', 'essais', 'histoire'],
    summary: 'Résumé des trois révolutions de Sapiens : cognitive, agricole, scientifique.',
    content: `# Sapiens

1. **Révolution cognitive** : les fictions partagées permettent de coopérer à grande échelle.
2. **Révolution agricole** : plus de nourriture, mais une vie plus dure pour chacun.
3. **Révolution scientifique** : admettre son ignorance pour progresser.`,
  },
  {
    path: ESSAIS,
    title: 'Deep Work : ce que j’applique',
    tags: ['lecture', 'essais', 'productivité'],
    summary: 'Les règles retenues de Deep Work pour travailler concentré.',
    content: `- Blocs de 90 minutes sans téléphone
- Notifications coupées pendant les révisions
- Une fin de journée nette : liste du lendemain écrite`,
  },
  {
    path: 'Perso / Lectures',
    title: 'Bandes dessinées prêtées',
    tags: ['lecture', 'bd', 'prêt'],
    summary: 'Qui a emprunté quelle bande dessinée.',
    content: `- Blacksad tome 1 : Léa
- Les Vieux Fourneaux : Hugo
- Astérix chez les Pictes : rendu`,
  },
  {
    path: 'Administratif / Logement',
    title: 'État des lieux d’entrée',
    tags: ['logement', 'état des lieux'],
    summary: 'Défauts relevés à l’état des lieux d’entrée, à garder pour la sortie.',
    content: `# État des lieux d'entrée

- Rayure sur le parquet du séjour, près de la fenêtre
- Joint de la douche noirci
- Plaque de cuisson : un foyer lent à chauffer
- Photos rangées dans le Drive, dossier Logement`,
  },
  {
    path: 'Administratif / Logement',
    title: 'Contacts utiles du logement',
    tags: ['logement', 'contacts'],
    summary: 'Propriétaire, syndic, plombier et numéro d’urgence de l’immeuble.',
    content: `- Propriétaire : par e-mail de préférence
- Syndic : astreinte le week-end
- Plombier recommandé par la voisine du 2e`,
  },
  {
    path: 'Administratif / Logement',
    title: 'Code du portail',
    tags: ['logement'],
    summary: 'Code du portail de la résidence.',
    content: `Code du portail : 4512, changé en septembre.`,
  },
  {
    path: 'Administratif / Logement',
    title: 'Demande d’APL',
    tags: ['logement', 'caf', 'aides'],
    summary: 'Démarches pour la demande d’aide au logement à la CAF.',
    content: `1. Créer le compte CAF
2. Attestation de loyer signée par le propriétaire
3. Déclarer les ressources
4. Délai annoncé : un mois`,
  },
  {
    path: 'Administratif / Banque',
    title: 'Budget mensuel',
    tags: ['banque', 'budget'],
    summary: 'Répartition du budget mensuel : loyer, courses, abonnements, épargne.',
    content: `| Poste | Montant |
| --- | --- |
| Loyer (après APL) | 380 € |
| Courses | 220 € |
| Transports | 30 € |
| Abonnements | 25 € |
| Sorties | 80 € |
| Épargne | 100 € |`,
  },
  {
    path: 'Administratif / Banque',
    title: 'Abonnements en cours',
    tags: ['banque', 'abonnements'],
    summary: 'Liste des abonnements et de leur date de prélèvement.',
    content: `- Forfait téléphone : le 5
- Musique : le 12
- Nom de domaine : annuel, en mars
- Salle de sport : le 1er`,
  },
  {
    path: 'Administratif / Impôts',
    title: 'Déclaration de revenus',
    tags: ['impôts', 'déclaration'],
    summary: 'Points à vérifier pour la déclaration de revenus : job d’été, rattachement.',
    content: `- Revenus du job d'été à déclarer (exonération étudiant jusqu'à 3 SMIC)
- Choix : rattachement au foyer des parents ou déclaration seule
- Date limite en ligne : fin mai`,
  },
  {
    path: 'Administratif / Impôts',
    title: 'Taxe d’habitation : exonération',
    tags: ['impôts', 'logement'],
    summary: 'Plus de taxe d’habitation sur la résidence principale.',
    content: `Supprimée pour la résidence principale. Rien à faire.`,
  },
  {
    path: 'Administratif',
    title: 'Papiers à garder et combien de temps',
    tags: ['administratif', 'archives'],
    summary: 'Durées de conservation des papiers : fiches de paie, impôts, factures.',
    content: `| Document | Durée |
| --- | --- |
| Fiches de paie | jusqu'à la retraite |
| Avis d'impôt | 3 ans |
| Factures d'énergie | 5 ans |
| Quittances de loyer | 3 ans |
| Relevés bancaires | 5 ans |`,
  },
];
