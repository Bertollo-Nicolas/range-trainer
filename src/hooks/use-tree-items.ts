'use client'

import { useState, useEffect, useCallback } from 'react'
import { TreeItem } from '@/types/range'
import { TreeService } from '@/lib/services/tree-service'

export function useTreeItems() {
  const [items, setItems] = useState<TreeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Charger les données initiales
  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await TreeService.getAll()
      setItems(data)
    } catch (err) {
      setError(err as Error)
      console.error('Error loading tree items:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Créer un nouvel élément
  const createItem = useCallback(async (item: Omit<TreeItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newItem = await TreeService.create(item)
      setItems(prev => [...prev, newItem])
      return newItem
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [])

  // Mettre à jour un élément
  const updateItem = useCallback(async (id: string, updates: Partial<TreeItem>) => {
    try {
      const updatedItem = await TreeService.update(id, updates)
      setItems(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ))
      return updatedItem
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [])

  // Supprimer un élément
  const deleteItem = useCallback(async (id: string) => {
    try {
      await TreeService.delete(id)
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [])

  // Déplacer un élément
  const moveItem = useCallback(async (id: string, newParentId: string | null) => {
    try {
      const updatedItem = await TreeService.move(id, newParentId)
      setItems(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ))
      return updatedItem
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [])

  // Basculer l'expansion d'un dossier
  const toggleExpanded = useCallback(async (id: string) => {
    try {
      const updatedItem = await TreeService.toggleExpanded(id)
      setItems(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ))
      return updatedItem
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [])

  // Dupliquer un élément
  const duplicateItem = useCallback(async (id: string, newName: string) => {
    try {
      const duplicatedItem = await TreeService.duplicate(id, newName)
      setItems(prev => [...prev, duplicatedItem])
      return duplicatedItem
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [])

  // Charger les données au montage et s'abonner aux changements
  useEffect(() => {
    loadItems()

    // S'abonner aux changements en temps réel
    const unsubscribe = TreeService.subscribeToChanges((newItems) => {
      setItems(newItems)
    })

    return unsubscribe
  }, [loadItems])

  return {
    items,
    loading,
    error,
    actions: {
      loadItems,
      createItem,
      updateItem,
      deleteItem,
      moveItem,
      toggleExpanded,
      duplicateItem
    }
  }
}