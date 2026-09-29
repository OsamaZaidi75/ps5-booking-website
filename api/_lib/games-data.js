// Static game library data. Migrated from the old Express backend so both
// /api/games and email templates can share a single source of truth.
const games = [
  {
    id: 1,
    name: 'Tekken 8',
    image: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tekken_8_cover_art.jpg',
    genre: 'Fighting',
    players: '1-2',
    description: 'The latest installment in the legendary fighting game series',
  },
  {
    id: 2,
    name: 'Ghost of Tsushima',
    image: 'https://upload.wikimedia.org/wikipedia/en/b/b6/Ghost_of_Tsushima.jpg',
    genre: 'Action-Adventure',
    players: '1',
    description: 'An epic samurai adventure set in feudal Japan',
  },
  {
    id: 3,
    name: 'Mortal Kombat 1',
    image: 'https://upload.wikimedia.org/wikipedia/en/5/5b/Mortal_Kombat_1_key_art.jpeg',
    genre: 'Fighting',
    players: '1-2',
    description: 'The ultimate fighting game with brutal fatalities',
  },
  {
    id: 4,
    name: 'God of War Ragnarök',
    image: 'https://upload.wikimedia.org/wikipedia/en/e/ee/God_of_War_Ragnar%C3%B6k_cover.jpg',
    genre: 'Action-Adventure',
    players: '1',
    description: 'Kratos and Atreus battle through Norse myth to stop Ragnarök',
  },
  {
    id: 5,
    name: "Marvel's Spider-Man 2",
    image: 'https://upload.wikimedia.org/wikipedia/en/0/0f/SpiderMan2PS5BoxArt.jpeg',
    genre: 'Action-Adventure',
    players: '1',
    description: 'Swing across New York as Peter Parker and Miles Morales',
  },
  {
    id: 6,
    name: 'Gran Turismo 7',
    image: 'https://upload.wikimedia.org/wikipedia/en/1/14/Gran_Turismo_7_cover_art.jpg',
    genre: 'Racing',
    players: '1-2',
    description: 'The definitive sim-racing experience with DualSense feedback',
  },
  {
    id: 7,
    name: 'Street Fighter 6',
    image: 'https://upload.wikimedia.org/wikipedia/en/9/94/Street_Fighter_6_box_art.jpg',
    genre: 'Fighting',
    players: '1-2',
    description: "Capcom's acclaimed fighter with rollback netcode and deep combat",
  },
  {
    id: 8,
    name: 'Horizon Forbidden West',
    image: 'https://upload.wikimedia.org/wikipedia/en/6/69/Horizon_Forbidden_West_cover_art.jpg',
    genre: 'Action RPG',
    players: '1',
    description: 'Aloy explores a post-apocalyptic frontier full of machine beasts',
  },
  {
    id: 9,
    name: 'Elden Ring',
    image: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg',
    genre: 'Action RPG',
    players: '1',
    description: 'A sprawling dark-fantasy world from FromSoftware and George R. R. Martin',
  },
];

module.exports = { games };
