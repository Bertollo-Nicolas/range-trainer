import { supabase } from '@/lib/supabase'
import { TreeItem } from '@/types/range'
import { Database } from '@/types/database'

type TreeItemRow = Database['public']['Tables']['tree_items']['Row']
type TreeItemInsert = Database['public']['Tables']['tree_items']['Insert']
type TreeItemUpdate = Database['public']['Tables']['tree_items']['Update']

export class TreeService {
  // Récupérer un élément par ID
  static async getById(id: string): Promise<TreeItem | null> {
    const { data, error } = await supabase
      .from('tree_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching tree item by id:', error)
      return null
    }

    return this.mapRowToTreeItem(data)
  }

  // Récupérer tous les éléments
  static async getAll(): Promise<TreeItem[]> {
    console.log('🔍 TreeService.getAll() called')
    
    const { data, error } = await supabase
      .from('tree_items')
      .select('*')
      .order('created_at')

    if (error) {
      console.error('❌ Error fetching tree items, using fallback data:', error)
      // Fallback avec des données de test si la DB n'est pas accessible
      return this.getFallbackData()
    }

    console.log('📊 Data count:', data?.length || 0)
    
    // Si pas de données, utiliser les données de test
    if (!data || data.length === 0) {
      console.log('📊 No data in DB, using fallback data')
      return this.getFallbackData()
    }
    
    const mappedItems = data.map(this.mapRowToTreeItem)
    
    return mappedItems
  }

  // Créer un nouvel élément
  static async create(item: Omit<TreeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TreeItem> {
    const insertData: TreeItemInsert = {
      name: item.name,
      type: item.type,
      parent_id: item.parentId,
      ...(item.type === 'folder' && { 
        is_expanded: (item as any).isExpanded || false 
      }),
      ...(item.type === 'range' && { 
        hands: (item as any).data?.hands || [],
        notes: (item as any).data?.notes || null,
        editor_data: (item as any).data?.editorData || null
      })
    }

    const { data, error } = await supabase
      .from('tree_items')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating tree item:', error)
      throw error
    }

    return this.mapRowToTreeItem(data)
  }

  // Mettre à jour un élément
  static async update(id: string, updates: Partial<TreeItem>): Promise<TreeItem> {
    console.log('🔧 TreeService.update called with:', { id, updates })
    
    const updateData: TreeItemUpdate = {
      ...(updates.name && { name: updates.name }),
      ...(updates.parentId !== undefined && { parent_id: updates.parentId }),
      ...(updates.type === 'folder' && updates.hasOwnProperty('isExpanded') && { 
        is_expanded: (updates as any).isExpanded 
      }),
      ...(updates.data && {
        hands: updates.data.hands,
        notes: updates.data.notes || null,
        editor_data: updates.data.editorData || null
      })
    }

    console.log('📦 Update data being sent to Supabase:', updateData)

    const { data, error } = await supabase
      .from('tree_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase update error:', error)
      throw error
    }

    console.log('✅ Supabase update successful:', data)
    return this.mapRowToTreeItem(data)
  }

  // Supprimer un élément
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tree_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting tree item:', error)
      throw error
    }
  }

  // Déplacer un élément (changer son parent)
  static async move(id: string, newParentId: string | null): Promise<TreeItem> {
    const { data, error } = await supabase
      .from('tree_items')
      .update({ parent_id: newParentId })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error moving tree item:', error)
      throw error
    }

    return this.mapRowToTreeItem(data)
  }

  // Basculer l'état d'expansion d'un dossier
  static async toggleExpanded(id: string): Promise<TreeItem> {
    // D'abord récupérer l'état actuel
    const { data: currentData, error: fetchError } = await supabase
      .from('tree_items')
      .select('is_expanded')
      .eq('id', id)
      .eq('type', 'folder')
      .single()

    if (fetchError) {
      console.error('Error fetching folder state:', fetchError)
      throw fetchError
    }

    // Basculer l'état directement avec une requête update
    const newExpanded = !currentData.is_expanded
    const { data, error } = await supabase
      .from('tree_items')
      .update({ is_expanded: newExpanded })
      .eq('id', id)
      .eq('type', 'folder')
      .select()
      .single()

    if (error) {
      console.error('Error updating folder expanded state:', error)
      throw error
    }

    return this.mapRowToTreeItem(data)
  }

  // Dupliquer un élément
  static async duplicate(id: string, newName: string): Promise<TreeItem> {
    // Récupérer l'élément original
    const { data: originalData, error: fetchError } = await supabase
      .from('tree_items')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching original item:', fetchError)
      throw fetchError
    }

    // Créer une copie avec un nouveau nom
    const duplicateData: TreeItemInsert = {
      name: newName,
      type: originalData.type,
      parent_id: originalData.parent_id,
      ...(originalData.type === 'folder' && { 
        is_expanded: false // Les dossiers dupliqués commencent fermés
      }),
      ...(originalData.type === 'range' && { 
        hands: originalData.hands || [],
        notes: originalData.notes || null,
        editor_data: originalData.editor_data || null
      })
    }

    const { data, error } = await supabase
      .from('tree_items')
      .insert(duplicateData)
      .select()
      .single()

    if (error) {
      console.error('Error duplicating item:', error)
      throw error
    }

    return this.mapRowToTreeItem(data)
  }

  // S'abonner aux changements en temps réel
  static subscribeToChanges(callback: (items: TreeItem[]) => void) {
    const channel = supabase
      .channel('tree_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tree_items'
        },
        async () => {
          // Recharger toutes les données quand quelque chose change
          try {
            const items = await this.getAll()
            callback(items)
          } catch (error) {
            console.error('Error reloading tree items:', error)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  // Mapper une row de DB vers un TreeItem
  private static mapRowToTreeItem(row: TreeItemRow): TreeItem {
    const base = {
      id: row.id,
      name: row.name,
      type: row.type,
      parentId: row.parent_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }

    if (row.type === 'folder') {
      return {
        ...base,
        type: 'folder',
        isExpanded: row.is_expanded || false
      }
    } else {
      return {
        ...base,
        type: 'range',
        data: {
          hands: row.hands || [],
          notes: row.notes || undefined,
          editorData: row.editor_data || undefined
        }
      }
    }
  }

  // Données de test pour fallback
  private static getFallbackData(): TreeItem[] {
    // Utiliser une date fixe pour éviter les problèmes d'hydration
    const now = new Date('2024-01-01T00:00:00.000Z')
    
    return [
      // Dossier root "Preflop"
      {
        id: 'folder-preflop',
        name: 'Preflop',
        type: 'folder',
        parentId: null,
        createdAt: now,
        updatedAt: now,
        isExpanded: true
      },
      // Ranges dans Preflop
      {
        id: 'range-utg-opening',
        name: 'UTG Opening Range',
        type: 'range',
        parentId: 'folder-preflop',
        createdAt: now,
        updatedAt: now,
        data: {
          hands: ["AA", "KK", "QQ", "JJ", "AKs", "AQs", "AJs", "ATs", "A9s", "AKo", "AQo"],
          notes: 'Range d\'ouverture standard UTG en 6max'
        }
      },
      {
        id: 'range-co-3bet-call',
        name: 'CO vs 3bet Calling',
        type: 'range',
        parentId: 'folder-preflop',
        createdAt: now,
        updatedAt: now,
        data: {
          hands: ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AQs", "AJs", "KQs"],
          notes: 'Range de call face à un 3bet depuis CO'
        }
      },
      // Dossier "Postflop"
      {
        id: 'folder-postflop',
        name: 'Postflop',
        type: 'folder',
        parentId: null,
        createdAt: now,
        updatedAt: now,
        isExpanded: false
      },
      // Range dans Postflop
      {
        id: 'range-btn-cbet',
        name: 'Cbet Range BTN',
        type: 'range',
        parentId: 'folder-postflop',
        createdAt: now,
        updatedAt: now,
        data: {
          hands: ["AA", "KK", "QQ", "JJ", "TT", "99", "AKs", "AQs", "AJs", "ATs", "A5s", "A4s"],
          notes: 'Range de continuation bet en position'
        }
      },
      // Dossier "Bluffs"
      {
        id: 'folder-bluffs',
        name: 'Bluffs',
        type: 'folder',
        parentId: null,
        createdAt: now,
        updatedAt: now,
        isExpanded: false
      },
      // Range dans Bluffs
      {
        id: 'range-light-3bet',
        name: 'Light 3bet SB vs BTN',
        type: 'range',
        parentId: 'folder-bluffs',
        createdAt: now,
        updatedAt: now,
        data: {
          hands: ["A5s", "A4s", "A3s", "A2s", "K9s", "K8s", "Q9s", "J9s"],
          notes: 'Range de 3bet bluff depuis SB contre BTN open'
        }
      }
    ]
  }
}