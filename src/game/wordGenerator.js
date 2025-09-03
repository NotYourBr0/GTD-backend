const words = [
  // Easy words (3-5 letters)
  'cat', 'dog', 'sun', 'car', 'house', 'tree', 'book', 'phone', 'chair', 'table',
  'bird', 'fish', 'cake', 'ball', 'shoe', 'hand', 'face', 'door', 'food', 'moon',
  'star', 'fire', 'water', 'apple', 'heart', 'smile', 'clock', 'brush', 'music', 'dance',
  
  // Medium words (6-8 letters)
  'elephant', 'computer', 'rainbow', 'guitar', 'bicycle', 'sandwich', 'umbrella', 'butterfly',
  'mountain', 'keyboard', 'football', 'triangle', 'hospital', 'dinosaur', 'airplane', 'princess',
  'building', 'exercise', 'vacation', 'octopus', 'penguin', 'hamburger', 'chocolate',
  'telephone', 'medicine', 'magazine', 'calendar', 'skeleton', 'kangaroo',
  
  // Hard words (9+ letters)
  'skateboard', 'refrigerator', 'playground', 'helicopter', 'calculator', 'microscope',
  'photographer', 'thunderstorm', 'watermelon', 'rollercoaster', 'temperature', 'architecture',
  'intelligence', 'encyclopedia', 'constellation', 'transportation', 'communication', 'celebration',
  'procrastination', 'extraordinary', 'rehabilitation', 'responsibility',
  
  // Fun/Creative words
  'wizard', 'dragon', 'castle', 'pirate', 'robot', 'alien', 'superhero', 'monster',
  'zombie', 'vampire', 'unicorn', 'mermaid', 'spaceship', 'treasure', 'magic',
  'adventure', 'mystery', 'comedy', 'fantasy', 'science'
];

const categories = {
  animals: ['cat', 'dog', 'elephant', 'bird', 'fish', 'butterfly', 'octopus', 'penguin', 'kangaroo'],
  objects: ['car', 'phone', 'chair', 'table', 'book', 'shoe', 'clock', 'brush', 'umbrella'],
  food: ['cake', 'apple', 'sandwich', 'hamburger', 'chocolate', 'watermelon'],
  nature: ['sun', 'moon', 'star', 'tree', 'water', 'fire', 'mountain', 'rainbow'],
  technology: ['computer', 'keyboard', 'telephone', 'calculator', 'microscope', 'helicopter'],
  fantasy: ['wizard', 'dragon', 'castle', 'pirate', 'robot', 'alien', 'superhero', 'unicorn']
};

function generateRandomWord(difficulty = 'mixed', category = 'all') {
  let wordPool = words;
  
  // Filter by difficulty
  if (difficulty === 'easy') {
    wordPool = words.filter(word => word.length <= 5);
  } else if (difficulty === 'medium') {
    wordPool = words.filter(word => word.length >= 6 && word.length <= 8);
  } else if (difficulty === 'hard') {
    wordPool = words.filter(word => word.length >= 9);
  }
  
  // Filter by category
  if (category !== 'all' && categories[category]) {
    wordPool = wordPool.filter(word => categories[category].includes(word));
  }
  
  if (wordPool.length === 0) {
    wordPool = words; // Fallback to all words
  }
  
  const randomIndex = Math.floor(Math.random() * wordPool.length);
  return wordPool[randomIndex];
}

function getWordHint(word) {
  const length = word.length;
  let hint = '';
  
  for (let i = 0; i < length; i++) {
    if (i === 0 || i === length - 1 || word[i] === ' ') {
      hint += word[i];
    } else {
      hint += '_';
    }
  }
  
  return hint;
}

function getCategories() {
  return Object.keys(categories);
}

function getWordsByCategory(category) {
  return categories[category] || [];
}

module.exports = {
  generateRandomWord,
  getWordHint,
  getCategories,
  getWordsByCategory,
  words,
  categories
};