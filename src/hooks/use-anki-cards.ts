import { useState, useEffect, useCallback } from 'react'
import { AnkiService } from '@/lib/services/anki-service'
import { AnkiCard, AnkiCardInsert, AnkiCardUpdate, ReviewResponse } from '@/types/anki'

interface UseAnkiCardsReturn {
  cards: AnkiCard[]
  dueCards: AnkiCard[]
  loading: boolean
  error: string | null
  actions: {
    loadCards: (deckId: string) => Promise<void>
    loadDueCards: (deckId?: string) => Promise<void>
    createCard: (cardData: AnkiCardInsert) => Promise<AnkiCard>
    updateCard: (cardId: string, updates: AnkiCardUpdate) => Promise<void>
    deleteCard: (cardId: string) => Promise<void>
    reviewCard: (cardId: string, response: ReviewResponse) => Promise<void>
  }
}

export function useAnkiCards(): UseAnkiCardsReturn {
  const [cards, setCards] = useState<AnkiCard[]>([])
  const [dueCards, setDueCards] = useState<AnkiCard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger les cartes d'un deck
  const loadCards = useCallback(async (deckId: string) => {
    try {
      setLoading(true)
      setError(null)
      const deckCards = await AnkiService.getCards(deckId)
      setCards(deckCards)
    } catch (err) {
      console.error('Error loading cards:', err)
      setError(err instanceof Error ? err.message : 'Failed to load cards')
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger les cartes dues
  const loadDueCards = useCallback(async (deckId?: string) => {
    try {
      setLoading(true)
      setError(null)
      const due = await AnkiService.getDueCards(deckId)
      setDueCards(due)
    } catch (err) {
      console.error('Error loading due cards:', err)
      setError(err instanceof Error ? err.message : 'Failed to load due cards')
    } finally {
      setLoading(false)
    }
  }, [])

  // Créer une carte
  const createCard = useCallback(async (cardData: AnkiCardInsert): Promise<AnkiCard> => {
    try {
      setError(null)
      const newCard = await AnkiService.createCard(cardData)
      setCards(prev => [newCard, ...prev])
      return newCard
    } catch (err) {
      console.error('Error creating card:', err)
      setError(err instanceof Error ? err.message : 'Failed to create card')
      throw err
    }
  }, [])

  // Mettre à jour une carte
  const updateCard = useCallback(async (cardId: string, updates: AnkiCardUpdate): Promise<void> => {
    try {
      setError(null)
      await AnkiService.updateCard(cardId, updates)
      setCards(prev => prev.map(card => 
        card.id === cardId ? { ...card, ...updates } : card
      ))
      setDueCards(prev => prev.map(card => 
        card.id === cardId ? { ...card, ...updates } : card
      ))
    } catch (err) {
      console.error('Error updating card:', err)
      setError(err instanceof Error ? err.message : 'Failed to update card')
      throw err
    }
  }, [])

  // Supprimer une carte
  const deleteCard = useCallback(async (cardId: string): Promise<void> => {
    try {
      setError(null)
      await AnkiService.deleteCard(cardId)
      setCards(prev => prev.filter(card => card.id !== cardId))
      setDueCards(prev => prev.filter(card => card.id !== cardId))
    } catch (err) {
      console.error('Error deleting card:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete card')
      throw err
    }
  }, [])

  // Réviser une carte
  const reviewCard = useCallback(async (cardId: string, response: ReviewResponse): Promise<void> => {
    try {
      setError(null)
      await AnkiService.reviewCard(cardId, response)
      
      // Mettre à jour localement - la carte ne sera plus due
      setDueCards(prev => prev.filter(card => card.id !== cardId))
      
      // Recharger les cartes pour avoir les dernières données
      const updatedCard = cards.find(c => c.id === cardId)
      if (updatedCard) {
        await loadCards(updatedCard.deck_id)
      }
    } catch (err) {
      console.error('Error reviewing card:', err)
      setError(err instanceof Error ? err.message : 'Failed to review card')
      throw err
    }
  }, [cards, loadCards])

  return {
    cards,
    dueCards,
    loading,
    error,
    actions: {
      loadCards,
      loadDueCards,
      createCard,
      updateCard,
      deleteCard,
      reviewCard
    }
  }
}