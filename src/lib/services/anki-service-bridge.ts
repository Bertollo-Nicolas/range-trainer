/**
 * Temporary bridge service to connect old Anki components with new FSRS system
 * This provides minimal compatibility while FSRS system is being completed
 */

import { supabase } from '@/lib/supabase'

export class AnkiServiceBridge {
  private static checkSupabase() {
    if (!supabase) {
      throw new Error('Supabase not available')
    }
    return supabase
  }

  // Get deck stats using new v2 tables
  static async getDeckStats(deckId: string) {
    try {
      const client = this.checkSupabase()
      
      const { data: cards, error } = await client
        .from('anki_cards_v2')
        .select('state, due, suspended, buried')
        .eq('deck_id', deckId)

      if (error) {
        console.error('Error fetching deck stats:', error)
        return {
          totalCards: 0,
          newCards: 0,
          learningCards: 0,
          reviewCards: 0,
          dueCards: 0
        }
      }

      const now = new Date()
      const activeCards = cards.filter((c: any) => !c.suspended && !c.buried)
      
      return {
        totalCards: activeCards.length,
        newCards: activeCards.filter((c: any) => c.state === 0).length,
        learningCards: activeCards.filter((c: any) => c.state === 1 || c.state === 3).length,
        reviewCards: activeCards.filter((c: any) => c.state === 2).length,
        dueCards: activeCards.filter((c: any) => new Date(c.due) <= now).length
      }
    } catch (error) {
      console.error('Error in getDeckStats:', error)
      return {
        totalCards: 0,
        newCards: 0,
        learningCards: 0,
        reviewCards: 0,
        dueCards: 0
      }
    }
  }

  // Get all decks with basic stats
  static async getDecks() {
    try {
      const client = this.checkSupabase()
      
      const { data: decks, error } = await client
        .from('anki_decks')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching decks:', error)
        return []
      }

      // Get stats for each deck
      const decksWithStats = await Promise.all(
        decks.map(async (deck: any) => {
          const stats = await this.getDeckStats(deck.id)
          return {
            ...deck,
            cardCount: stats.totalCards,
            newCards: stats.newCards,
            dueCards: stats.dueCards
          }
        })
      )

      return decksWithStats
    } catch (error) {
      console.error('Error in getDecks:', error)
      return []
    }
  }

  // Placeholder methods for compatibility
  static async getCards(deckId: string) {
    try {
      const client = this.checkSupabase()
      const { data: cards, error } = await client
        .from('anki_cards_v2')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching cards:', error)
        return []
      }

      return cards.map((card: any) => ({
        id: card.id,
        deck_id: card.deck_id,
        question: card.front,
        answer: card.back,
        tags: card.tags,
        card_state: card.state === 0 ? 'new' : card.state === 1 || card.state === 3 ? 'learning' : 'review',
        due_date: card.due,
        created_at: card.created_at,
        updated_at: card.updated_at
      }))
    } catch (error) {
      console.error('Error in getCards:', error)
      return []
    }
  }

  static async getDueCards(deckId?: string) {
    try {
      const client = this.checkSupabase()
      let query = client
        .from('anki_cards_v2')
        .select('*')
        .lte('due', new Date().toISOString())
        .eq('suspended', false)
        .eq('buried', false)

      if (deckId) {
        query = query.eq('deck_id', deckId)
      }

      const { data: cards, error } = await query
        .order('due', { ascending: true })
        .limit(50)

      if (error) {
        console.error('Error fetching due cards:', error)
        return []
      }

      return cards.map((card: any) => ({
        id: card.id,
        deck_id: card.deck_id,
        question: card.front,
        answer: card.back,
        tags: card.tags,
        card_state: card.state === 0 ? 'new' : card.state === 1 || card.state === 3 ? 'learning' : 'review',
        due_date: card.due,
        created_at: card.created_at,
        updated_at: card.updated_at
      }))
    } catch (error) {
      console.error('Error in getDueCards:', error)
      return []
    }
  }

  // Placeholder methods for other operations
  static async createCard(cardData: any) {
    console.log('createCard called with FSRS bridge - use new FSRS system instead')
    return { id: 'placeholder', ...cardData }
  }

  static async updateCard(cardId: string, updates: any) {
    void cardId; void updates; // Suppress unused parameter warnings
    console.log('updateCard called with FSRS bridge - use new FSRS system instead')
    return
  }

  static async deleteCard(cardId: string) {
    void cardId; // Suppress unused parameter warning
    console.log('deleteCard called with FSRS bridge - use new FSRS system instead')
    return
  }

  static async reviewCard(cardId: string, response: any) {
    void cardId; void response; // Suppress unused parameter warnings
    console.log('reviewCard called with FSRS bridge - use new FSRS system instead')
    return
  }

  // Tree structure for compatibility
  static async getDecksTree() {
    try {
      const decks = await this.getDecks()
      
      // Convert flat deck list to tree structure
      const deckMap = new Map()
      const rootDecks: any[] = []

      // Create deck nodes
      decks.forEach(deck => {
        deckMap.set(deck.id, {
          id: deck.id,
          name: deck.name,
          type: 'deck' as const,
          icon: deck.icon || '📚',
          color: deck.color || '#3B82F6',
          description: deck.description,
          cardCount: deck.cardCount || 0,
          newCards: deck.newCards || 0,
          dueCards: deck.dueCards || 0,
          children: []
        })
      })

      // Build tree structure
      decks.forEach(deck => {
        const node = deckMap.get(deck.id)
        if (deck.parent_id && deckMap.has(deck.parent_id)) {
          deckMap.get(deck.parent_id).children.push(node)
        } else {
          rootDecks.push(node)
        }
      })

      return rootDecks
    } catch (error) {
      console.error('Error in getDecksTree:', error)
      return []
    }
  }

  // Placeholder methods for statistics
  static async getHeatmapData(startDate: Date, endDate: Date) {
    void startDate; void endDate; // Suppress unused parameter warnings
    console.log('getHeatmapData called with FSRS bridge - returning empty data')
    return []
  }

  static async getLearningCurve(deckId: string, days: number) {
    void deckId; void days; // Suppress unused parameter warnings
    console.log('getLearningCurve called with FSRS bridge - returning empty data')
    return []
  }

  // Deck management methods
  static async createDeck(deckData: any) {
    try {
      const client = this.checkSupabase()
      const { data: deck, error } = await client
        .from('anki_decks')
        .insert([{
          name: deckData.name,
          parent_id: deckData.parent_id,
          color: deckData.color || '#3B82F6',
          icon: deckData.icon || '📚',
          description: deckData.description
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating deck:', error)
        throw error
      }

      return deck
    } catch (error) {
      console.error('Error in createDeck:', error)
      throw error
    }
  }

  static async updateDeck(deckId: string, updates: any) {
    try {
      const client = this.checkSupabase()
      const { data: deck, error } = await client
        .from('anki_decks')
        .update(updates)
        .eq('id', deckId)
        .select()
        .single()

      if (error) {
        console.error('Error updating deck:', error)
        throw error
      }

      return deck
    } catch (error) {
      console.error('Error in updateDeck:', error)
      throw error
    }
  }

  static async deleteDeck(deckId: string) {
    try {
      const client = this.checkSupabase()
      const { error } = await client
        .from('anki_decks')
        .delete()
        .eq('id', deckId)

      if (error) {
        console.error('Error deleting deck:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteDeck:', error)
      throw error
    }
  }

  static async moveDeck(deckId: string, newParentId: string | null) {
    try {
      const client = this.checkSupabase()
      const { error } = await client
        .from('anki_decks')
        .update({ parent_id: newParentId })
        .eq('id', deckId)

      if (error) {
        console.error('Error moving deck:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in moveDeck:', error)
      throw error
    }
  }
}