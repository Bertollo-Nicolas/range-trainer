/**
 * Adaptateur de stockage pour la persistance des données Anki avec Supabase
 */

import { supabase } from '@/lib/supabase'
import { State, Rating as Grade } from 'ts-fsrs'
import { 
  FSRSCard, 
  CardReview, 
  StudySession, 
  DeckSettings, 
  SearchOptions,
  ImportResult,
  CardImport
} from './card-model'

// ==================== TYPES POUR LA BASE DE DONNÉES ====================

interface DBCard {
  id: string
  deck_id: string
  front: string
  back: string
  tags: string[]
  
  // État FSRS
  state: number // State enum as number
  difficulty: number
  stability: number
  due: string // ISO date
  last_review: string | null // ISO date
  
  // Métadonnées
  suspended: boolean
  buried: boolean
  leech_count: number
  created_at: string
  updated_at: string
  
  // Paramètres optionnels de scheduling
  scheduling_params?: Record<string, any> | undefined
}

interface DBReview {
  id: string
  card_id: string
  session_id: string | null
  
  grade: number // Grade enum as number
  duration: number
  timestamp: string
  
  // États avant/après
  state_before: number
  due_before: string
  state_after: number
  due_after: string
  
  // Log FSRS sérialisé
  fsrs_log: Record<string, any>
}

interface DBSession {
  id: string
  deck_id: string | null
  start_time: string
  end_time: string | null
  
  cards_reviewed: number
  new_cards: number
  review_cards: number
  
  total_duration: number
  average_duration: number
  
  again_count: number
  hard_count: number
  good_count: number
  easy_count: number
}

interface DBDeckSettings {
  deck_id: string
  settings: DeckSettings
  updated_at: string
}

export class StorageAdapter {
  
  private checkSupabase() {
    if (!supabase) {
      throw new Error('Supabase client not available. Check environment variables.')
    }
    return supabase
  }
  
  // ==================== CARTES ====================

  /**
   * Sauvegarde une carte en base de données
   */
  async saveCard(card: FSRSCard): Promise<void> {
    const client = this.checkSupabase()
    const dbCard: Omit<DBCard, 'created_at'> = {
      id: card.id,
      deck_id: card.deckId,
      front: card.front,
      back: card.back,
      tags: card.tags,
      state: card.state,
      difficulty: card.fsrsCard.difficulty,
      stability: card.fsrsCard.stability,
      due: card.due.toISOString(),
      last_review: card.lastReview?.toISOString() || null,
      suspended: card.suspended,
      buried: card.buried,
      leech_count: card.leechCount,
      updated_at: card.updatedAt.toISOString(),
      scheduling_params: card.schedulingParams || undefined
    }

    const { error } = await client
      .from('anki_cards_v2')
      .upsert(dbCard)

    if (error) {
      console.error('Error saving card:', error)
      throw new Error(`Failed to save card: ${error.message}`)
    }
  }

  /**
   * Sauvegarde plusieurs cartes en lot
   */
  async saveCards(cards: FSRSCard[]): Promise<void> {
    const client = this.checkSupabase()
    if (cards.length === 0) return

    const dbCards = cards.map(card => ({
      id: card.id,
      deck_id: card.deckId,
      front: card.front,
      back: card.back,
      tags: card.tags,
      state: card.state,
      difficulty: card.fsrsCard.difficulty,
      stability: card.fsrsCard.stability,
      due: card.due.toISOString(),
      last_review: card.lastReview?.toISOString() || null,
      suspended: card.suspended,
      buried: card.buried,
      leech_count: card.leechCount,
      updated_at: card.updatedAt.toISOString(),
      scheduling_params: card.schedulingParams || undefined
    }))

    const { error } = await client
      .from('anki_cards_v2')
      .upsert(dbCards)

    if (error) {
      console.error('Error saving cards:', error)
      throw new Error(`Failed to save cards: ${error.message}`)
    }
  }

  /**
   * Charge une carte par ID
   */
  async loadCard(cardId: string): Promise<FSRSCard | null> {
    const client = this.checkSupabase()
    const { data, error } = await client
      .from('anki_cards_v2')
      .select('*')
      .eq('id', cardId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Carte non trouvée
      console.error('Error loading card:', error)
      throw new Error(`Failed to load card: ${error.message}`)
    }

    return this.dbCardToFSRSCard(data)
  }

  /**
   * Charge les cartes d'un deck
   */
  async loadCardsByDeck(deckId: string): Promise<FSRSCard[]> {
    const client = this.checkSupabase()
    const { data, error } = await client
      .from('anki_cards_v2')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at')

    if (error) {
      console.error('Error loading cards by deck:', error)
      throw new Error(`Failed to load cards: ${error.message}`)
    }

    return data.map(card => this.dbCardToFSRSCard(card))
  }

  /**
   * Charge les cartes dues
   */
  async loadDueCards(deckId?: string, limit?: number): Promise<FSRSCard[]> {
    const client = this.checkSupabase()
    const now = new Date().toISOString()
    
    let query = client
      .from('anki_cards_v2')
      .select('*')
      .lte('due', now)
      .eq('suspended', false)
      .eq('buried', false)
      .order('due')

    if (deckId) {
      query = query.eq('deck_id', deckId)
    }

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading due cards:', error)
      throw new Error(`Failed to load due cards: ${error.message}`)
    }

    return data.map(card => this.dbCardToFSRSCard(card))
  }

  /**
   * Recherche de cartes avec filtres
   */
  async searchCards(options: SearchOptions): Promise<{ cards: FSRSCard[]; total: number }> {
    const client = this.checkSupabase()
    let query = client.from('anki_cards_v2').select('*', { count: 'exact' })

    // Application des filtres
    if (options.filter) {
      const filter = options.filter

      if (filter.deckIds && filter.deckIds.length > 0) {
        query = query.in('deck_id', filter.deckIds)
      }

      if (filter.states && filter.states.length > 0) {
        query = query.in('state', filter.states)
      }

      if (filter.dueBefore) {
        query = query.lte('due', filter.dueBefore.toISOString())
      }

      if (filter.dueAfter) {
        query = query.gte('due', filter.dueAfter.toISOString())
      }

      if (filter.suspended !== undefined) {
        query = query.eq('suspended', filter.suspended)
      }

      if (filter.buried !== undefined) {
        query = query.eq('buried', filter.buried)
      }

      if (filter.isLeech !== undefined) {
        if (filter.isLeech) {
          query = query.gte('leech_count', 8) // Seuil par défaut pour les leeches
        } else {
          query = query.lt('leech_count', 8)
        }
      }
    }

    // Recherche textuelle
    if (options.query) {
      // Note: Nécessite une configuration de recherche full-text dans Supabase
      query = query.or(`front.ilike.%${options.query}%,back.ilike.%${options.query}%`)
    }

    // Tri
    if (options.sortBy) {
      const order = options.sortOrder || 'asc'
      switch (options.sortBy) {
        case 'due':
          query = query.order('due', { ascending: order === 'asc' })
          break
        case 'created':
          query = query.order('created_at', { ascending: order === 'asc' })
          break
        case 'difficulty':
          query = query.order('difficulty', { ascending: order === 'asc' })
          break
        case 'stability':
          query = query.order('stability', { ascending: order === 'asc' })
          break
      }
    }

    // Pagination
    if (options.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1)
    } else if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error searching cards:', error)
      throw new Error(`Failed to search cards: ${error.message}`)
    }

    return {
      cards: data.map(card => this.dbCardToFSRSCard(card)),
      total: count || 0
    }
  }

  /**
   * Supprime une carte
   */
  async deleteCard(cardId: string): Promise<void> {
    const client = this.checkSupabase()
    const { error } = await client
      .from('anki_cards_v2')
      .delete()
      .eq('id', cardId)

    if (error) {
      console.error('Error deleting card:', error)
      throw new Error(`Failed to delete card: ${error.message}`)
    }
  }

  // ==================== RÉVISIONS ====================

  /**
   * Sauvegarde une révision
   */
  async saveReview(review: CardReview): Promise<void> {
    const client = this.checkSupabase()
    const dbReview: DBReview = {
      id: review.id,
      card_id: review.cardId,
      session_id: review.sessionId || null,
      grade: review.grade,
      duration: review.duration,
      timestamp: review.timestamp.toISOString(),
      state_before: review.stateBefore,
      due_before: review.dueBefore.toISOString(),
      state_after: review.stateAfter,
      due_after: review.dueAfter.toISOString(),
      fsrs_log: review.fsrsLog as any
    }

    const { error } = await client
      .from('anki_reviews_v2')
      .insert(dbReview)

    if (error) {
      console.error('Error saving review:', error)
      throw new Error(`Failed to save review: ${error.message}`)
    }
  }

  /**
   * Charge l'historique des révisions d'une carte
   */
  async loadCardReviews(cardId: string): Promise<CardReview[]> {
    const client = this.checkSupabase()
    const { data, error } = await client
      .from('anki_reviews_v2')
      .select('*')
      .eq('card_id', cardId)
      .order('timestamp')

    if (error) {
      console.error('Error loading card reviews:', error)
      throw new Error(`Failed to load reviews: ${error.message}`)
    }

    return data.map(review => this.dbReviewToCardReview(review))
  }

  // ==================== SESSIONS D'ÉTUDE ====================

  /**
   * Crée une nouvelle session d'étude
   */
  async createSession(deckId?: string): Promise<StudySession> {
    const client = this.checkSupabase()
    const session: StudySession = {
      id: crypto.randomUUID(),
      deckId,
      startTime: new Date(),
      endTime: undefined,
      cardsReviewed: 0,
      newCards: 0,
      reviewCards: 0,
      totalDuration: 0,
      averageDuration: 0,
      againCount: 0,
      hardCount: 0,
      goodCount: 0,
      easyCount: 0
    }

    const dbSession: Omit<DBSession, 'end_time'> = {
      id: session.id,
      deck_id: session.deckId || null,
      start_time: session.startTime.toISOString(),
      cards_reviewed: 0,
      new_cards: 0,
      review_cards: 0,
      total_duration: 0,
      average_duration: 0,
      again_count: 0,
      hard_count: 0,
      good_count: 0,
      easy_count: 0
    }

    const { error } = await client
      .from('anki_study_sessions_v2')
      .insert(dbSession)

    if (error) {
      console.error('Error creating session:', error)
      throw new Error(`Failed to create session: ${error.message}`)
    }

    return session
  }

  /**
   * Met à jour une session d'étude
   */
  async updateSession(session: StudySession): Promise<void> {
    const client = this.checkSupabase()
    const dbSession: DBSession = {
      id: session.id,
      deck_id: session.deckId || null,
      start_time: session.startTime.toISOString(),
      end_time: session.endTime?.toISOString() || null,
      cards_reviewed: session.cardsReviewed,
      new_cards: session.newCards,
      review_cards: session.reviewCards,
      total_duration: session.totalDuration,
      average_duration: session.averageDuration,
      again_count: session.againCount,
      hard_count: session.hardCount,
      good_count: session.goodCount,
      easy_count: session.easyCount
    }

    const { error } = await client
      .from('anki_study_sessions_v2')
      .update(dbSession)
      .eq('id', session.id)

    if (error) {
      console.error('Error updating session:', error)
      throw new Error(`Failed to update session: ${error.message}`)
    }
  }

  // ==================== CONFIGURATION DES DECKS ====================

  /**
   * Sauvegarde les paramètres d'un deck
   */
  async saveDeckSettings(deckId: string, settings: DeckSettings): Promise<void> {
    const client = this.checkSupabase()
    const dbSettings: DBDeckSettings = {
      deck_id: deckId,
      settings,
      updated_at: new Date().toISOString()
    }

    const { error } = await client
      .from('anki_deck_settings_v2')
      .upsert(dbSettings)

    if (error) {
      console.error('Error saving deck settings:', error)
      throw new Error(`Failed to save deck settings: ${error.message}`)
    }
  }

  /**
   * Charge les paramètres d'un deck
   */
  async loadDeckSettings(deckId: string): Promise<DeckSettings | null> {
    const client = this.checkSupabase()
    const { data, error } = await client
      .from('anki_deck_settings_v2')
      .select('settings')
      .eq('deck_id', deckId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Pas de paramètres trouvés
      console.error('Error loading deck settings:', error)
      throw new Error(`Failed to load deck settings: ${error.message}`)
    }

    return data.settings
  }

  // ==================== IMPORT/EXPORT ====================

  /**
   * Importe des cartes en lot
   */
  async importCards(cards: CardImport[], defaultDeckId: string): Promise<ImportResult> {
    const client = this.checkSupabase()
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      createdDecks: []
    }

    // Traitement par lots pour éviter les timeouts
    const batchSize = 100
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize)
      
      for (let j = 0; j < batch.length; j++) {
        try {
          const cardImport = batch[j]
          const cardId = crypto.randomUUID()
          
          // Utilise le deck spécifié ou le deck par défaut
          const deckId = cardImport.deckName ? 
            await this.getOrCreateDeck(cardImport.deckName, result.createdDecks) : 
            defaultDeckId

          const dbCard: Omit<DBCard, 'created_at'> = {
            id: cardId,
            deck_id: deckId,
            front: cardImport.front,
            back: cardImport.back,
            tags: cardImport.tags || [],
            state: State.New,
            difficulty: 0,
            stability: 0,
            due: new Date().toISOString(),
            last_review: null,
            suspended: false,
            buried: false,
            leech_count: 0,
            updated_at: new Date().toISOString()
          }

          const { error } = await client
            .from('anki_cards_v2')
            .insert(dbCard)

          if (error) throw error

          result.success++
        } catch (error) {
          result.failed++
          result.errors.push({
            index: i + j,
            error: error instanceof Error ? error.message : 'Unknown error',
            card: batch[j]
          })
        }
      }
    }

    return result
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Convertit une carte DB en FSRSCard
   */
  private dbCardToFSRSCard(dbCard: DBCard): FSRSCard {
    return {
      id: dbCard.id,
      deckId: dbCard.deck_id,
      front: dbCard.front,
      back: dbCard.back,
      tags: dbCard.tags,
      createdAt: new Date(dbCard.created_at),
      updatedAt: new Date(dbCard.updated_at),
      fsrsCard: {
        due: new Date(dbCard.due),
        stability: dbCard.stability,
        difficulty: dbCard.difficulty,
        elapsed_days: 0, // Sera calculé si nécessaire
        scheduled_days: 0, // Sera calculé si nécessaire
        reps: 0, // Sera calculé à partir des révisions
        lapses: dbCard.leech_count,
        state: dbCard.state as State,
        last_review: dbCard.last_review ? new Date(dbCard.last_review) : new Date(0),
        learning_steps: 1 // Default learning step
      },
      state: dbCard.state as State,
      due: new Date(dbCard.due),
      lastReview: dbCard.last_review ? new Date(dbCard.last_review) : undefined,
      suspended: dbCard.suspended,
      buried: dbCard.buried,
      leechCount: dbCard.leech_count,
      schedulingParams: dbCard.scheduling_params || undefined
    }
  }

  /**
   * Convertit une révision DB en CardReview
   */
  private dbReviewToCardReview(dbReview: DBReview): CardReview {
    return {
      id: dbReview.id,
      cardId: dbReview.card_id,
      sessionId: dbReview.session_id || undefined,
      grade: dbReview.grade as Grade,
      duration: dbReview.duration,
      timestamp: new Date(dbReview.timestamp),
      stateBefore: dbReview.state_before as State,
      dueBefore: new Date(dbReview.due_before),
      stateAfter: dbReview.state_after as State,
      dueAfter: new Date(dbReview.due_after),
      fsrsLog: dbReview.fsrs_log as any
    }
  }

  /**
   * Obtient ou crée un deck par nom
   */
  private async getOrCreateDeck(deckName: string, createdDecks: string[]): Promise<string> {
    const client = this.checkSupabase()
    // Vérifie si le deck existe déjà
    const { data: existingDeck } = await client
      .from('anki_decks')
      .select('id')
      .eq('name', deckName)
      .single()

    if (existingDeck) {
      return existingDeck.id
    }

    // Crée un nouveau deck
    const deckId = crypto.randomUUID()
    const { error } = await client
      .from('anki_decks')
      .insert({
        id: deckId,
        name: deckName,
        description: `Auto-created deck for import: ${deckName}`,
        color: '#3B82F6',
        icon: '📚'
      })

    if (error) {
      throw new Error(`Failed to create deck "${deckName}": ${error.message}`)
    }

    createdDecks.push(deckName)
    return deckId
  }
}