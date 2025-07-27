'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Range {
  id: string
  name: string
  description?: string
  data?: any // Structure de données de la range (pour compatibilité)
  hands?: any // Données des mains depuis tree_items
  notes?: string // Notes depuis tree_items  
  type?: string // Type depuis tree_items
  created_at?: string
  updated_at?: string
}

export function useRanges() {
  const [ranges, setRanges] = useState<Range[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRanges()
  }, [])

  const fetchRanges = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Chargement des ranges...')
      
      const { data, error } = await supabase
        .from('tree_items')
        .select('*')
        .eq('type', 'range')
        .order('name')

      console.log('📊 Résultat requête ranges:', { data, error })

      if (error) {
        // Si la table n'existe pas ou en cas d'erreur, on utilise des données de test
        console.warn('⚠️ Erreur Supabase, utilisation de ranges de test:', error.message)
        const testRanges: Range[] = [
          {
            id: '1',
            name: 'Preflop - UTG Opening Range',
            notes: 'Range d\'ouverture standard UTG en 6max',
            hands: ["AA", "KK", "QQ", "JJ", "AKs", "AQs", "AJs", "ATs", "A9s", "AKo", "AQo"],
            type: 'range'
          },
          {
            id: '2', 
            name: 'Preflop - CO vs 3bet Calling',
            notes: 'Range de call face à un 3bet depuis CO',
            hands: ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AQs", "AJs", "KQs"],
            type: 'range'
          },
          {
            id: '3',
            name: 'Postflop - Cbet Range BTN',
            notes: 'Range de continuation bet en position',
            hands: ["AA", "KK", "QQ", "JJ", "TT", "99", "AKs", "AQs", "AJs", "ATs", "A5s", "A4s"],
            type: 'range'
          },
          {
            id: '4',
            name: 'Bluff - Light 3bet SB vs BTN',
            notes: 'Range de 3bet bluff depuis SB contre BTN open',
            hands: ["A5s", "A4s", "A3s", "A2s", "K9s", "K8s", "Q9s", "J9s"],
            type: 'range'
          }
        ]
        setRanges(testRanges)
        return
      }

      console.log(`✅ ${data?.length || 0} ranges chargées`)
      setRanges(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des ranges'
      setError(errorMessage)
      console.error('❌ Erreur lors du chargement des ranges:', err)
      // En cas d'erreur, on met une liste vide pour ne pas bloquer l'interface
      setRanges([])
    } finally {
      setLoading(false)
    }
  }

  const createRange = async (range: Omit<Range, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('tree_items')
        .insert([{ ...range, type: 'range' }])
        .select()
        .single()

      if (error) throw error

      setRanges(prev => [...prev, data])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la range')
      throw err
    }
  }

  const updateRange = async (id: string, updates: Partial<Range>) => {
    try {
      const { data, error } = await supabase
        .from('tree_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setRanges(prev => prev.map(r => r.id === id ? data : r))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la range')
      throw err
    }
  }

  const deleteRange = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tree_items')
        .delete()
        .eq('id', id)

      if (error) throw error

      setRanges(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de la range')
      throw err
    }
  }

  return {
    ranges,
    loading,
    error,
    fetchRanges,
    createRange,
    updateRange,
    deleteRange
  }
}