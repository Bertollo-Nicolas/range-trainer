// Core poker types for range training
export type PokerSuit = 'h' | 'd' | 'c' | 's'
export type PokerRank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'

export interface PokerCard {
  rank: PokerRank
  suit: PokerSuit
}

export type PokerHand = string

// Poker hand matrix structure (13x13 grid)
export const POKER_HANDS: PokerHand[][] = [
  ['AA', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s'],
  ['AKo', 'KK', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s'],
  ['AQo', 'KQo', 'QQ', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s'],
  ['AJo', 'KJo', 'QJo', 'JJ', 'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s'],
  ['ATo', 'KTo', 'QTo', 'JTo', 'TT', 'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s'],
  ['A9o', 'K9o', 'Q9o', 'J9o', 'T9o', '99', '98s', '97s', '96s', '95s', '94s', '93s', '92s'],
  ['A8o', 'K8o', 'Q8o', 'J8o', 'T8o', '98o', '88', '87s', '86s', '85s', '84s', '83s', '82s'],
  ['A7o', 'K7o', 'Q7o', 'J7o', 'T7o', '97o', '87o', '77', '76s', '75s', '74s', '73s', '72s'],
  ['A6o', 'K6o', 'Q6o', 'J6o', 'T6o', '96o', '86o', '76o', '66', '65s', '64s', '63s', '62s'],
  ['A5o', 'K5o', 'Q5o', 'J5o', 'T5o', '95o', '85o', '75o', '65o', '55', '54s', '53s', '52s'],
  ['A4o', 'K4o', 'Q4o', 'J4o', 'T4o', '94o', '84o', '74o', '64o', '54o', '44', '43s', '42s'],
  ['A3o', 'K3o', 'Q3o', 'J3o', 'T3o', '93o', '83o', '73o', '63o', '53o', '43o', '33', '32s'],
  ['A2o', 'K2o', 'Q2o', 'J2o', 'T2o', '92o', '82o', '72o', '62o', '52o', '42o', '32o', '22']
]

// All poker hands in a flat array for easy iteration
export const ALL_POKER_HANDS: PokerHand[] = POKER_HANDS.flat()

// Utility functions for poker hands
export const getHandCombinations = (hand: PokerHand): number => {
  if (hand.includes('s') || hand.includes('o')) {
    return 4 // Suited or offsuit non-pairs
  }
  return 6 // Pocket pairs
}

export const isHandPair = (hand: PokerHand): boolean => {
  return hand.length === 2 && hand[0] === hand[1]
}

export const isHandSuited = (hand: PokerHand): boolean => {
  return hand.includes('s')
}

export const isHandOffsuit = (hand: PokerHand): boolean => {
  return hand.includes('o')
}

// Range calculations
export interface RangeStats {
  totalHands: number
  totalCombinations: number
  percentage: number
}

export const calculateRangeStats = (hands: PokerHand[]): RangeStats => {
  const totalCombinations = hands.reduce((sum, hand) => sum + getHandCombinations(hand), 0)
  const totalPossibleCombinations = 1326 // Total possible poker combinations (52C2)
  
  return {
    totalHands: hands.length,
    totalCombinations,
    percentage: (totalCombinations / totalPossibleCombinations) * 100
  }
}

// Hand selection utilities
export interface HandSelection {
  hands: PokerHand[]
  stats: RangeStats
}

export const createHandSelection = (hands: PokerHand[]): HandSelection => ({
  hands,
  stats: calculateRangeStats(hands)
})

// Poker actions for range analysis
export type PokerActionType = 'fold' | 'call' | 'raise' | 'all-in' | 'check' | 'bet' | 'custom'

export interface PokerAction {
  id: string
  type: PokerActionType
  name: string
  color: string
  sizing?: number // For bets/raises (as percentage of pot)
  description?: string
}

// Default poker actions
export const DEFAULT_POKER_ACTIONS: PokerAction[] = [
  {
    id: 'fold',
    type: 'fold',
    name: 'Fold',
    color: '#ef4444', // red-500
  },
  {
    id: 'call',
    type: 'call',
    name: 'Call',
    color: '#22c55e', // green-500
  },
  {
    id: 'raise',
    type: 'raise',
    name: 'Raise',
    color: '#3b82f6', // blue-500
    sizing: 100, // 1x pot
  },
  {
    id: 'all-in',
    type: 'all-in',
    name: 'All-in',
    color: '#8b5cf6', // violet-500
  }
]

// Hand position types for GTO analysis
export type PokerPosition = 
  | 'UTG' | 'UTG+1' | 'UTG+2' 
  | 'LJ' | 'HJ' | 'CO' 
  | 'BTN' | 'SB' | 'BB'

export interface PositionInfo {
  position: PokerPosition
  fullName: string
  order: number
  isEarlyPosition: boolean
  isMiddlePosition: boolean
  isLatePosition: boolean
  isBlinds: boolean
}

export const POKER_POSITIONS: Record<PokerPosition, PositionInfo> = {
  'UTG': { position: 'UTG', fullName: 'Under The Gun', order: 1, isEarlyPosition: true, isMiddlePosition: false, isLatePosition: false, isBlinds: false },
  'UTG+1': { position: 'UTG+1', fullName: 'Under The Gun +1', order: 2, isEarlyPosition: true, isMiddlePosition: false, isLatePosition: false, isBlinds: false },
  'UTG+2': { position: 'UTG+2', fullName: 'Under The Gun +2', order: 3, isEarlyPosition: true, isMiddlePosition: false, isLatePosition: false, isBlinds: false },
  'LJ': { position: 'LJ', fullName: 'Lojack', order: 4, isEarlyPosition: false, isMiddlePosition: true, isLatePosition: false, isBlinds: false },
  'HJ': { position: 'HJ', fullName: 'Hijack', order: 5, isEarlyPosition: false, isMiddlePosition: true, isLatePosition: false, isBlinds: false },
  'CO': { position: 'CO', fullName: 'Cutoff', order: 6, isEarlyPosition: false, isMiddlePosition: false, isLatePosition: true, isBlinds: false },
  'BTN': { position: 'BTN', fullName: 'Button', order: 7, isEarlyPosition: false, isMiddlePosition: false, isLatePosition: true, isBlinds: false },
  'SB': { position: 'SB', fullName: 'Small Blind', order: 8, isEarlyPosition: false, isMiddlePosition: false, isLatePosition: false, isBlinds: true },
  'BB': { position: 'BB', fullName: 'Big Blind', order: 9, isEarlyPosition: false, isMiddlePosition: false, isLatePosition: false, isBlinds: true },
}