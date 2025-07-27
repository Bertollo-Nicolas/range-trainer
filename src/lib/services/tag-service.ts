import { supabase } from '@/lib/supabase'

export interface TagSuggestion {
  id: string
  name: string
  usage_count: number
}

export class TagService {
  // Récupérer les suggestions de tags
  static async getTagSuggestions(searchTerm: string = '', limit: number = 10): Promise<TagSuggestion[]> {
    try {
      const { data, error } = await supabase.rpc('get_tag_suggestions', {
        search_term: searchTerm,
        limit_count: limit
      })

      if (error) {
        console.error('Error fetching tag suggestions:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getTagSuggestions:', error)
      return []
    }
  }

  // Incrémenter l'usage d'un tag (et le créer s'il n'existe pas)
  static async incrementTagUsage(tagName: string): Promise<string | null> {
    if (!tagName.trim()) return null

    try {
      const { data, error } = await supabase.rpc('increment_tag_usage', {
        tag_name: tagName.trim()
      })

      if (error) {
        console.error('Error incrementing tag usage:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in incrementTagUsage:', error)
      return null
    }
  }

  // Traiter les tags d'une carte (incrémenter l'usage pour chaque tag)
  static async processCardTags(tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return

    try {
      // Incrémenter l'usage de chaque tag en parallèle
      await Promise.all(
        tags.map(tag => this.incrementTagUsage(tag))
      )
    } catch (error) {
      console.error('Error processing card tags:', error)
    }
  }

  // Récupérer les tags les plus populaires
  static async getPopularTags(limit: number = 20): Promise<TagSuggestion[]> {
    return this.getTagSuggestions('', limit)
  }

  // Nettoyer les tags inutilisés (fonction d'administration)
  static async cleanupUnusedTags(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_unused_tags')

      if (error) {
        console.error('Error cleaning up unused tags:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Error in cleanupUnusedTags:', error)
      return 0
    }
  }

  // Obtenir les statistiques des tags
  static async getTagStats() {
    try {
      const { data, error } = await supabase
        .from('anki_tags')
        .select('*')
        .order('usage_count', { ascending: false })

      if (error) {
        console.error('Error fetching tag stats:', error)
        return {
          totalTags: 0,
          totalUsage: 0,
          topTags: []
        }
      }

      const totalTags = data.length
      const totalUsage = data.reduce((sum, tag) => sum + tag.usage_count, 0)
      const topTags = data.slice(0, 10)

      return {
        totalTags,
        totalUsage,
        topTags
      }
    } catch (error) {
      console.error('Error in getTagStats:', error)
      return {
        totalTags: 0,
        totalUsage: 0,
        topTags: []
      }
    }
  }
}