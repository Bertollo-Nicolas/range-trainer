/**
 * Types et interfaces pour les cartes Anki avec support FSRS
 */

import { Card, ReviewLog, State, Rating as Grade } from 'ts-fsrs'

// ==================== TYPES DE BASE ====================

export interface CardMetadata {
  id: string
  deckId: string
  front: string
  back: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  schedulingParams?: Record<string, any> | undefined
}

// Interface complète pour une carte avec données FSRS
export interface FSRSCard extends CardMetadata {
  // Données FSRS intégrées
  fsrsCard: Card
  
  // État de la carte
  state: State
  
  // Dates importantes
  due: Date
  lastReview: Date | undefined
  
  // Métadonnées additionnelles
  suspended: boolean
  buried: boolean
  leechCount: number
}

// Types pour l'historique des révisions
export interface CardReview {
  id: string
  cardId: string
  sessionId: string | undefined
  
  // Données de la révision
  grade: Grade
  duration: number // en millisecondes
  timestamp: Date
  
  // État de la carte avant révision
  stateBefore: State
  dueBefore: Date
  
  // État de la carte après révision
  stateAfter: State
  dueAfter: Date
  
  // Log FSRS complet
  fsrsLog: ReviewLog
}

// Types pour les sessions d'étude
export interface StudySession {
  id: string
  deckId: string | undefined
  startTime: Date
  endTime: Date | undefined
  
  // Statistiques de session
  cardsReviewed: number
  newCards: number
  reviewCards: number
  
  // Performance
  totalDuration: number
  averageDuration: number
  
  // Résultats par grade
  againCount: number
  hardCount: number
  goodCount: number
  easyCount: number
}

// ==================== TYPES POUR LA PLANIFICATION ====================

export interface DueCard {
  card: FSRSCard
  dueDate: Date
  overdueBy: number // en jours
  priority: 'new' | 'learning' | 'review' | 'overdue'
}

export interface StudyPlan {
  deckId: string
  date: Date
  
  // Cartes programmées
  newCards: DueCard[]
  reviewCards: DueCard[]
  learningCards: DueCard[]
  
  // Limites et objectifs
  newCardLimit: number
  reviewLimit: number
  estimatedDuration: number // en minutes
}

// ==================== CONFIGURATION ====================

export interface DeckSettings {
  // Limites quotidiennes
  newCardsPerDay: number
  maxReviewsPerDay: number
  
  // Paramètres FSRS
  requestRetention: number // 0.0 - 1.0, défaut: 0.9
  maximumInterval: number // en jours, défaut: 36500 (100 ans)
  
  // Paramètres d'apprentissage
  learningSteps: number[] // en minutes
  graduatingInterval: number // en jours
  easyInterval: number // en jours
  
  // Paramètres de relecture
  lapseSteps: number[] // en minutes
  leechThreshold: number // nombre de lapses avant d'être marqué comme leech
  
  // Interface
  showTimer: boolean
  autoAdvance: boolean
  randomizeOrder: boolean
}

export const DEFAULT_DECK_SETTINGS: DeckSettings = {
  newCardsPerDay: 20,
  maxReviewsPerDay: 200,
  requestRetention: 0.9,
  maximumInterval: 36500,
  learningSteps: [1, 10],
  graduatingInterval: 1,
  easyInterval: 4,
  lapseSteps: [10],
  leechThreshold: 8,
  showTimer: true,
  autoAdvance: false,
  randomizeOrder: true
}

// ==================== STATISTIQUES ====================

export interface CardStats {
  cardId: string
  
  // Compteurs de base
  totalReviews: number
  lapseCount: number
  
  // Performance
  averageGrade: number
  retentionRate: number
  averageResponseTime: number
  
  // FSRS metrics
  difficulty: number
  stability: number
  retrievability: number
  
  // Historique
  firstReview: Date | undefined
  lastReview: Date | undefined
  nextReview: Date
  
  // État
  currentState: State
  currentInterval: number
  maturity: 'new' | 'young' | 'mature'
}

export interface DeckStats {
  deckId: string
  
  // Compteurs de cartes
  totalCards: number
  newCards: number
  learningCards: number
  reviewCards: number
  suspendedCards: number
  
  // Cartes dues
  dueToday: number
  overdue: number
  
  // Performance globale
  averageRetention: number
  averageGrade: number
  averageResponseTime: number
  
  // Prédictions
  forecastedReviews: Record<string, number> // date -> nombre de révisions
  workloadDistribution: Record<string, number> // date -> minutes estimées
}

// ==================== FILTRES ET RECHERCHE ====================

export interface CardFilter {
  deckIds?: string[]
  states?: State[]
  tags?: string[]
  dueBefore?: Date
  dueAfter?: Date
  createdBefore?: Date
  createdAfter?: Date
  lastReviewBefore?: Date
  lastReviewAfter?: Date
  minGrade?: Grade
  maxGrade?: Grade
  suspended?: boolean
  buried?: boolean
  isLeech?: boolean
}

export interface SearchOptions {
  query?: string // recherche textuelle dans front/back
  filter?: CardFilter
  sortBy?: 'due' | 'created' | 'difficulty' | 'stability' | 'retrievability'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// ==================== IMPORT/EXPORT ====================

export interface CardImport {
  front: string
  back: string
  tags?: string[]
  deckName?: string
}

export interface ImportResult {
  success: number
  failed: number
  errors: Array<{
    index: number
    error: string
    card?: CardImport
  }>
  createdDecks: string[]
}

export interface ExportOptions {
  deckIds?: string[]
  includeMedia?: boolean
  includeScheduling?: boolean
  format: 'json' | 'csv' | 'anki'
}

// ==================== UTILITAIRES ====================

export function isCardDue(card: FSRSCard, now: Date = new Date()): boolean {
  return card.due <= now && !card.suspended && !card.buried
}

export function getCardMaturity(card: FSRSCard): 'new' | 'young' | 'mature' {
  if (card.state === State.New) return 'new'
  
  const intervalDays = (card.due.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  return intervalDays >= 21 ? 'mature' : 'young'
}

export function calculateOverdueDays(card: FSRSCard, now: Date = new Date()): number {
  if (card.due > now) return 0
  return Math.floor((now.getTime() - card.due.getTime()) / (1000 * 60 * 60 * 24))
}