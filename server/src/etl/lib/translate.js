// Post-traitement de traduction — appliqué APRÈS l'union verticale dans build-dataset.js.
// Les snapshots gardent les données brutes (reproductibilité hors-ligne).
// Seul le dataset unifié final est traduit.
//
// Attribution d'images : pour les sources sans photos (austin, petsbook), on
// distribue les images locales du projet. Les images sont au format original dans
// le dataset (le front les convertit en WebP/AVIF via responsiveImage()).

// =============================================================================
// Races de chats — anglais → français
// =============================================================================
const CAT_BREED_FR = {
  'Abyssinian': 'Abyssin',
  'Aegean': 'Égéen',
  'American Bobtail': 'Bobtail américain',
  'American Curl': 'American Curl',
  'American Shorthair': 'American Shorthair',
  'American Wirehair': 'American Wirehair',
  'Arabian Mau': 'Mau arabe',
  'Australian Mist': 'Mist australien',
  'Balinese': 'Balinais',
  'Bambino': 'Bambino',
  'Bengal': 'Bengal',
  'Birman': 'Birman',
  'Bombay': 'Bombay',
  'British Longhair': 'British Longhair',
  'British Shorthair': 'British Shorthair',
  'Burmese': 'Burmese',
  'Burmilla': 'Burmilla',
  'California Spangled': 'California Spangled',
  'Chantilly-Tiffany': 'Chantilly-Tiffany',
  'Chartreux': 'Chartreux',
  'Domestic Longhair': 'Chat domestique (poil long)',
  'Domestic Shorthair': 'Chat domestique (poil court)',
  'Domestic Shorthair Mix': 'Chat domestique (poil court, croisé)',
  'Siamese Mix': 'Siamois (croisé)',
};

// =============================================================================
// Races de chiens — anglais → français
// =============================================================================
const DOG_BREED_FR = {
  'Affenpinscher': 'Affenpinscher',
  'African': 'Chien africain',
  'Airedale': 'Airedale Terrier',
  'Akita': 'Akita',
  'Anatol Shepherd Mix': 'Berger d\'Anatolie (croisé)',
  'Appenzeller': 'Bouvier de l\'Appenzell',
  'Australian': 'Berger australien',
  'Australian Cattle Dog': 'Bouvier australien',
  'Bakharwal': 'Bakharwal',
  'Basenji': 'Basenji',
  'Beagle': 'Beagle',
  'Bluetick': 'Bluetick Coonhound',
  'Border Collie': 'Border Collie',
  'Borzoi': 'Borzoï',
  'Bouvier': 'Bouvier',
  'Boxer': 'Boxer',
  'Brabancon': 'Petit Brabançon',
  'Briard': 'Briard',
  'Buhund': 'Buhund norvégien',
  'Bull Terrier': 'Bull Terrier',
  'Bulldog': 'Bouledogue',
  'Bullterrier': 'Bull Terrier',
  'Cattledog': 'Bouvier australien',
  'Cavapoo': 'Cavapoo',
  'Chihuahua Shorthair': 'Chihuahua (poil court)',
  'Dachshund': 'Teckel',
  'German Shepherd': 'Berger allemand',
  'German Shepherd Mix': 'Berger allemand (croisé)',
  'Great Pyrenees': 'Montagne des Pyrénées',
  'Great Pyrenees Mix': 'Montagne des Pyrénées (croisé)',
  'Greyhound': 'Lévrier greyhound',
  'Jack Russell Terrier Mix': 'Jack Russell Terrier (croisé)',
  'Labrador Retriever': 'Labrador Retriever',
  'Labrador Retriever Mix': 'Labrador (croisé)',
  'Mastiff': 'Mastiff',
  'Pit Bull': 'Pit Bull',
  'Siberian Husky': 'Husky sibérien',
};

// =============================================================================
// Tempéraments (mots-clés thecatapi) — anglais → français
// =============================================================================
const TEMPERAMENT_FR = {
  'Active': 'Actif',
  'Affectionate': 'Affectueux',
  'Agile': 'Agile',
  'Alert': 'Vigilant',
  'Calm': 'Calme',
  'Curious': 'Curieux',
  'Demanding': 'Exigeant',
  'Dependent': 'Dépendant',
  'Easy Going': 'Facile à vivre',
  'Energetic': 'Énergique',
  'Friendly': 'Amical',
  'Fun-loving': 'Joueur',
  'Gentle': 'Doux',
  'Independent': 'Indépendant',
  'Intelligent': 'Intelligent',
  'Interactive': 'Interactif',
  'Lively': 'Vif',
  'Loyal': 'Loyal',
  'Patient': 'Patient',
  'Playful': 'Joueur',
  'Relaxed': 'Détendu',
  'Sensible': 'Sensible',
  'Sensitive': 'Sensible',
  'Social': 'Social',
};

// =============================================================================
// Couleurs — anglais → français
// =============================================================================
const COLOR_FR = {
  'Black': 'Noir',
  'Blue': 'Bleu',
  'Blue Tabby': 'Tabby bleu',
  'Brown': 'Brun',
  'Brown Brindle': 'Bringé brun',
  'Brown Brindle/White': 'Bringé brun et blanc',
  'Brown Tabby': 'Tabby brun',
  'Brown Tabby/White': 'Tabby brun et blanc',
  'Brown/Black': 'Brun et noir',
  'Brown/White': 'Brun et blanc',
  'Buff': 'Chamois',
  'Calico': 'Tricolore',
  'Cream Tabby': 'Tabby crème',
  'Cream Tabby/White': 'Tabby crème et blanc',
  'Fawn': 'Fauve',
  'Gray': 'Gris',
  'Gray/White': 'Gris et blanc',
  'Green': 'Vert',
  'Green/Black': 'Vert et noir',
  'Lynx Point': 'Lynx point',
  'Orange': 'Roux',
  'Orange Tabby': 'Tabby roux',
  'Orange/White': 'Roux et blanc',
  'Red': 'Roux',
  'Red Tick/White': 'Rouan et blanc',
  'Red/Black': 'Roux et noir',
  'Red/White': 'Roux et blanc',
  'Sable': 'Zibeline',
  'Tan': 'Fauve',
  'Tan/White': 'Fauve et blanc',
  'Torbie': 'Torbie',
  'Tortie': 'Écaille de tortue',
  'Tricolor': 'Tricolore',
  'Tricolor/Orange': 'Tricolore et roux',
  'Tricolor/Tan': 'Tricolore et fauve',
  'Tricolor/White': 'Tricolore et blanc',
  'White': 'Blanc',
  'White/Black': 'Blanc et noir',
  'White/Brown': 'Blanc et brun',
  'White/Brown Brindle': 'Blanc et bringé brun',
  'White/Gray': 'Blanc et gris',
  'White/Tan': 'Blanc et fauve',
  'Yellow': 'Jaune',
  'Yellow/Gray': 'Jaune et gris',
};

// =============================================================================
// Pays d'origine (thecatapi) — anglais → français
// =============================================================================
const COUNTRY_FR = {
  'Australia': 'Australie',
  'Burma': 'Birmanie',
  'Egypt': 'Égypte',
  'France': 'France',
  'Greece': 'Grèce',
  'United Arab Emirates': 'Émirats arabes unis',
  'United Kingdom': 'Royaume-Uni',
  'United States': 'États-Unis',
};

// =============================================================================
// Descriptions physiques des races de chats (thecatapi) — traductions complètes
// =============================================================================
const CAT_DESC_FR = {
  'Abyssinian': "L'Abyssin est facile à entretenir et apporte beaucoup de joie dans un foyer. Ce sont des chats affectueux qui aiment autant les humains que les autres animaux.",
  'Aegean': "Originaire des îles grecques connues sous le nom de Cyclades, où ils sont un félin domestique naturel, le chat Égéen se développe comme pêcheur amical et intelligent. Affectueux, il vient souvent chercher des câlins.",
  'American Bobtail': "Le Bobtail américain est très intelligent et possède une apparence sauvage distinctive. Malgré son air féroce, c'est un chat affectueux et doux qui s'entend bien avec les enfants et les autres animaux.",
  'American Curl': "L'American Curl se distingue par ses oreilles recourbées vers l'arrière. Il est joueur, curieux et s'adapte bien à la vie de famille. Sa personnalité enjouée persiste jusqu'à un âge avancé.",
  'American Shorthair': "L'American Shorthair est un chat robuste et équilibré, connu pour sa santé et sa longévité. Doux et facile à vivre, c'est un excellent compagnon familial.",
  'American Wirehair': "L'American Wirehair se caractérise par son pelage dur et ondulé. Il est affectueux, calme et s'adapte facilement. Peu exigeant, c'est un chat idéal pour la vie en intérieur.",
  'Arabian Mau': "Le Mau arabe est une race naturelle originaire du désert. Robuste et énergique, c'est un excellent chasseur. Il est loyal envers sa famille et s'adapte bien à la vie domestique.",
  'Australian Mist': "Le Mist australien est un chat tacheté au tempérament doux. Affectueux sans être envahissant, il aime la compagnie et tolère bien la manipulation, ce qui en fait un bon chat de famille.",
  'Balinese': "Le Balinais est une version à poil long du Siamois. Gracieux et élégant, il est bavard, joueur et très attaché à ses humains. Il supporte mal la solitude.",
  'Bambino': "Le Bambino est un chat sans poil aux pattes courtes. Il est vif, curieux et adore être le centre d'attention. Malgré sa petite taille, il est plein d'énergie et d'affection.",
  'Bengal': "Le Bengal a l'apparence d'un chat sauvage mais le caractère d'un chat domestique. Très actif et intelligent, il aime grimper, jouer avec l'eau et interagir avec sa famille.",
  'Birman': "Le Birman est un chat doux, calme et affectueux. Ses yeux bleus profonds et son pelage soyeux en font une race très appréciée. Il s'entend bien avec les enfants et les autres animaux.",
  'Bombay': "Le Bombay ressemble à une panthère miniature avec son pelage noir lustré. Il est affectueux, joueur et aime être au centre de l'attention. Il s'adapte bien à la vie de famille.",
  'British Longhair': "Le British Longhair est la version à poil long du British Shorthair. Calme, posé et affectueux, c'est un compagnon idéal qui apprécie autant les moments de jeu que les siestes.",
  'British Shorthair': "Le British Shorthair est un chat robuste au caractère équilibré. Calme et affectueux sans être collant, il est idéal pour la vie en appartement et s'entend bien avec les enfants.",
  'Burmese': "Le Burmese est un chat affectueux et sociable qui adore la compagnie. Joueur et curieux, il reste souvent « chaton » dans l'âme jusqu'à un âge avancé. Il supporte mal la solitude.",
  'Burmilla': "Le Burmilla est un croisement entre le Burmese et le Chinchilla Persan. Il est joueur, affectueux et possède un magnifique pelage argenté. Il s'adapte facilement à tout type de foyer.",
  'California Spangled': "Le California Spangled est un chat au look sauvage créé pour sensibiliser à la protection des félins. Actif, intelligent et loyal, il a besoin de stimulation physique et mentale.",
  'Chantilly-Tiffany': "Le Chantilly-Tiffany est un chat semi-longhair au caractère doux et affectueux. Il est loyal envers sa famille, s'entend bien avec les enfants et les autres animaux.",
  'Chartreux': "Le Chartreux est un chat français au pelage gris-bleu et aux yeux orange. Calme, observateur et fidèle, c'est un compagnon discret mais très attaché à ses humains.",
};

// =============================================================================
// Noms de chats (thecatapi) — les noms de race DEVVIENNENT des noms propres FR
// =============================================================================
const CAT_NAME_FR = {
  'Abyssinian': 'Abyssin',
  'Aegean': 'Égéen',
  'American Bobtail': 'Bobtail',
  'American Curl': 'Curl',
  'American Shorthair': 'Shorthair',
  'American Wirehair': 'Wirehair',
  'Arabian Mau': 'Mau',
  'Australian Mist': 'Misty',
  'Balinese': 'Balinais',
  'Bambino': 'Bambino',
  'Bengal': 'Bengal',
  'Birman': 'Birman',
  'Bombay': 'Bombay',
  'British Longhair': 'Brit Shorthair',
  'British Shorthair': 'Brit Shorthair',
  'Burmese': 'Burmese',
  'Burmilla': 'Burmilla',
  'California Spangled': 'California',
  'Chantilly-Tiffany': 'Chantilly',
  'Chartreux': 'Chartreux',
};

// =============================================================================
// Noms de chiens (dogceo/austin) — les races deviennent des noms propres FR
// =============================================================================
const DOG_NAME_FR = {
  'Affenpinscher': 'Affen',
  'African': 'Afro',
  'Airedale': 'Airedale',
  'Akita': 'Akita',
  'Appenzeller': 'Appenzell',
  'Australian': 'Aussie',
  'Australian Cattle Dog': 'Bouvier',
  'Basenji': 'Basenji',
  'Beagle': 'Beagle',
  'Boxer': 'Boxer',
  'Bulldog': 'Bouledogue',
  'Bullterrier': 'Bully',
  'Chihuahua Shorthair': 'Chihuahua',
  'Dachshund': 'Teckel',
  'German Shepherd': 'Berger',
  'Great Pyrenees': 'Patou',
  'Greyhound': 'Grey',
  'Husky': 'Husky',
  'Labrador Retriever': 'Labrador',
  'Mastiff': 'Mastiff',
  'Pit Bull': 'Pit',
  'Siberian Husky': 'Husky',
};

// =============================================================================
// Localisation Austin → Belgique — on remplace les adresses par des villes belges
// =============================================================================
const BELGIAN_CITIES = [
  'Huy', 'Liège', 'Namur', 'Bruxelles', 'Charleroi', 'Mons', 'Tournai',
  'Arlon', 'Dinant', 'Verviers', 'Wavre', 'Ottignies', 'Nivelles',
  'Marche-en-Famenne', 'Bastogne', 'Ciney', 'Andenne', 'Waremme',
  'Seraing', 'Herstal', 'Ans', 'Saint-Nicolas', 'Malines', 'Louvain-la-Neuve',
  'Gembloux', 'Jodoigne', 'Perwez', 'Eghezée', 'Hannut', 'Braives',
];

// =============================================================================
// Annonces perdues/trouvées françaises — remplacement des 30 records pet911
// =============================================================================
const FRENCH_LOST_REPORTS = [
  { name: 'Médor', species: 'chien', breed: 'Labrador Retriever', gender: 'Mâle', color: 'Sable', status: 'Perdu', owner: 'Marie Dubois', location: 'Huy, rue de la Collégiale', desc: "Médor s'est échappé du jardin ce matin vers 10h. Il porte un collier rouge avec une médaille. Il est pucé et très gentil. Taille moyenne, environ 25 kg. Il a peur des voitures.", date: '2026-06-10' },
  { name: 'Minouche', species: 'chat', breed: 'Européen', gender: 'Femelle', color: 'Écaille de tortue', status: 'Perdu', owner: 'Thomas Lambert', location: 'Liège, quartier Sainte-Marguerite', desc: "Minouche n'est pas rentrée depuis 3 jours. Chatte stérilisée de 4 ans, peureuse mais pas agressive. Elle porte un collier vert avec un grelot. Tatouée oreille droite.", date: '2026-06-08' },
  { name: 'Rex', species: 'chien', breed: 'Berger allemand', gender: 'Mâle', color: 'Noir et feu', status: 'Perdu', owner: 'Sophie Renard', location: 'Namur, Jambes, parc de la Plante', desc: "Rex a disparu pendant une promenade en forêt. Il est pucé, porte un harnais bleu. Très obéissant mais peut être impressionnant. N'hésitez pas à l'appeler par son prénom.", date: '2026-06-12' },
  { name: 'Félix', species: 'chat', breed: 'Siamois', gender: 'Mâle', color: 'Crème et brun', status: 'Perdu', owner: 'Émilie Leclercq', location: 'Bruxelles, Ixelles, avenue de la Couronne', desc: "Félix est un siamois de 2 ans, très vocal. Il s'est faufilé par une fenêtre ouverte. Pucé, les yeux bleus. Il miaule fort quand il a faim.", date: '2026-06-05' },
  { name: 'Bella', species: 'chien', breed: 'Jack Russell', gender: 'Femelle', color: 'Blanc et brun', status: 'Trouvé', owner: 'Marc Fontaine', location: 'Charleroi, Marchienne-au-Pont', desc: "Trouvée errante près du centre commercial. Jack Russell femelle d'environ 5 ans. Pas de collier, pas de tatouage visible. Très gentille, sait donner la patte.", date: '2026-06-11' },
  { name: 'Caramel', species: 'lapin', breed: 'Lapin nain', gender: 'Mâle', color: 'Brun', status: 'Trouvé', owner: 'Julie Bastin', location: 'Ottignies, quartier du Buston', desc: "Lapin nain trouvé dans un jardin. Très sociable, habitué aux humains. Il était dans un état correct, semble perdu depuis peu. Couleur caramel, oreilles tombantes.", date: '2026-06-09' },
  { name: 'Luna', species: 'chat', breed: 'Persan', gender: 'Femelle', color: 'Blanc', status: 'Perdu', owner: 'Catherine Gillet', location: 'Mons, rue de la Chaussée', desc: "Luna est une persane blanche de 7 ans. Elle est sortie et n'est pas revenue. Très calme, elle a besoin de ses médicaments quotidiens. Pucée et stérilisée.", date: '2026-06-15' },
  { name: 'Nelson', species: 'chien', breed: 'Beagle', gender: 'Mâle', color: 'Tricolore', status: 'Perdu', owner: 'Pierre Dethier', location: 'Verviers, quartier Hodimont', desc: "Nelson a suivi une piste pendant la promenade et a disparu dans les bois. Beagle tricolore de 3 ans, très sociable, porte un collier orange. Il est pucé.", date: '2026-06-07' },
  { name: 'Chipie', species: 'chat', breed: 'Européen', gender: 'Femelle', color: 'Noir', status: 'Perdu', owner: 'Anne-Sophie Moreau', location: 'Tournai, rue Royale', desc: "Chatte noire de 5 ans, peureuse, ne se laisse pas approcher facilement. Collier rose avec clochette. Stérilisée. N'aime pas les chiens.", date: '2026-06-14' },
  { name: 'Oscar', species: 'chien', breed: 'Golden Retriever', gender: 'Mâle', color: 'Doré', status: 'Trouvé', owner: 'David Wouters', location: 'Bastogne, place McAuliffe', desc: "Trouvé attaché à un banc près de la Place. Golden Retriever mâle, très gentil, bien nourri. Collier en cuir marron sans médaille. Sait s'asseoir, coucher, rapporter.", date: '2026-06-13' },
  { name: 'Gribouille', species: 'chat', breed: 'Chartreux', gender: 'Mâle', color: 'Gris-bleu', status: 'Perdu', owner: 'Hélène Collard', location: 'Dinant, rue Grande', desc: "Chartreux de 4 ans, yeux orange. Il est sorti et n'est pas revenu comme d'habitude. Très affectueux, adore les caresses. Pucé, stérilisé.", date: '2026-06-01' },
  { name: 'Ulysse', species: 'chien', breed: 'Border Collie', gender: 'Mâle', color: 'Noir et blanc', status: 'Perdu', owner: 'Luc Simonis', location: 'Gembloux, chaussée de Wavre', desc: "Ulysse a paniqué pendant l'orage et a franchi la clôture. Border Collie de 2 ans, très intelligent mais peureux. Collier rouge, pucé. Il connaît les ordres de base.", date: '2026-06-16' },
  { name: 'Nala', species: 'chat', breed: 'Maine Coon', gender: 'Femelle', color: 'Brun tabby', status: 'Perdu', owner: 'Sarah Devos', location: 'Wavre, cité des Sorbiers', desc: "Nala est une Maine Coon de 3 ans, grande taille, queue touffue. Elle a disparu du jardin. Très sociable mais pas habituée à la rue. Pucée.", date: '2026-06-04' },
  { name: 'Paco', species: 'perroquet', breed: 'Gris du Gabon', gender: 'Mâle', color: 'Gris et rouge', status: 'Perdu', owner: 'Jean-Pierre Hendrickx', location: 'Liège, Outremeuse, rue Roture', desc: "Paco s'est échappé par une fenêtre ouverte. Gris du Gabon de 12 ans, il parle (dit son nom et « coucou »). Bague à la patte. Il peut voler sur de longues distances.", date: '2026-06-03' },
  { name: 'Daisy', species: 'chien', breed: 'Cocker Spaniel', gender: 'Femelle', color: 'Blanc et roux', status: 'Trouvé', owner: 'Christine Nyssen', location: 'Huy, Ben-Ahin, chemin des vignes', desc: "Trouvée errante le long de la Meuse. Cocker femelle, âgée, semble avoir 10 ans minimum. Pas de collier. Très douce, un peu sourde. A besoin de soins.", date: '2026-06-17' },
  { name: 'Simba', species: 'chat', breed: 'Européen', gender: 'Mâle', color: 'Roux', status: 'Perdu', owner: 'Kévin Bodart', location: 'Marche-en-Famenne, rue du Commerce', desc: "Simba est un chat roux de 6 ans, très grand et mince. Il porte un collier bleu avec une puce électronique. Il est sorti et n'est pas rentré depuis 4 jours.", date: '2026-06-06' },
  { name: 'Tina', species: 'chien', breed: 'Bichon frisé', gender: 'Femelle', color: 'Blanc', status: 'Perdu', owner: 'Patricia Lacroix', location: 'Bruxelles, Uccle, parc du Wolvendael', desc: "Tina s'est échappée pendant une promenade au parc. Bichon frisé blanc de 5 ans. Elle porte un petit manteau rose. Pucée. Elle aboie quand elle a peur.", date: '2026-06-18' },
  { name: 'Hercule', species: 'chien', breed: 'Carlin', gender: 'Mâle', color: 'Fauve', status: 'Trouvé', owner: 'Mélanie Georges', location: 'Seraing, rue du Molinay', desc: "Trouvé dans un jardin. Carlin mâle, pas de collier, semble perdu depuis peu. Très sociable, adore les enfants. Il respire fort (normal pour la race).", date: '2026-06-02' },
  { name: 'Zazou', species: 'chat', breed: 'Européen', gender: 'Femelle', color: 'Noir et blanc', status: 'Perdu', owner: 'Vincent Materne', location: 'Namur, Salzinnes, avenue Cardinal Mercier', desc: "Zazou est une chatte noire et blanche, tache blanche sur le museau. Elle a disparu après des travaux chez un voisin. Peureuse. Stérilisée, tatouée.", date: '2026-06-19' },
  { name: 'Roméo', species: 'chat', breed: 'Bengal', gender: 'Mâle', color: 'Tacheté', status: 'Trouvé', owner: 'Claire Remacle', location: 'Louvain-la-Neuve, place des Sciences', desc: "Trouvé près du campus universitaire. Bengal mâle d'environ 2 ans, robe magnifique. Très maigre, probablement perdu depuis plusieurs semaines. Affectueux.", date: '2026-06-10' },
  { name: 'Igor', species: 'chien', breed: 'Husky', gender: 'Mâle', color: 'Gris et blanc', status: 'Perdu', owner: 'Nadia Ivanova', location: 'Eupen, Haasstrasse', desc: "Igor a creusé sous la clôture. Husky de 4 ans, yeux bleus. Très sociable mais fugueur. Collier noir, médaille avec numéro. Pucé. Il tire beaucoup en laisse.", date: '2026-06-11' },
  { name: 'Praline', species: 'lapin', breed: 'Bélier nain', gender: 'Femelle', color: 'Gris et blanc', status: 'Trouvé', owner: 'Pauline Dupont', location: 'Jodoigne, rue de la Bruyère', desc: "Trouvée dans un champ. Lapine bélière naine, oreilles tombantes. Très douce, habituée à être manipulée. Elle était dans une cage improvisée — probablement abandonnée.", date: '2026-06-08' },
  { name: 'Rocket', species: 'furet', breed: 'Furet', gender: 'Mâle', color: 'Zibeline', status: 'Perdu', owner: 'Antoine Piron', location: 'Perwez, rue de l\'Étang', desc: "Rocket s'est faufilé par une petite ouverture dans la maison. Furet mâle de 1 an, très joueur. Il répond à son nom (parfois !). Pas de collier mais pucé.", date: '2026-06-15' },
  { name: 'Maya', species: 'chat', breed: 'Sacré de Birmanie', gender: 'Femelle', color: 'Crème et chocolat', status: 'Perdu', owner: 'Isabelle Noël', location: 'Bruxelles, Woluwe-Saint-Pierre, avenue de Tervuren', desc: "Maya n'est pas rentrée depuis une semaine. Sacrée de Birmanie de 6 ans, très belle, yeux bleus. Pucée et stérilisée. Elle est craintive avec les inconnus.", date: '2026-05-28' },
  { name: 'Tyson', species: 'chien', breed: 'American Staffordshire', gender: 'Mâle', color: 'Brun bringé', status: 'Trouvé', owner: 'Sébastien Mouton', location: 'Charleroi, Gilly, rue du Calvaire', desc: "Trouvé attaché devant un magasin fermé. Staff mâle d'environ 3 ans, musclé, oreilles coupées. Très gentil avec les humains, réactif aux autres chiens. Pas de puce.", date: '2026-06-16' },
  { name: 'Noisette', species: 'cochon d\'Inde', breed: 'Cochon d\'Inde', gender: 'Femelle', color: 'Brun et blanc', status: 'Trouvé', owner: 'Laura Marchand', location: 'Andenne, rue de Petit-Waret', desc: "Trouvée dans une boîte en carton près des bulles à verre. Cochon d'Inde femelle, en bonne santé, très sociable. Siffle quand on ouvre le frigo.", date: '2026-05-30' },
  { name: 'Spirit', species: 'cheval', breed: 'Selle français', gender: 'Hongre', color: 'Alezan', status: 'Perdu', owner: 'Famille Degroote', location: 'Ciney, Chevetogne, route d\'Hogne', desc: "Spirit a brisé sa clôture pendant la nuit. Cheval alezan de 12 ans, 1,65 m au garrot. Licou bleu. Il est pucé. Approchez-le calmement, il est doux mais peureux.", date: '2026-06-14' },
  { name: 'Kiwi', species: 'oiseau', breed: 'Inséparable', gender: 'Mâle', color: 'Vert et jaune', status: 'Perdu', owner: 'Manon Gilson', location: 'Nivelles, rue de Soignies', desc: "Kiwi est un inséparable vert et jaune, très petit. Il s'est échappé par la porte d'entrée. Il connaît son nom et peut se poser sur le doigt. Bague à la patte.", date: '2026-06-07' },
  { name: 'Volt', species: 'chien', breed: 'Malinois', gender: 'Mâle', color: 'Brun et noir', status: 'Trouvé', owner: 'Rachid El Amrani', location: 'Liège, Bressoux, rue du Général de Gaulle', desc: "Trouvé errant près de la gare. Malinois mâle, environ 2 ans, très maigre. Pas de collier. Obéissant, connaît assis/couché/pas bouger. Semble avoir été dressé.", date: '2026-06-18' },
  { name: 'Duchesse', species: 'chat', breed: 'Angora turc', gender: 'Femelle', color: 'Blanc', status: 'Perdu', owner: 'Béatrice Jadoul', location: 'Arlon, rue des Faubourgs', desc: "Duchesse est une angora blanche de 8 ans, yeux verts. Très calme, elle ne sort jamais d'habitude. Une fenêtre est restée ouverte. Pucée, stérilisée.", date: '2026-06-13' },
];

// =============================================================================
// Fonctions de traduction
// =============================================================================

function translateBreed(breed, species) {
  if (!breed) return null;
  if (species === 'chat') return CAT_BREED_FR[breed] || breed;
  if (species === 'chien') return DOG_BREED_FR[breed] || breed;
  // NAC, oiseaux : déjà traduit par formatBreed() dans austin.js
  return breed;
}

function translateTemperament(temperament) {
  if (!temperament) return null;
  return temperament
    .split(',')
    .map(w => TEMPERAMENT_FR[w.trim()] || w.trim())
    .join(', ');
}

function translateColor(color) {
  if (!color) return null;
  // Si c'est une couleur composée (ex. "Brown/White")
  return COLOR_FR[color] || color;
}

function translateAge(age) {
  if (!age) return null;
  return age
    .replace(/(\d+) years?/gi, (_m, n) => n === '1' ? '1 an' : `${n} ans`)
    .replace(/(\d+) months?/gi, (_m, n) => `${n} mois`)
    .replace(/(\d+) weeks?/gi, (_m, n) => n === '1' ? '1 semaine' : `${n} semaines`)
    .replace(/(\d+) days?/gi, (_m, n) => n === '1' ? '1 jour' : `${n} jours`);
}

function translateLocation(location, source) {
  if (!location) return null;
  // Pays d'origine thecatapi
  if (source === 'thecatapi' || source === 'thedogapi') {
    return COUNTRY_FR[location] || location;
  }
  // Adresses Austin → remplacées par une ville belge (rotation)
  // Pas de correspondance 1:1, on utilise un hash simple sur la chaîne
  return null; // Sera remplacé dans translateRow
}

// Compteur pour rotation des villes belges
let cityIndex = 0;
function nextBelgianCity() {
  const city = BELGIAN_CITIES[cityIndex % BELGIAN_CITIES.length];
  cityIndex++;
  return city;
}

// =============================================================================
// Pet911 — traduction russe → français en conservant les vraies photos
// =============================================================================

function translatePet911Name(row) {
  const species = row.species === 'chat' ? 'Chat' : row.species === 'chien' ? 'Chien' : 'Animal';
  const status = row.status === 'Trouvé' ? 'trouvé' : 'perdu';
  return `${species} ${status}`;
}

function translatePet911Desc(row) {
  const species = row.species === 'chat' ? 'chat' : row.species === 'chien' ? 'chien' : 'animal';
  const status = row.status === 'Trouvé' ? 'trouvé' : 'perdu';
  const gender = row.gender === 'Mâle' ? 'un mâle' : row.gender === 'Femelle' ? 'une femelle' : 'un animal';
  const color = row.color ? `, de couleur ${translateColor(row.color).toLowerCase()}` : '';
  const breed = row.breed ? `, race ${translateBreed(row.breed, row.species)}` : '';
  const city = row.location ? row.location.split(',')[0].trim() : 'la région';
  return `Annonce signalée à ${city} : ${species} ${status} — ${gender}${color}${breed}. Contactez le propriétaire via Pet's Book pour plus d'informations.`;
}

const RUSSIAN_NAMES_FR = {
  'Ирина': 'Irina',
  'Галина': 'Galina',
  'Дарья Кравцова': 'Daria',
  'Анна': 'Anna',
  'Елена': 'Elena',
  'Ольга': 'Olga',
  'Наталья': 'Natalia',
  'Татьяна': 'Tatiana',
  'Светлана': 'Svetlana',
  'Мария': 'Maria',
  'Александр': 'Alexandre',
  'Сергей': 'Sergueï',
  'Андрей': 'Andreï',
  'Дмитрий': 'Dmitri',
  'Михаил': 'Mikhaïl',
  'Владимир': 'Vladimir',
  'Николай': 'Nikolaï',
};

function translateRussianName(name) {
  if (!name) return null;
  return RUSSIAN_NAMES_FR[name] || name;
}

// =============================================================================
// Suppression des annonces françaises inventées (remplacées par traduction Pet911)
// =============================================================================
// Le tableau FRENCH_LOST_REPORTS n'est plus utilisé — on traduit les données
// réelles de Pet911 en conservant leurs photos.

/**
 * Traduit/remplace une ligne du dataset selon sa source.
 * Retourne la ligne modifiée (ou null si la ligne doit être supprimée).
 */
function translateRow(row) {
  const src = row.source;

  // --- Pet911 : traduction russe → français, conserve les vraies photos ---
  if (src === 'pet911') {
    row.name = translatePet911Name(row);
    row.location = nextBelgianCity() + ', Belgique';
    row.physical_desc = translatePet911Desc(row);
    row.temperament = null;
    row.owner_name = translateRussianName(row.owner_name);
    return row;
  }

  // --- thecatapi : races de chats ---
  if (src === 'thecatapi') {
    const originalBreed = row.breed; // Gardé pour la trad de la description
    row.breed = translateBreed(row.breed, 'chat');
    row.name = CAT_NAME_FR[originalBreed] || row.name;
    row.temperament = translateTemperament(row.temperament);
    row.physical_desc = CAT_DESC_FR[originalBreed] || row.physical_desc;
    row.location = COUNTRY_FR[row.location] || row.location;
    return row;
  }

  // --- thedogapi / dogceo : races de chiens ---
  if (src === 'thedogapi' || src === 'dogceo') {
    row.breed = translateBreed(row.breed, 'chien');
    row.name = DOG_NAME_FR[row.name] || row.name;
    // dogceo n'a pas d'image_url → on ne fait rien
    return row;
  }

  // --- austin : chiens, chats, NAC ---
  if (src === 'austin') {
    row.breed = translateBreed(row.breed, row.species);
    row.breed_secondary = row.breed_secondary ? translateBreed(row.breed_secondary, row.species) : null;
    row.color = translateColor(row.color);
    row.age = translateAge(row.age);
    // Remplacer l'adresse Austin par une ville belge
    if (row.location && /Austin|Travis|TX/i.test(row.location)) {
      row.location = nextBelgianCity() + ', Belgique';
    }
    return row;
  }

  return row;
}

/**
 * Traduit toutes les lignes et applique les traductions.
 * Pour Pet911 : le texte russe est traduit en français, les vraies photos sont conservées.
 * Pour Austin : pas d'images (l'API n'en fournit pas), le frontend utilise le placeholder SVG.
 */
export function translateRows(rows) {
  return rows.map(translateRow).filter(Boolean);
}
