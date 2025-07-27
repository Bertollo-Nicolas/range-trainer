import { useState, useEffect, useCallback } from 'react'
import { AnkiService } from '@/lib/services/anki-service'
import { AnkiTreeNode, AnkiDeck, AnkiDeckInsert, AnkiDeckUpdate } from '@/types/anki'

interface UseAnkiDecksReturn {
  decks: AnkiTreeNode[]
  loading: boolean
  error: string | null
  actions: {
    loadDecks: () => Promise<void>
    createDeck: (deckData: AnkiDeckInsert) => Promise<AnkiDeck>
    updateDeck: (deckId: string, updates: AnkiDeckUpdate) => Promise<void>
    deleteDeck: (deckId: string) => Promise<void>
    moveDeck: (deckId: string, newParentId: string | null) => Promise<void>
    toggleExpanded: (deckId: string) => Promise<void>
  }
}

export function useAnkiDecks(): UseAnkiDecksReturn {
  const [decks, setDecks] = useState<AnkiTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger les decks
  const loadDecks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const deckTree = await AnkiService.getDecksTree()
      setDecks(deckTree)
    } catch (err) {
      console.error('Error loading decks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load decks')
    } finally {
      setLoading(false)
    }
  }, [])

  // Créer un deck
  const createDeck = useCallback(async (deckData: AnkiDeckInsert): Promise<AnkiDeck> => {
    try {
      setError(null)
      const newDeck = await AnkiService.createDeck(deckData)
      await loadDecks() // Recharger pour mettre à jour l'arbre
      return newDeck
    } catch (err) {
      console.error('Error creating deck:', err)
      setError(err instanceof Error ? err.message : 'Failed to create deck')
      throw err
    }
  }, [loadDecks])

  // Mettre à jour un deck
  const updateDeck = useCallback(async (deckId: string, updates: AnkiDeckUpdate): Promise<void> => {
    try {
      setError(null)
      await AnkiService.updateDeck(deckId, updates)
      await loadDecks() // Recharger pour mettre à jour l'arbre
    } catch (err) {
      console.error('Error updating deck:', err)
      setError(err instanceof Error ? err.message : 'Failed to update deck')
      throw err
    }
  }, [loadDecks])

  // Supprimer un deck
  const deleteDeck = useCallback(async (deckId: string): Promise<void> => {
    try {
      setError(null)
      await AnkiService.deleteDeck(deckId)
      await loadDecks() // Recharger pour mettre à jour l'arbre
    } catch (err) {
      console.error('Error deleting deck:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete deck')
      throw err
    }
  }, [loadDecks])

  // Déplacer un deck
  const moveDeck = useCallback(async (deckId: string, newParentId: string | null): Promise<void> => {
    try {
      setError(null)
      await AnkiService.moveDeck(deckId, newParentId)
      await loadDecks() // Recharger pour mettre à jour l'arbre
    } catch (err) {
      console.error('Error moving deck:', err)
      setError(err instanceof Error ? err.message : 'Failed to move deck')
      throw err
    }
  }, [loadDecks])

  // Toggle expanded state
  const toggleExpanded = useCallback(async (deckId: string): Promise<void> => {
    // Trouve le deck dans l'arbre et inverse son état
    const findAndToggle = (nodes: AnkiTreeNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === deckId) {
          return true
        }
        if (node.children && findAndToggle(node.children)) {
          return true
        }
      }
      return false
    }

    // Copie locale pour mise à jour immédiate de l'UI
    const updateLocalState = (nodes: AnkiTreeNode[]): AnkiTreeNode[] => {
      return nodes.map(node => {
        if (node.id === deckId) {
          return { ...node, is_expanded: !node.is_expanded }
        }
        if (node.children) {
          return { ...node, children: updateLocalState(node.children) }
        }
        return node
      })
    }

    try {
      // Trouve le deck pour obtenir l'état actuel
      let currentExpanded = false
      const findExpanded = (nodes: AnkiTreeNode[]): void => {
        for (const node of nodes) {
          if (node.id === deckId) {
            currentExpanded = node.is_expanded
            return
          }
          if (node.children) {
            findExpanded(node.children)
          }
        }
      }
      findExpanded(decks)

      // Mise à jour immédiate de l'UI
      setDecks(updateLocalState(decks))

      // Mise à jour en base
      await AnkiService.updateDeck(deckId, { is_expanded: !currentExpanded })
    } catch (err) {
      console.error('Error toggling expanded state:', err)
      // Revenir à l'état précédent en cas d'erreur
      await loadDecks()
      setError(err instanceof Error ? err.message : 'Failed to update deck state')
    }
  }, [decks, loadDecks])

  // Charger au montage
  useEffect(() => {
    loadDecks()
  }, [loadDecks])

  return {
    decks,
    loading,
    error,
    actions: {
      loadDecks,
      createDeck,
      updateDeck,
      deleteDeck,
      moveDeck,
      toggleExpanded
    }
  }
}