// Couleurs pour les cartes de poker
export const getCardColor = (suit: string): string => {
  switch (suit.toLowerCase()) {
    case 'h': // Hearts - Coeur
    case 'heart':
    case 'hearts':
      return 'text-red-600'
    case 's': // Spades - Pique  
    case 'spade':
    case 'spades':
      return 'text-black'
    case 'c': // Clubs - Trèfle
    case 'club': 
    case 'clubs':
      return 'text-green-600'
    case 'd': // Diamonds - Carreau
    case 'diamond':
    case 'diamonds':
      return 'text-blue-600'
    default:
      return 'text-black'
  }
}

// Symboles Unicode pour les couleurs
export const getSuitSymbol = (suit: string): string => {
  switch (suit.toLowerCase()) {
    case 'h':
    case 'heart':
    case 'hearts':
      return '♥'
    case 's':
    case 'spade':
    case 'spades':
      return '♠'
    case 'c':
    case 'club':
    case 'clubs':
      return '♣'
    case 'd':
    case 'diamond':
    case 'diamonds':
      return '♦'
    default:
      return suit
  }
}

// Formatter une carte avec couleur
export const formatCard = (card: string): { rank: string, suit: string, color: string, symbol: string } => {
  if (card.length < 2) return { rank: card, suit: '', color: 'text-black', symbol: '' }
  
  const rank = card.slice(0, -1)
  const suit = card.slice(-1)
  
  return {
    rank,
    suit,
    color: getCardColor(suit),
    symbol: getSuitSymbol(suit)
  }
}