import { Database } from './database'

// Types de base extraits de la DB
export type AnkiDeck = Database['public']['Tables']['anki_decks']['Row']
export type AnkiDeckInsert = Database['public']['Tables']['anki_decks']['Insert']
export type AnkiDeckUpdate = Database['public']['Tables']['anki_decks']['Update']

export type AnkiCard = Database['public']['Tables']['anki_cards']['Row']
export type AnkiCardInsert = Database['public']['Tables']['anki_cards']['Insert']
export type AnkiCardUpdate = Database['public']['Tables']['anki_cards']['Update']

export type AnkiReview = Database['public']['Tables']['anki_reviews']['Row']
export type AnkiReviewInsert = Database['public']['Tables']['anki_reviews']['Insert']

export type AnkiStudySession = Database['public']['Tables']['anki_study_sessions']['Row']
export type AnkiStudySessionInsert = Database['public']['Tables']['anki_study_sessions']['Insert']
export type AnkiStudySessionUpdate = Database['public']['Tables']['anki_study_sessions']['Update']

// Types étendus pour l'UI
export interface AnkiDeckWithStats extends AnkiDeck {
  cardCount: number
  newCards: number
  dueCards: number
  children?: AnkiDeckWithStats[]
}

export interface AnkiCardWithDeck extends AnkiCard {
  deck: AnkiDeck
}

// Types pour l'arbre hiérarchique (similaire à tree-items)
export interface AnkiTreeNode extends AnkiDeck {
  children: AnkiTreeNode[]
  cardCount: number
  newCards: number
  dueCards: number
}

// Types pour l'algorithme SM-2
export interface SM2Result {
  easeFactor: number
  interval: number
  nextReviewDate: Date
}

export interface ReviewResponse {
  quality: 1 | 2 | 3 | 4 // Again, Hard, Good, Easy
  responseTime?: number
}

// Types pour les statistiques
export interface DeckStats {
  totalCards: number
  newCards: number
  learningCards: number
  reviewCards: number
  dueCards: number
  masteredCards: number
  averageEase: number
  retentionRate: number
}

export interface StudyStats {
  cardsStudied: number
  accuracy: number
  averageTime: number
  streak: number
  timeSpent: number
}

// Types pour la heatmap
export interface HeatmapData {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4 // Intensité de 0 à 4
}

// Types pour les courbes d'apprentissage
export interface LearningCurvePoint {
  date: string
  retention: number
  averageEase: number
  cardsReviewed: number
}

// Types pour les prédictions de workload
export interface WorkloadPrediction {
  date: string
  predictedReviews: number
  newCardsScheduled: number
  estimatedTime: number // en minutes
}

// Types pour l'import/export
export interface AnkiExportData {
  decks: AnkiDeck[]
  cards: AnkiCard[]
  version: string
  exportDate: string
}

// Configuration par défaut
export const DEFAULT_DECK_CONFIG = {
  new_cards_per_day: 20,
  review_cards_per_day: 200,
  learning_steps: [1, 10], // minutes
  graduating_interval: 1, // days
  easy_interval: 4, // days
  starting_ease: 2.5,
  color: '#3B82F6',
  icon: '📚'
} as const

export const SM2_CONFIG = {
  minEaseFactor: 1.3,
  maxEaseFactor: 2.5,
  easyBonus: 0.15,
  hardPenalty: 0.2,
  againPenalty: 0.2
} as const

// États des cartes
export const CARD_STATES = {
  NEW: 'new',
  LEARNING: 'learning', 
  REVIEW: 'review',
  RELEARNING: 'relearning'
} as const

// Qualités de réponse
export const REVIEW_QUALITY = {
  AGAIN: 1,
  HARD: 2, 
  GOOD: 3,
  EASY: 4
} as const