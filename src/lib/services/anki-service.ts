import { supabase } from '@/lib/supabase'
import { 
  AnkiDeck, 
  AnkiDeckInsert, 
  AnkiDeckUpdate,
  AnkiCard,
  AnkiCardInsert,
  AnkiCardUpdate,
  AnkiReview,
  AnkiReviewInsert,
  AnkiTreeNode,
  SM2Result,
  ReviewResponse,
  DEFAULT_DECK_CONFIG,
  SM2_CONFIG
} from '@/types/anki'

export class AnkiService {
  // ==================== DECK MANAGEMENT ====================
  
  // Récupérer tous les decks avec structure hiérarchique
  static async getDecksTree(): Promise<AnkiTreeNode[]> {
    const { data: decks, error } = await supabase
      .from('anki_decks')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching decks:', error)
      throw error
    }

    // Calculer les stats pour chaque deck
    const decksWithStats = await Promise.all(
      decks.map(async (deck) => {
        const stats = await this.getDeckStats(deck.id)
        return {
          ...deck,
          cardCount: stats.totalCards,
          newCards: stats.newCards,
          dueCards: stats.dueCards,
          children: []
        }
      })
    )

    // Construire l'arbre hiérarchique
    return this.buildTree(decksWithStats)
  }

  // Construire l'arbre hiérarchique (similaire à aside-db.tsx)
  private static buildTree(decks: any[]): AnkiTreeNode[] {
    const deckMap = new Map<string, AnkiTreeNode>()
    const rootDecks: AnkiTreeNode[] = []

    // Créer les noeuds
    decks.forEach(deck => {
      deckMap.set(deck.id, { ...deck, children: [] })
    })

    // Construire la hiérarchie
    decks.forEach(deck => {
      const node = deckMap.get(deck.id)!
      if (deck.parent_id) {
        const parent = deckMap.get(deck.parent_id)
        if (parent) {
          parent.children.push(node)
        }
      } else {
        rootDecks.push(node)
      }
    })

    return rootDecks
  }

  // Créer un nouveau deck
  static async createDeck(deckData: AnkiDeckInsert): Promise<AnkiDeck> {
    const { data, error } = await supabase
      .from('anki_decks')
      .insert({
        ...DEFAULT_DECK_CONFIG,
        ...deckData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating deck:', error)
      throw error
    }

    return data
  }

  // Mettre à jour un deck
  static async updateDeck(deckId: string, updates: AnkiDeckUpdate): Promise<void> {
    const { error } = await supabase
      .from('anki_decks')
      .update(updates)
      .eq('id', deckId)

    if (error) {
      console.error('Error updating deck:', error)
      throw error
    }
  }

  // Supprimer un deck
  static async deleteDeck(deckId: string): Promise<void> {
    const { error } = await supabase
      .from('anki_decks')
      .delete()
      .eq('id', deckId)

    if (error) {
      console.error('Error deleting deck:', error)
      throw error
    }
  }

  // Déplacer un deck (drag & drop)
  static async moveDeck(deckId: string, newParentId: string | null): Promise<void> {
    const { error } = await supabase
      .from('anki_decks')
      .update({ parent_id: newParentId })
      .eq('id', deckId)

    if (error) {
      console.error('Error moving deck:', error)
      throw error
    }
  }

  // ==================== CARD MANAGEMENT ====================

  // Récupérer les cartes d'un deck
  static async getCards(deckId: string): Promise<AnkiCard[]> {
    const { data, error } = await supabase
      .from('anki_cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching cards:', error)
      throw error
    }

    return data
  }

  // Récupérer les cartes dues pour révision
  static async getDueCards(deckId?: string): Promise<AnkiCard[]> {
    let query = supabase
      .from('anki_cards')
      .select('*')
      .lte('due_date', new Date().toISOString())

    if (deckId) {
      query = query.eq('deck_id', deckId)
    }

    const { data, error } = await query.order('due_date')

    if (error) {
      console.error('Error fetching due cards:', error)
      throw error
    }

    return data
  }

  // Créer une nouvelle carte
  static async createCard(cardData: AnkiCardInsert): Promise<AnkiCard> {
    const { data, error } = await supabase
      .from('anki_cards')
      .insert(cardData)
      .select()
      .single()

    if (error) {
      console.error('Error creating card:', error)
      throw error
    }

    return data
  }

  // Mettre à jour une carte
  static async updateCard(cardId: string, updates: AnkiCardUpdate): Promise<void> {
    const { error } = await supabase
      .from('anki_cards')
      .update(updates)
      .eq('id', cardId)

    if (error) {
      console.error('Error updating card:', error)
      throw error
    }
  }

  // Supprimer une carte
  static async deleteCard(cardId: string): Promise<void> {
    const { error } = await supabase
      .from('anki_cards')
      .delete()
      .eq('id', cardId)

    if (error) {
      console.error('Error deleting card:', error)
      throw error
    }
  }

  // ==================== ALGORITHME SM-2 ====================

  // Calculer la prochaine révision avec SM-2
  static calculateSM2(card: AnkiCard, quality: number): SM2Result {
    let { ease_factor, interval_days } = card
    const reviewCount = card.review_count

    // Si quality < 3, recommencer l'apprentissage
    if (quality < 3) {
      interval_days = 1
    } else {
      // Calculer le nouvel intervalle
      if (reviewCount === 0) {
        interval_days = 1
      } else if (reviewCount === 1) {
        interval_days = 6
      } else {
        interval_days = Math.round(interval_days * ease_factor)
      }
    }

    // Ajuster l'ease factor
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    ease_factor = Math.max(ease_factor, SM2_CONFIG.minEaseFactor)

    // Calculer la prochaine date de révision
    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + interval_days)

    return {
      easeFactor: ease_factor,
      interval: interval_days,
      nextReviewDate
    }
  }

  // Réviser une carte
  static async reviewCard(cardId: string, response: ReviewResponse): Promise<void> {
    // Récupérer la carte actuelle
    const { data: card, error: fetchError } = await supabase
      .from('anki_cards')
      .select('*')
      .eq('id', cardId)
      .single()

    if (fetchError || !card) {
      console.error('Error fetching card for review:', fetchError)
      throw fetchError
    }

    // Calculer les nouvelles valeurs avec SM-2
    const sm2Result = this.calculateSM2(card, response.quality)

    // Mettre à jour la carte
    const cardUpdates: AnkiCardUpdate = {
      ease_factor: sm2Result.easeFactor,
      interval_days: sm2Result.interval,
      due_date: sm2Result.nextReviewDate.toISOString(),
      review_count: card.review_count + 1,
      last_reviewed: new Date().toISOString(),
      card_state: response.quality >= 3 ? 'review' : 'relearning'
    }

    if (response.quality < 3) {
      cardUpdates.lapse_count = card.lapse_count + 1
    }

    const { error: updateError } = await supabase
      .from('anki_cards')
      .update(cardUpdates)
      .eq('id', cardId)

    if (updateError) {
      console.error('Error updating card:', updateError)
      throw updateError
    }

    // Enregistrer la révision dans l'historique
    const reviewData: AnkiReviewInsert = {
      card_id: cardId,
      quality: response.quality,
      response_time_ms: response.responseTime,
      ease_before: card.ease_factor,
      ease_after: sm2Result.easeFactor,
      interval_before: card.interval_days,
      interval_after: sm2Result.interval
    }

    const { error: reviewError } = await supabase
      .from('anki_reviews')
      .insert(reviewData)

    if (reviewError) {
      console.error('Error recording review:', reviewError)
      throw reviewError
    }
  }

  // ==================== STATISTIQUES ====================

  // Statistiques d'un deck
  static async getDeckStats(deckId: string) {
    const { data: cards, error } = await supabase
      .from('anki_cards')
      .select('card_state, due_date')
      .eq('deck_id', deckId)

    if (error) {
      console.error('Error fetching deck stats:', error)
      throw error
    }

    const now = new Date()
    const stats = {
      totalCards: cards.length,
      newCards: cards.filter(c => c.card_state === 'new').length,
      learningCards: cards.filter(c => c.card_state === 'learning').length,
      reviewCards: cards.filter(c => c.card_state === 'review').length,
      dueCards: cards.filter(c => new Date(c.due_date) <= now).length
    }

    return stats
  }

  // Récupérer les données pour la heatmap
  static async getHeatmapData(startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from('anki_reviews')
      .select('reviewed_at')
      .gte('reviewed_at', startDate.toISOString())
      .lte('reviewed_at', endDate.toISOString())

    if (error) {
      console.error('Error fetching heatmap data:', error)
      throw error
    }

    // Grouper par jour
    const dailyCounts = new Map<string, number>()
    
    data.forEach(review => {
      const date = new Date(review.reviewed_at).toISOString().split('T')[0]
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1)
    })

    return Array.from(dailyCounts.entries()).map(([date, count]) => ({
      date,
      count,
      level: Math.min(Math.floor(count / 5), 4) as 0 | 1 | 2 | 3 | 4
    }))
  }

  // Récupérer la courbe d'apprentissage
  static async getLearningCurve(deckId: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('anki_reviews')
      .select(`
        reviewed_at,
        quality,
        ease_after,
        card_id,
        anki_cards!inner(deck_id)
      `)
      .eq('anki_cards.deck_id', deckId)
      .gte('reviewed_at', startDate.toISOString())
      .order('reviewed_at')

    if (error) {
      console.error('Error fetching learning curve:', error)
      throw error
    }

    // Grouper par jour et calculer les métriques
    const dailyStats = new Map()
    
    data.forEach(review => {
      const date = new Date(review.reviewed_at).toISOString().split('T')[0]
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { total: 0, correct: 0, easeSum: 0, count: 0 })
      }
      
      const stats = dailyStats.get(date)
      stats.total++
      if (review.quality >= 3) stats.correct++
      stats.easeSum += review.ease_after
      stats.count++
    })

    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      retention: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      averageEase: stats.count > 0 ? stats.easeSum / stats.count : 2.5,
      cardsReviewed: stats.total
    }))
  }
}