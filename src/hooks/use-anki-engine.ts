/**
 * Hook React pour utiliser le moteur Anki FSRS
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Grade } from '@/lib/anki'
import { 
  AnkiEngine, 
  createAnkiEngine,
  FSRSCard, 
  DueCard, 
  StudySession,
  DeckSettings,
  CardImport,
  ImportResult
} from '@/lib/anki'

interface UseAnkiEngineOptions {
  deckId?: string
  deckSettings?: Partial<DeckSettings>
  autoStart?: boolean // Démarre automatiquement le moteur
}

interface UseAnkiEngineReturn {
  // État du moteur
  engine: AnkiEngine | null
  loading: boolean
  error: string | null
  
  // Session actuelle
  currentSession: StudySession | null
  isStudying: boolean
  
  // Cartes
  dueCards: DueCard[]
  currentCard: DueCard | null
  currentCardIndex: number
  totalCards: number
  remainingCards: number
  
  // Actions principales
  actions: {
    // Gestion des sessions
    startSession: (deckId?: string) => Promise<StudySession>
    endSession: () => Promise<StudySession | null>
    
    // Révisions
    reviewCard: (grade: Grade, duration?: number) => Promise<void>
    skipCard: () => void
    resetCard: () => Promise<void>
    
    // Navigation
    nextCard: () => void
    previousCard: () => void
    goToCard: (index: number) => void
    
    // Gestion des cartes
    createCard: (cardData: {
      deckId: string
      front: string
      back: string
      tags?: string[]
    }) => Promise<FSRSCard>
    updateCard: (cardId: string, updates: {
      front?: string
      back?: string
      tags?: string[]
    }) => Promise<FSRSCard>
    deleteCard: (cardId: string) => Promise<void>
    
    // Actions avancées
    suspendCard: (cardId?: string) => Promise<void>
    unsuspendCard: (cardId: string) => Promise<void>
    buryCard: (cardId?: string) => Promise<void>
    unburyCards: (deckId: string) => Promise<number>
    
    // Import
    importCards: (cards: CardImport[], deckId: string) => Promise<ImportResult>
    
    // Rechargement
    refresh: () => Promise<void>
    loadDueCards: (deckId?: string, limit?: number) => Promise<void>
    getAllCards: (deckId: string) => Promise<FSRSCard[]>
  }
  
  // Statistiques de session
  sessionStats: {
    cardsReviewed: number
    newCards: number
    reviewCards: number
    accuracy: number
    averageTime: number
    gradeDistribution: Record<Grade, number>
  }
}

export function useAnkiEngine(options: UseAnkiEngineOptions = {}): UseAnkiEngineReturn {
  const { deckId, deckSettings, autoStart = false } = options
  
  // État principal
  const [engine, setEngine] = useState<AnkiEngine | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Session et cartes
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null)
  const [dueCards, setDueCards] = useState<DueCard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  
  // Refs pour éviter les re-renders inutiles
  const engineRef = useRef<AnkiEngine | null>(null)
  const sessionStatsRef = useRef({
    cardsReviewed: 0,
    newCards: 0,
    reviewCards: 0,
    gradeHistory: [] as Grade[]
  })

  // ==================== INITIALISATION ====================

  useEffect(() => {
    const initEngine = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const newEngine = createAnkiEngine(deckSettings)
        setEngine(newEngine)
        engineRef.current = newEngine
        
        if (autoStart && deckId) {
          await loadDueCards(deckId)
        }
      } catch (err) {
        console.error('Error initializing Anki engine:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize engine')
      } finally {
        setLoading(false)
      }
    }

    initEngine()
  }, [deckSettings, autoStart, deckId])

  // ==================== ACTIONS ====================

  // Chargement des cartes dues
  const loadDueCards = useCallback(async (targetDeckId?: string, limit?: number) => {
    if (!engineRef.current) return
    
    try {
      setLoading(true)
      setError(null)
      
      const cards = await engineRef.current.getDueCards(targetDeckId || deckId, limit)
      setDueCards(cards)
      setCurrentCardIndex(0)
    } catch (err) {
      console.error('Error loading due cards:', err)
      setError(err instanceof Error ? err.message : 'Failed to load cards')
    } finally {
      setLoading(false)
    }
  }, [deckId])

  // Démarrage de session
  const startSession = useCallback(async (targetDeckId?: string): Promise<StudySession> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized')
    }

    try {
      setError(null)
      const session = await engineRef.current.startStudySession(targetDeckId || deckId)
      setCurrentSession(session)
      
      // Réinitialise les stats
      sessionStatsRef.current = {
        cardsReviewed: 0,
        newCards: 0,
        reviewCards: 0,
        gradeHistory: []
      }
      
      // Charge les cartes dues si pas déjà fait
      if (dueCards.length === 0) {
        await loadDueCards(targetDeckId || deckId)
      }
      
      return session
    } catch (err) {
      console.error('Error starting session:', err)
      setError(err instanceof Error ? err.message : 'Failed to start session')
      throw err
    }
  }, [deckId, dueCards.length, loadDueCards])

  // Fin de session
  const endSession = useCallback(async (): Promise<StudySession | null> => {
    if (!engineRef.current) return null

    try {
      setError(null)
      const completedSession = await engineRef.current.endStudySession()
      setCurrentSession(null)
      return completedSession
    } catch (err) {
      console.error('Error ending session:', err)
      setError(err instanceof Error ? err.message : 'Failed to end session')
      throw err
    }
  }, [])

  // Révision d'une carte
  const reviewCard = useCallback(async (grade: Grade, duration?: number) => {
    if (!engineRef.current || !dueCards[currentCardIndex]) {
      throw new Error('No card to review')
    }

    try {
      setError(null)
      const cardId = dueCards[currentCardIndex].card.id
      
      const result = await engineRef.current.reviewCard(cardId, grade, duration)
      
      // Met à jour les statistiques
      const stats = sessionStatsRef.current
      stats.cardsReviewed++
      stats.gradeHistory.push(grade)
      
      if (result.updatedCard.state === 0) { // State.New
        stats.newCards++
      } else {
        stats.reviewCards++
      }
      
      // Met à jour la session
      const session = engineRef.current.getCurrentSession()
      if (session) {
        setCurrentSession({ ...session })
      }
      
      // Retire la carte révisée de la liste et passe à la suivante
      const newDueCards = [...dueCards]
      newDueCards.splice(currentCardIndex, 1)
      setDueCards(newDueCards)
      
      // Ajuste l'index si nécessaire
      if (currentCardIndex >= newDueCards.length && newDueCards.length > 0) {
        setCurrentCardIndex(newDueCards.length - 1)
      }
      
    } catch (err) {
      console.error('Error reviewing card:', err)
      setError(err instanceof Error ? err.message : 'Failed to review card')
      throw err
    }
  }, [dueCards, currentCardIndex])

  // Navigation entre les cartes
  const nextCard = useCallback(() => {
    setCurrentCardIndex(prev => 
      prev < dueCards.length - 1 ? prev + 1 : prev
    )
  }, [dueCards.length])

  const previousCard = useCallback(() => {
    setCurrentCardIndex(prev => prev > 0 ? prev - 1 : 0)
  }, [])

  const goToCard = useCallback((index: number) => {
    if (index >= 0 && index < dueCards.length) {
      setCurrentCardIndex(index)
    }
  }, [dueCards.length])

  const skipCard = useCallback(() => {
    nextCard()
  }, [nextCard])

  // Remise à zéro d'une carte
  const resetCard = useCallback(async () => {
    if (!engineRef.current || !dueCards[currentCardIndex]) return

    try {
      setError(null)
      const cardId = dueCards[currentCardIndex].card.id
      await engineRef.current.resetCard(cardId)
      
      // Recharge les cartes pour refléter les changements
      await loadDueCards()
    } catch (err) {
      console.error('Error resetting card:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset card')
      throw err
    }
  }, [currentCardIndex, dueCards, loadDueCards])

  // Gestion des cartes
  const createCard = useCallback(async (cardData: {
    deckId: string
    front: string
    back: string
    tags?: string[]
  }): Promise<FSRSCard> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized')
    }

    try {
      setError(null)
      const card = await engineRef.current.createCard(cardData)
      
      // Recharge les cartes si on est dans le même deck
      if (cardData.deckId === deckId) {
        await loadDueCards()
      }
      
      return card
    } catch (err) {
      console.error('Error creating card:', err)
      setError(err instanceof Error ? err.message : 'Failed to create card')
      throw err
    }
  }, [deckId, loadDueCards])

  const updateCard = useCallback(async (cardId: string, updates: {
    front?: string
    back?: string
    tags?: string[]
  }): Promise<FSRSCard> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized')
    }

    try {
      setError(null)
      const card = await engineRef.current.updateCard(cardId, updates)
      
      // Met à jour la carte dans la liste locale si présente
      setDueCards(prev => prev.map(dc => 
        dc.card.id === cardId 
          ? { ...dc, card: { ...dc.card, ...updates, updatedAt: new Date() } }
          : dc
      ))
      
      return card
    } catch (err) {
      console.error('Error updating card:', err)
      setError(err instanceof Error ? err.message : 'Failed to update card')
      throw err
    }
  }, [])

  const deleteCard = useCallback(async (cardId: string): Promise<void> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized')
    }

    try {
      setError(null)
      await engineRef.current.deleteCard(cardId)
      
      // Retire la carte de la liste locale
      setDueCards(prev => prev.filter(dc => dc.card.id !== cardId))
      
      // Ajuste l'index si nécessaire
      if (currentCardIndex >= dueCards.length - 1) {
        setCurrentCardIndex(Math.max(0, dueCards.length - 2))
      }
    } catch (err) {
      console.error('Error deleting card:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete card')
      throw err
    }
  }, [currentCardIndex, dueCards.length])

  // Actions avancées
  const suspendCard = useCallback(async (cardId?: string): Promise<void> => {
    if (!engineRef.current) return
    
    const targetCardId = cardId || dueCards[currentCardIndex]?.card.id
    if (!targetCardId) return

    try {
      setError(null)
      await engineRef.current.suspendCard(targetCardId)
      await loadDueCards()
    } catch (err) {
      console.error('Error suspending card:', err)
      setError(err instanceof Error ? err.message : 'Failed to suspend card')
      throw err
    }
  }, [currentCardIndex, dueCards, loadDueCards])

  const unsuspendCard = useCallback(async (cardId: string): Promise<void> => {
    if (!engineRef.current) return

    try {
      setError(null)
      await engineRef.current.unsuspendCard(cardId)
      await loadDueCards()
    } catch (err) {
      console.error('Error unsuspending card:', err)
      setError(err instanceof Error ? err.message : 'Failed to unsuspend card')
      throw err
    }
  }, [loadDueCards])

  const buryCard = useCallback(async (cardId?: string): Promise<void> => {
    if (!engineRef.current) return
    
    const targetCardId = cardId || dueCards[currentCardIndex]?.card.id
    if (!targetCardId) return

    try {
      setError(null)
      await engineRef.current.buryCard(targetCardId)
      await loadDueCards()
    } catch (err) {
      console.error('Error burying card:', err)
      setError(err instanceof Error ? err.message : 'Failed to bury card')
      throw err
    }
  }, [currentCardIndex, dueCards, loadDueCards])

  const unburyCards = useCallback(async (targetDeckId: string): Promise<number> => {
    if (!engineRef.current) return 0

    try {
      setError(null)
      const count = await engineRef.current.unburyCards(targetDeckId)
      await loadDueCards()
      return count
    } catch (err) {
      console.error('Error unburying cards:', err)
      setError(err instanceof Error ? err.message : 'Failed to unbury cards')
      throw err
    }
  }, [loadDueCards])

  // Import
  const importCards = useCallback(async (cards: CardImport[], targetDeckId: string): Promise<ImportResult> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized')
    }

    try {
      setError(null)
      const result = await engineRef.current.importCards(cards, targetDeckId)
      
      // Recharge les cartes si on est dans le même deck
      if (targetDeckId === deckId) {
        await loadDueCards()
      }
      
      return result
    } catch (err) {
      console.error('Error importing cards:', err)
      setError(err instanceof Error ? err.message : 'Failed to import cards')
      throw err
    }
  }, [deckId, loadDueCards])

  // Rechargement
  const refresh = useCallback(async () => {
    await loadDueCards()
  }, [loadDueCards])

  // Récupération de toutes les cartes
  const getAllCards = useCallback(async (targetDeckId: string): Promise<FSRSCard[]> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized')
    }

    try {
      setError(null)
      return await engineRef.current.getAllCards(targetDeckId)
    } catch (err) {
      console.error('Error getting all cards:', err)
      setError(err instanceof Error ? err.message : 'Failed to get cards')
      throw err
    }
  }, [])

  // ==================== CALCULS DÉRIVÉS ====================

  const currentCard = dueCards[currentCardIndex] || null
  const totalCards = dueCards.length
  const remainingCards = totalCards - currentCardIndex
  const isStudying = currentSession !== null

  // Statistiques de session
  const stats = sessionStatsRef.current
  const accuracy = stats.gradeHistory.length > 0 
    ? stats.gradeHistory.filter(g => g >= Grade.Good).length / stats.gradeHistory.length
    : 0

  const averageTime = currentSession && currentSession.cardsReviewed > 0
    ? currentSession.totalDuration / currentSession.cardsReviewed
    : 0

  const gradeDistribution = stats.gradeHistory.reduce((acc, grade) => {
    acc[grade] = (acc[grade] || 0) + 1
    return acc
  }, {} as Record<Grade, number>)

  const sessionStats = {
    cardsReviewed: stats.cardsReviewed,
    newCards: stats.newCards,
    reviewCards: stats.reviewCards,
    accuracy,
    averageTime,
    gradeDistribution
  }

  // ==================== RETURN ====================

  return {
    // État
    engine,
    loading,
    error,
    
    // Session
    currentSession,
    isStudying,
    
    // Cartes
    dueCards,
    currentCard,
    currentCardIndex,
    totalCards,
    remainingCards,
    
    // Actions
    actions: {
      startSession,
      endSession,
      reviewCard,
      skipCard,
      resetCard,
      nextCard,
      previousCard,
      goToCard,
      createCard,
      updateCard,
      deleteCard,
      suspendCard,
      unsuspendCard,
      buryCard,
      unburyCards,
      importCards,
      refresh,
      loadDueCards,
      getAllCards
    },
    
    // Statistiques
    sessionStats
  }
}