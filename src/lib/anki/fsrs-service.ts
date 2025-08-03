/**
 * Service wrapper autour de ts-fsrs pour gérer le scheduling et les révisions
 */

import { 
  FSRS, 
  Card, 
  ReviewLog, 
  State, 
  Rating as Grade, 
  FSRSParameters,
  createEmptyCard,
  generatorParameters
} from 'ts-fsrs'

import { 
  FSRSCard, 
  CardReview, 
  DeckSettings, 
  DEFAULT_DECK_SETTINGS,
  CardStats
} from './card-model'

export class FSRSService {
  private fsrs: FSRS
  private parameters: FSRSParameters

  constructor(settings?: Partial<DeckSettings>) {
    const config = { ...DEFAULT_DECK_SETTINGS, ...settings }
    
    // Configuration des paramètres FSRS
    this.parameters = generatorParameters({
      request_retention: config.requestRetention,
      maximum_interval: config.maximumInterval,
      enable_fuzz: true, // Ajoute une variance aux intervalles
      enable_short_term: true // Support pour les cartes à court terme
    })
    
    this.fsrs = new FSRS(this.parameters)
  }

  // ==================== CRÉATION ET INITIALISATION ====================

  /**
   * Crée une nouvelle carte FSRS
   */
  createNewCard(): Card {
    return createEmptyCard()
  }

  /**
   * Initialise une FSRSCard complète avec métadonnées
   */
  initializeCard(cardData: {
    id: string
    deckId: string
    front: string
    back: string
    tags?: string[]
  }): FSRSCard {
    const now = new Date()
    const fsrsCard = this.createNewCard()

    return {
      id: cardData.id,
      deckId: cardData.deckId,
      front: cardData.front,
      back: cardData.back,
      tags: cardData.tags || [],
      createdAt: now,
      updatedAt: now,
      fsrsCard,
      state: State.New,
      due: now, // Les nouvelles cartes sont dues immédiatement
      lastReview: undefined,
      suspended: false,
      buried: false,
      leechCount: 0
    }
  }

  // ==================== RÉVISIONS ====================

  /**
   * Traite une révision et retourne la carte mise à jour
   */
  processReview(
    card: FSRSCard, 
    grade: Grade, 
    reviewTime: Date = new Date(),
    duration: number = 0
  ): { updatedCard: FSRSCard; reviewLog: ReviewLog } {
    // Note: duration parameter available for future logging use
    void duration; // Suppress unused parameter warning
    
    // Note: État avant révision disponible si nécessaire pour logging
    void card.state; // stateBefore
    void card.due;   // dueBefore

    // Calcul de la prochaine révision avec FSRS
    const scheduling = this.fsrs.repeat(card.fsrsCard, reviewTime)
    // Access scheduling result by grade with proper typing
    const scheduleInfo = (scheduling as any)[grade]

    // Carte mise à jour
    const updatedCard: FSRSCard = {
      ...card,
      fsrsCard: scheduleInfo.card,
      state: scheduleInfo.card.state,
      due: scheduleInfo.card.due,
      lastReview: reviewTime,
      updatedAt: reviewTime,
      // Gestion des leeches
      leechCount: grade === Grade.Again ? card.leechCount + 1 : card.leechCount
    }

    // Log de révision
    const reviewLog: ReviewLog = scheduleInfo.log

    return { updatedCard, reviewLog }
  }

  /**
   * Planifie les prochaines révisions pour plusieurs cartes
   */
  scheduleCards(cards: FSRSCard[], currentTime: Date = new Date()): FSRSCard[] {
    return cards.map(card => {
      if (card.suspended || card.buried) {
        return card
      }

      // Si la carte n'a jamais été révisée et est nouvelle
      if (card.state === State.New && !card.lastReview) {
        return card // Les nouvelles cartes restent dues immédiatement
      }

      // Utilise FSRS pour calculer la prochaine date de révision
      const scheduling = this.fsrs.repeat(card.fsrsCard, currentTime)
      
      // Prend le scheduling "Good" comme référence pour les cartes non révisées
      const goodSchedule = (scheduling as any)[Grade.Good]
      
      return {
        ...card,
        due: goodSchedule.card.due,
        updatedAt: currentTime
      }
    })
  }

  // ==================== STATISTIQUES ET MÉTRIQUES ====================

  /**
   * Calcule les statistiques détaillées d'une carte
   */
  calculateCardStats(card: FSRSCard, reviews: CardReview[]): CardStats {
    const totalReviews = reviews.length
    const lapseCount = reviews.filter(r => r.grade === Grade.Again).length
    
    // Calcul de la performance
    const averageGrade = totalReviews > 0 
      ? reviews.reduce((sum, r) => sum + r.grade, 0) / totalReviews 
      : 0
    
    const averageResponseTime = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.duration, 0) / totalReviews
      : 0

    // Calcul du taux de rétention (révisions réussies / total)
    const successfulReviews = reviews.filter(r => r.grade >= Grade.Good).length
    const retentionRate = totalReviews > 0 ? successfulReviews / totalReviews : 0

    // Détermination de la maturité
    const getMaturity = (): 'new' | 'young' | 'mature' => {
      if (card.state === State.New) return 'new'
      
      const intervalMs = card.due.getTime() - new Date().getTime()
      const intervalDays = intervalMs / (1000 * 60 * 60 * 24)
      
      return intervalDays >= 21 ? 'mature' : 'young'
    }

    // Calcul de l'intervalle actuel
    const currentInterval = card.lastReview 
      ? Math.floor((card.due.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    return {
      cardId: card.id,
      totalReviews,
      lapseCount,
      averageGrade,
      retentionRate,
      averageResponseTime,
      difficulty: card.fsrsCard.difficulty,
      stability: card.fsrsCard.stability,
      retrievability: this.calculateRetrievability(card),
      firstReview: reviews.length > 0 ? reviews[0].timestamp : undefined,
      lastReview: card.lastReview,
      nextReview: card.due,
      currentState: card.state,
      currentInterval,
      maturity: getMaturity()
    }
  }

  /**
   * Calcule la probabilité de récupération actuelle d'une carte
   */
  calculateRetrievability(card: FSRSCard, now: Date = new Date()): number {
    if (card.state === State.New) return 0
    
    const daysSinceReview = card.lastReview 
      ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
      : 0
    
    // Formule de récupération FSRS: R = exp(-daysSinceReview / stability)
    return Math.exp(-daysSinceReview / card.fsrsCard.stability)
  }

  /**
   * Prédit les performances futures d'une carte
   */
  predictPerformance(card: FSRSCard, daysAhead: number = 30): Array<{
    date: Date
    retrievability: number
    difficulty: number
    stability: number
  }> {
    const predictions = []
    const now = new Date()
    
    for (let day = 0; day <= daysAhead; day++) {
      const futureDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000)
      const retrievability = this.calculateRetrievability(card, futureDate)
      
      predictions.push({
        date: futureDate,
        retrievability,
        difficulty: card.fsrsCard.difficulty,
        stability: card.fsrsCard.stability
      })
    }
    
    return predictions
  }

  // ==================== OPTIMISATION DES PARAMÈTRES ====================

  /**
   * Optimise les paramètres FSRS basés sur l'historique des révisions
   */
  optimizeParameters(reviews: CardReview[]): FSRSParameters {
    // Cette fonction nécessiterait une implémentation plus complexe
    // utilisant les données historiques pour optimiser les paramètres FSRS
    // Pour l'instant, on retourne les paramètres par défaut
    void reviews; // Suppress unused parameter warning
    console.log('Parameter optimization not yet implemented, using default parameters')
    return this.parameters
  }

  /**
   * Analyse la qualité du scheduling actuel
   */
  analyzeSchedulingAccuracy(reviews: CardReview[]): {
    overallAccuracy: number
    gradeDistribution: Partial<Record<Grade, number>>
    retentionByInterval: Array<{ interval: number; retention: number }>
  } {
    const totalReviews = reviews.length
    if (totalReviews === 0) {
      return {
        overallAccuracy: 0,
        gradeDistribution: {
          [Grade.Again]: 0,
          [Grade.Hard]: 0,
          [Grade.Good]: 0,
          [Grade.Easy]: 0
        },
        retentionByInterval: []
      }
    }

    // Distribution des grades
    const gradeDistribution: Partial<Record<Grade, number>> = {
      [Grade.Again]: 0,
      [Grade.Hard]: 0,
      [Grade.Good]: 0,
      [Grade.Easy]: 0
    }

    reviews.forEach(review => {
      const currentCount = gradeDistribution[review.grade] || 0
      gradeDistribution[review.grade] = currentCount + 1
    })

    // Normalisation
    Object.keys(gradeDistribution).forEach(grade => {
      const gradeKey = grade as unknown as Grade
      const currentValue = gradeDistribution[gradeKey] || 0
      gradeDistribution[gradeKey] = currentValue / totalReviews
    })

    // Précision globale (% de révisions avec grade >= Good)
    const successfulReviews = reviews.filter(r => r.grade >= Grade.Good).length
    const overallAccuracy = successfulReviews / totalReviews

    // Rétention par intervalle (simplifié)
    const intervalGroups = new Map<number, { total: number; successful: number }>()
    
    reviews.forEach(review => {
      const intervalDays = Math.floor(
        (review.timestamp.getTime() - review.dueBefore.getTime()) / (1000 * 60 * 60 * 24)
      )
      const intervalBucket = Math.floor(intervalDays / 7) * 7 // Groupes par semaine
      
      if (!intervalGroups.has(intervalBucket)) {
        intervalGroups.set(intervalBucket, { total: 0, successful: 0 })
      }
      
      const group = intervalGroups.get(intervalBucket)!
      group.total++
      if (review.grade >= Grade.Good) {
        group.successful++
      }
    })

    const retentionByInterval = Array.from(intervalGroups.entries()).map(([interval, data]) => ({
      interval,
      retention: data.successful / data.total
    }))

    return {
      overallAccuracy,
      gradeDistribution,
      retentionByInterval
    }
  }

  // ==================== UTILITAIRES ====================

  /**
   * Réinitialise les paramètres FSRS
   */
  updateParameters(newSettings: Partial<DeckSettings>): void {
    const config = { ...DEFAULT_DECK_SETTINGS, ...newSettings }
    
    this.parameters = generatorParameters({
      request_retention: config.requestRetention,
      maximum_interval: config.maximumInterval,
      enable_fuzz: true,
      enable_short_term: true
    })
    
    this.fsrs = new FSRS(this.parameters)
  }

  /**
   * Obtient les paramètres actuels
   */
  getParameters(): FSRSParameters {
    return { ...this.parameters }
  }

  /**
   * Convertit un grade numérique en Grade FSRS
   */
  static gradeFromNumber(grade: number): Grade {
    switch (grade) {
      case 1: return Grade.Again
      case 2: return Grade.Hard
      case 3: return Grade.Good
      case 4: return Grade.Easy
      default: return Grade.Good
    }
  }

  /**
   * Convertit un Grade FSRS en nombre
   */
  static gradeToNumber(grade: Grade): number {
    switch (grade) {
      case Grade.Again: return 1
      case Grade.Hard: return 2
      case Grade.Good: return 3
      case Grade.Easy: return 4
      default: return 3
    }
  }
}