/**
 * API principale pour le système Anki avec FSRS
 * Interface simplifiée pour l'utilisation dans les composants
 */

import { Rating as Grade, State } from 'ts-fsrs'
import { ReviewEngine } from './review-engine'
import { StorageAdapter } from './storage-adapter'
import { FSRSService } from './fsrs-service'
import { 
  FSRSCard, 
  CardReview, 
  StudySession, 
  DueCard, 
  StudyPlan,
  DeckSettings,
  DeckStats,
  CardImport,
  ImportResult,
  SearchOptions
} from './card-model'

// ==================== CLASSE PRINCIPALE ====================

export class AnkiEngine {
  private reviewEngine: ReviewEngine
  private storageAdapter: StorageAdapter
  private fsrsService: FSRSService
  private static instance: AnkiEngine | null = null

  constructor(deckSettings?: Partial<DeckSettings>) {
    this.reviewEngine = new ReviewEngine(deckSettings)
    this.storageAdapter = new StorageAdapter()
    this.fsrsService = new FSRSService(deckSettings)
  }

  /**
   * Obtient l'instance singleton (optionnel)
   */
  static getInstance(deckSettings?: Partial<DeckSettings>): AnkiEngine {
    if (!AnkiEngine.instance) {
      AnkiEngine.instance = new AnkiEngine(deckSettings)
    }
    return AnkiEngine.instance
  }

  // ==================== GESTION DES CARTES ====================

  /**
   * Crée une nouvelle carte
   */
  async createCard(cardData: {
    deckId: string
    front: string
    back: string
    tags?: string[]
  }): Promise<FSRSCard> {
    const card = this.fsrsService.initializeCard({
      id: crypto.randomUUID(),
      ...cardData
    })

    await this.storageAdapter.saveCard(card)
    return card
  }

  /**
   * Met à jour une carte existante
   */
  async updateCard(cardId: string, updates: {
    front?: string
    back?: string
    tags?: string[]
  }): Promise<FSRSCard> {
    const card = await this.storageAdapter.loadCard(cardId)
    if (!card) {
      throw new Error(`Card not found: ${cardId}`)
    }

    // Met à jour les champs modifiés
    if (updates.front !== undefined) card.front = updates.front
    if (updates.back !== undefined) card.back = updates.back
    if (updates.tags !== undefined) card.tags = updates.tags
    card.updatedAt = new Date()

    await this.storageAdapter.saveCard(card)
    return card
  }

  /**
   * Supprime une carte
   */
  async deleteCard(cardId: string): Promise<void> {
    await this.storageAdapter.deleteCard(cardId)
  }

  /**
   * Obtient une carte par ID
   */
  async getCard(cardId: string): Promise<FSRSCard | null> {
    return await this.storageAdapter.loadCard(cardId)
  }

  /**
   * Obtient toutes les cartes d'un deck
   */
  async getCardsByDeck(deckId: string): Promise<FSRSCard[]> {
    return await this.storageAdapter.loadCardsByDeck(deckId)
  }

  /**
   * Recherche des cartes avec filtres
   */
  async searchCards(options: SearchOptions): Promise<{ cards: FSRSCard[]; total: number }> {
    return await this.storageAdapter.searchCards(options)
  }

  // ==================== RÉVISIONS ====================

  /**
   * Obtient les cartes dues pour révision
   */
  async getDueCards(deckId?: string, limit?: number): Promise<DueCard[]> {
    return await this.reviewEngine.getDueCards(deckId, limit)
  }

  /**
   * Obtient toutes les cartes d'un deck
   */
  async getAllCards(deckId: string): Promise<FSRSCard[]> {
    return await this.storageAdapter.loadCardsByDeck(deckId)
  }

  /**
   * Révise une carte
   */
  async reviewCard(cardId: string, grade: Grade, duration?: number): Promise<{
    updatedCard: FSRSCard
    review: CardReview
  }> {
    return await this.reviewEngine.reviewCard(cardId, grade, duration)
  }

  /**
   * Démarre une session d'étude
   */
  async startStudySession(deckId?: string): Promise<StudySession> {
    return await this.reviewEngine.startSession(deckId)
  }

  /**
   * Termine la session d'étude actuelle
   */
  async endStudySession(): Promise<StudySession | null> {
    return await this.reviewEngine.endSession()
  }

  /**
   * Obtient la session d'étude actuelle
   */
  getCurrentSession(): StudySession | null {
    return this.reviewEngine.getCurrentSession()
  }

  // ==================== PLANIFICATION ====================

  /**
   * Génère un plan d'étude pour un deck
   */
  async generateStudyPlan(deckId: string, date?: Date, settings?: DeckSettings): Promise<StudyPlan> {
    return await this.reviewEngine.generateStudyPlan(deckId, date, settings)
  }

  /**
   * Prédit la charge de travail future
   */
  async predictWorkload(deckId: string, daysAhead?: number): Promise<Array<{
    date: Date
    newCards: number
    reviewCards: number
    estimatedTime: number
  }>> {
    return await this.reviewEngine.predictWorkload(deckId, daysAhead)
  }

  // ==================== STATISTIQUES ====================

  /**
   * Calcule les statistiques d'un deck
   */
  async getDeckStats(deckId: string): Promise<DeckStats> {
    return await this.reviewEngine.calculateDeckStats(deckId)
  }

  /**
   * Obtient l'historique des révisions d'une carte
   */
  async getCardHistory(cardId: string): Promise<CardReview[]> {
    return await this.storageAdapter.loadCardReviews(cardId)
  }

  // ==================== GESTION AVANCÉE ====================

  /**
   * Suspend une carte
   */
  async suspendCard(cardId: string): Promise<void> {
    await this.reviewEngine.suspendCard(cardId)
  }


  /**
   * Réactive une carte suspendue
   */
  async unsuspendCard(cardId: string): Promise<void> {
    await this.reviewEngine.unsuspendCard(cardId)
  }


  /**
   * Enterre une carte temporairement
   */
  async buryCard(cardId: string): Promise<void> {
    await this.reviewEngine.buryCard(cardId)
  }

  /**
   * Déterre toutes les cartes d'un deck
   */
  async unburyCards(deckId: string): Promise<number> {
    return await this.reviewEngine.unburyCards(deckId)
  }

  /**
   * Remet à zéro l'apprentissage d'une carte
   */
  async resetCard(cardId: string): Promise<void> {
    await this.reviewEngine.resetCard(cardId)
  }

  // ==================== CONFIGURATION ====================

  /**
   * Sauvegarde les paramètres d'un deck
   */
  async saveDeckSettings(deckId: string, settings: DeckSettings): Promise<void> {
    await this.storageAdapter.saveDeckSettings(deckId, settings)
    this.reviewEngine.updateFSRSParameters(settings)
  }

  /**
   * Charge les paramètres d'un deck
   */
  async loadDeckSettings(deckId: string): Promise<DeckSettings | null> {
    return await this.storageAdapter.loadDeckSettings(deckId)
  }

  /**
   * Recalcule toutes les cartes avec les nouveaux paramètres
   */
  async recalculateAllCards(deckId: string): Promise<number> {
    return await this.reviewEngine.recalculateAllCards(deckId)
  }

  // ==================== IMPORT/EXPORT ====================

  /**
   * Importe des cartes en lot
   */
  async importCards(cards: CardImport[], defaultDeckId: string): Promise<ImportResult> {
    return await this.storageAdapter.importCards(cards, defaultDeckId)
  }

  /**
   * Importe depuis un fichier JSON
   */
  async importFromJson(jsonData: { cards: CardImport[] }, deckId: string): Promise<ImportResult> {
    return await this.importCards(jsonData.cards, deckId)
  }

  // ==================== UTILITAIRES ====================

  /**
   * Convertit un nombre en Grade FSRS
   */
  static gradeFromNumber(grade: number): Grade {
    return FSRSService.gradeFromNumber(grade)
  }

  /**
   * Convertit un Grade FSRS en nombre
   */
  static gradeToNumber(grade: Grade): number {
    return FSRSService.gradeToNumber(grade)
  }

  /**
   * Obtient les paramètres FSRS actuels
   */
  getFSRSParameters() {
    return this.reviewEngine.getFSRSParameters()
  }
}

// ==================== EXPORTS ====================

// Export des types principaux
export type {
  FSRSCard,
  CardReview,
  StudySession,
  DueCard,
  StudyPlan,
  DeckSettings,
  DeckStats,
  CardImport,
  ImportResult,
  SearchOptions
}

// Export des enums de ts-fsrs
export { Grade, State }

// ==================== FACTORY FUNCTIONS ====================

/**
 * Crée une nouvelle instance du moteur Anki
 */
export function createAnkiEngine(deckSettings?: Partial<DeckSettings>): AnkiEngine {
  return new AnkiEngine(deckSettings)
}

/**
 * Crée une instance singleton du moteur Anki
 */
export function getAnkiEngine(deckSettings?: Partial<DeckSettings>): AnkiEngine {
  return AnkiEngine.getInstance(deckSettings)
}

// ==================== CONSTANTES ====================


export const ANKI_GRADES = {
  AGAIN: Grade.Again,
  HARD: Grade.Hard,
  GOOD: Grade.Good,
  EASY: Grade.Easy
} as const

export const ANKI_GRADE_LABELS = {
  [Grade.Again]: 'Again',
  [Grade.Hard]: 'Hard',
  [Grade.Good]: 'Good',
  [Grade.Easy]: 'Easy'
} as const

export const ANKI_GRADE_COLORS = {
  [Grade.Again]: '#ef4444', // red-500
  [Grade.Hard]: '#f97316', // orange-500
  [Grade.Good]: '#22c55e', // green-500
  [Grade.Easy]: '#3b82f6'  // blue-500
} as const

// ==================== EXEMPLE D'USAGE ====================

/*
// Exemple d'utilisation simple :

const engine = createAnkiEngine()

// Créer une carte
const card = await engine.createCard({
  deckId: 'my-deck-id',
  front: 'Qu\'est-ce que FSRS ?',
  back: 'Free Spaced Repetition Scheduler - Un algorithme optimisé pour la répétition espacée'
})

// Obtenir les cartes dues
const dueCards = await engine.getDueCards('my-deck-id')

// Démarrer une session
const session = await engine.startStudySession('my-deck-id')

// Réviser une carte
const result = await engine.reviewCard(card.id, Grade.Good, 5000) // 5 secondes

// Terminer la session
await engine.endStudySession()

// Obtenir les statistiques
const stats = await engine.getDeckStats('my-deck-id')
*/