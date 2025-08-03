/**
 * Moteur de révision principal qui orchestre les sessions d'étude
 */

import { Rating as Grade, State } from 'ts-fsrs'
import { 
  FSRSCard, 
  CardReview, 
  StudySession, 
  DueCard, 
  StudyPlan,
  DeckSettings,
  DEFAULT_DECK_SETTINGS,
  CardFilter,
  DeckStats,
  isCardDue,
  calculateOverdueDays
} from './card-model'
import { FSRSService } from './fsrs-service'
import { StorageAdapter } from './storage-adapter'
import { 
  CardNotFoundError, 
  SessionActiveError, 
  CardSuspendedError, 
  CardBuriedError,
  validateGrade
} from './errors'

export class ReviewEngine {
  private fsrsService: FSRSService
  private storageAdapter: StorageAdapter
  private currentSession: StudySession | null = null

  constructor(deckSettings?: Partial<DeckSettings>) {
    this.fsrsService = new FSRSService(deckSettings)
    this.storageAdapter = new StorageAdapter()
  }

  // ==================== GESTION DES SESSIONS ====================

  /**
   * Démarre une nouvelle session d'étude
   */
  async startSession(deckId?: string): Promise<StudySession> {
    if (this.currentSession && !this.currentSession.endTime) {
      throw new SessionActiveError()
    }

    this.currentSession = await this.storageAdapter.createSession(deckId)
    return this.currentSession
  }

  /**
   * Termine la session d'étude actuelle
   */
  async endSession(): Promise<StudySession | null> {
    if (!this.currentSession) {
      return null
    }

    this.currentSession.endTime = new Date()
    this.currentSession.totalDuration = 
      this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()
    
    if (this.currentSession.cardsReviewed > 0) {
      this.currentSession.averageDuration = 
        this.currentSession.totalDuration / this.currentSession.cardsReviewed
    }

    await this.storageAdapter.updateSession(this.currentSession)
    
    const completedSession = this.currentSession
    this.currentSession = null
    return completedSession
  }

  /**
   * Obtient la session actuelle
   */
  getCurrentSession(): StudySession | null {
    return this.currentSession
  }

  // ==================== RÉVISIONS DE CARTES ====================

  /**
   * Révise une carte et met à jour son scheduling
   */
  async reviewCard(
    cardId: string, 
    grade: Grade, 
    duration: number = 0
  ): Promise<{ updatedCard: FSRSCard; review: CardReview }> {
    // Validation des paramètres
    validateGrade(grade)
    
    // Charge la carte
    const card = await this.storageAdapter.loadCard(cardId)
    if (!card) {
      throw new CardNotFoundError(cardId)
    }

    if (card.suspended) {
      throw new CardSuspendedError(cardId)
    }

    if (card.buried) {
      throw new CardBuriedError(cardId)
    }

    const reviewTime = new Date()

    // Traite la révision avec FSRS
    const { updatedCard, reviewLog } = this.fsrsService.processReview(
      card, 
      grade, 
      reviewTime, 
      duration
    )

    // Crée l'enregistrement de révision
    const review: CardReview = {
      id: crypto.randomUUID(),
      cardId: card.id,
      sessionId: this.currentSession?.id,
      grade,
      duration,
      timestamp: reviewTime,
      stateBefore: card.state,
      dueBefore: new Date(card.due),
      stateAfter: updatedCard.state,
      dueAfter: new Date(updatedCard.due),
      fsrsLog: reviewLog
    }

    // Sauvegarde en base de données
    await Promise.all([
      this.storageAdapter.saveCard(updatedCard),
      this.storageAdapter.saveReview(review)
    ])

    // Met à jour la session actuelle
    if (this.currentSession) {
      this.currentSession.cardsReviewed++
      
      if (card.state === State.New) {
        this.currentSession.newCards++
      } else {
        this.currentSession.reviewCards++
      }

      // Compteurs par grade
      switch (grade) {
        case Grade.Again:
          this.currentSession.againCount++
          break
        case Grade.Hard:
          this.currentSession.hardCount++
          break
        case Grade.Good:
          this.currentSession.goodCount++
          break
        case Grade.Easy:
          this.currentSession.easyCount++
          break
      }

      await this.storageAdapter.updateSession(this.currentSession)
    }

    return { updatedCard, review }
  }

  /**
   * Révise plusieurs cartes en lot (pour les tests ou imports)
   */
  async reviewCards(reviews: Array<{ cardId: string; grade: Grade; duration?: number }>): Promise<{
    successful: Array<{ card: FSRSCard; review: CardReview }>
    failed: Array<{ cardId: string; error: string }>
  }> {
    const successful = []
    const failed = []

    for (const reviewData of reviews) {
      try {
        const result = await this.reviewCard(
          reviewData.cardId, 
          reviewData.grade, 
          reviewData.duration || 0
        )
        successful.push({ card: result.updatedCard, review: result.review })
      } catch (error) {
        failed.push({
          cardId: reviewData.cardId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return { successful, failed }
  }

  // ==================== RÉCUPÉRATION DE CARTES ====================

  /**
   * Obtient les cartes dues pour révision
   */
  async getDueCards(deckId?: string, limit?: number): Promise<DueCard[]> {
    const cards = await this.storageAdapter.loadDueCards(deckId, limit)
    const now = new Date()

    return cards.map(card => {
      const overdueBy = calculateOverdueDays(card, now)
      
      let priority: DueCard['priority']
      if (card.state === State.New) {
        priority = 'new'
      } else if (card.state === State.Learning || card.state === State.Relearning) {
        priority = 'learning'
      } else if (overdueBy > 0) {
        priority = 'overdue'
      } else {
        priority = 'review'
      }

      return {
        card,
        dueDate: card.due,
        overdueBy,
        priority
      }
    }).sort((a, b) => {
      // Priorité de tri: learning > overdue > review > new
      const priorityOrder = { learning: 0, overdue: 1, review: 2, new: 3 }
      const aPriority = priorityOrder[a.priority]
      const bPriority = priorityOrder[b.priority]
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      // À priorité égale, trier par date due
      return a.dueDate.getTime() - b.dueDate.getTime()
    })
  }

  /**
   * Obtient les nouvelles cartes à apprendre
   */
  async getNewCards(deckId: string, limit: number = 20): Promise<FSRSCard[]> {
    const { cards } = await this.storageAdapter.searchCards({
      filter: {
        deckIds: [deckId],
        states: [State.New],
        suspended: false,
        buried: false
      },
      sortBy: 'created',
      sortOrder: 'asc',
      limit
    })

    return cards
  }

  /**
   * Obtient les cartes en cours d'apprentissage
   */
  async getLearningCards(deckId?: string): Promise<FSRSCard[]> {
    const filter: CardFilter = {
      states: [State.Learning, State.Relearning],
      suspended: false,
      buried: false
    }

    if (deckId) {
      filter.deckIds = [deckId]
    }

    const { cards } = await this.storageAdapter.searchCards({
      filter,
      sortBy: 'due',
      sortOrder: 'asc'
    })

    return cards
  }

  // ==================== PLANIFICATION ====================

  /**
   * Génère un plan d'étude pour une date donnée
   */
  async generateStudyPlan(
    deckId: string, 
    date: Date = new Date(),
    settings?: DeckSettings
  ): Promise<StudyPlan> {
    const deckSettings = settings || await this.storageAdapter.loadDeckSettings(deckId) || DEFAULT_DECK_SETTINGS

    // Cartes dues pour cette date
    const dueCards = await this.getDueCards(deckId)
    const learningCards = dueCards.filter(dc => dc.priority === 'learning')
    const reviewCards = dueCards.filter(dc => dc.priority === 'review' || dc.priority === 'overdue')
    
    // Nouvelles cartes dans la limite
    const newCards = await this.getNewCards(deckId, deckSettings.newCardsPerDay)
    const newDueCards = newCards.map(card => ({
      card,
      dueDate: card.due,
      overdueBy: 0,
      priority: 'new' as const
    }))

    // Limite les révisions
    const limitedReviewCards = reviewCards.slice(0, deckSettings.maxReviewsPerDay)

    // Estimation du temps
    const avgTimePerCard = 30 // 30 secondes par carte (peut être personnalisé)
    const totalCards = learningCards.length + limitedReviewCards.length + newDueCards.length
    const estimatedDuration = Math.ceil(totalCards * avgTimePerCard / 60) // en minutes

    return {
      deckId,
      date,
      newCards: newDueCards,
      reviewCards: limitedReviewCards,
      learningCards,
      newCardLimit: deckSettings.newCardsPerDay,
      reviewLimit: deckSettings.maxReviewsPerDay,
      estimatedDuration
    }
  }

  /**
   * Prédit la charge de travail future
   */
  async predictWorkload(deckId: string, daysAhead: number = 30): Promise<Array<{
    date: Date
    newCards: number
    reviewCards: number
    estimatedTime: number
  }>> {
    const allCards = await this.storageAdapter.loadCardsByDeck(deckId)
    const deckSettings = await this.storageAdapter.loadDeckSettings(deckId) || DEFAULT_DECK_SETTINGS
    
    const predictions = []
    const today = new Date()
    
    for (let day = 0; day < daysAhead; day++) {
      const targetDate = new Date(today.getTime() + day * 24 * 60 * 60 * 1000)
      
      // Cartes dues ce jour-là
      const cardsThisDay = allCards.filter(card => {
        const cardDate = new Date(card.due.getFullYear(), card.due.getMonth(), card.due.getDate())
        const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
        return cardDate.getTime() === targetDateOnly.getTime() && !card.suspended && !card.buried
      })

      const newCards = Math.min(
        cardsThisDay.filter(card => card.state === State.New).length,
        deckSettings.newCardsPerDay
      )
      
      const reviewCards = Math.min(
        cardsThisDay.filter(card => card.state !== State.New).length,
        deckSettings.maxReviewsPerDay
      )

      const estimatedTime = Math.ceil((newCards + reviewCards) * 30 / 60) // 30 sec par carte

      predictions.push({
        date: targetDate,
        newCards,
        reviewCards,
        estimatedTime
      })
    }

    return predictions
  }

  // ==================== STATISTIQUES ====================

  /**
   * Calcule les statistiques d'un deck
   */
  async calculateDeckStats(deckId: string): Promise<DeckStats> {
    const allCards = await this.storageAdapter.loadCardsByDeck(deckId)
    const now = new Date()

    // Compteurs de base
    const totalCards = allCards.length
    const newCards = allCards.filter(card => card.state === State.New).length
    const learningCards = allCards.filter(card => 
      card.state === State.Learning || card.state === State.Relearning
    ).length
    const reviewCards = allCards.filter(card => card.state === State.Review).length
    const suspendedCards = allCards.filter(card => card.suspended).length

    // Cartes dues
    const dueCards = allCards.filter(card => isCardDue(card, now))
    const dueToday = dueCards.length
    const overdue = allCards.filter(card => {
      return card.due < now && !card.suspended && !card.buried
    }).length

    // Charge l'historique des révisions pour calculer les performances
    const allReviews = []
    for (const card of allCards) {
      const reviews = await this.storageAdapter.loadCardReviews(card.id)
      allReviews.push(...reviews)
    }

    // Calcul des performances
    const totalReviews = allReviews.length
    const successfulReviews = allReviews.filter(r => r.grade >= Grade.Good).length
    const averageRetention = totalReviews > 0 ? successfulReviews / totalReviews : 0

    const gradeSum = allReviews.reduce((sum, r) => sum + r.grade, 0)
    const averageGrade = totalReviews > 0 ? gradeSum / totalReviews : 0

    const timeSum = allReviews.reduce((sum, r) => sum + r.duration, 0)
    const averageResponseTime = totalReviews > 0 ? timeSum / totalReviews : 0

    // Prédictions simples (peut être amélioré)
    const forecastedReviews: Record<string, number> = {}
    const workloadDistribution: Record<string, number> = {}

    // Génère des prédictions pour les 7 prochains jours
    for (let day = 0; day < 7; day++) {
      const futureDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000)
      const dateKey = futureDate.toISOString().split('T')[0]
      
      const cardsDueThisDay = allCards.filter(card => {
        const cardDate = card.due.toISOString().split('T')[0]
        return cardDate === dateKey && !card.suspended && !card.buried
      }).length

      forecastedReviews[dateKey] = cardsDueThisDay
      workloadDistribution[dateKey] = Math.ceil(cardsDueThisDay * 30 / 60) // 30 sec par carte
    }

    return {
      deckId,
      totalCards,
      newCards,
      learningCards,
      reviewCards,
      suspendedCards,
      dueToday,
      overdue,
      averageRetention,
      averageGrade,
      averageResponseTime,
      forecastedReviews,
      workloadDistribution
    }
  }

  // ==================== GESTION DES CARTES ====================

  /**
   * Suspend une carte
   */
  async suspendCard(cardId: string): Promise<void> {
    const card = await this.storageAdapter.loadCard(cardId)
    if (!card) {
      throw new Error(`Card not found: ${cardId}`)
    }

    card.suspended = true
    card.updatedAt = new Date()
    await this.storageAdapter.saveCard(card)
  }

  /**
   * Réactive une carte suspendue
   */
  async unsuspendCard(cardId: string): Promise<void> {
    const card = await this.storageAdapter.loadCard(cardId)
    if (!card) {
      throw new Error(`Card not found: ${cardId}`)
    }

    card.suspended = false
    card.updatedAt = new Date()
    await this.storageAdapter.saveCard(card)
  }

  /**
   * Enterre une carte temporairement
   */
  async buryCard(cardId: string): Promise<void> {
    const card = await this.storageAdapter.loadCard(cardId)
    if (!card) {
      throw new Error(`Card not found: ${cardId}`)
    }

    card.buried = true
    card.updatedAt = new Date()
    await this.storageAdapter.saveCard(card)
  }

  /**
   * Déterre toutes les cartes enterrées d'un deck
   */
  async unburyCards(deckId: string): Promise<number> {
    const { cards } = await this.storageAdapter.searchCards({
      filter: {
        deckIds: [deckId],
        buried: true
      }
    })

    for (const card of cards) {
      card.buried = false
      card.updatedAt = new Date()
    }

    await this.storageAdapter.saveCards(cards)
    return cards.length
  }

  /**
   * Remet à zéro l'apprentissage d'une carte
   */
  async resetCard(cardId: string): Promise<void> {
    const card = await this.storageAdapter.loadCard(cardId)
    if (!card) {
      throw new Error(`Card not found: ${cardId}`)
    }

    // Recrée une carte vierge avec FSRS
    const newFSRSCard = this.fsrsService.createNewCard()
    
    card.fsrsCard = newFSRSCard
    card.state = State.New
    card.due = new Date()
    card.lastReview = undefined as Date | undefined
    card.leechCount = 0
    card.updatedAt = new Date()

    await this.storageAdapter.saveCard(card)
  }

  // ==================== UTILITAIRES ====================

  /**
   * Met à jour les paramètres FSRS
   */
  updateFSRSParameters(settings: Partial<DeckSettings>): void {
    this.fsrsService.updateParameters(settings)
  }

  /**
   * Obtient les paramètres actuels de FSRS
   */
  getFSRSParameters() {
    return this.fsrsService.getParameters()
  }

  /**
   * Force la synchronisation de toutes les cartes avec les nouveaux paramètres
   */
  async recalculateAllCards(deckId: string): Promise<number> {
    const cards = await this.storageAdapter.loadCardsByDeck(deckId)
    const updatedCards = this.fsrsService.scheduleCards(cards)
    
    await this.storageAdapter.saveCards(updatedCards)
    return updatedCards.length
  }
}