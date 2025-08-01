import { supabase } from '@/lib/supabase'
import { BaseNode, ScenarioContext, TableFormat } from '@/types/scenario'

export interface ScenarioData {
  id?: string
  name: string
  description?: string
  graph_data: {
    nodes: BaseNode[]
    context: ScenarioContext
    tableFormat: TableFormat
  }
  created_at?: string
  updated_at?: string
}

/**
 * Service pour la gestion des scénarios en base de données
 */
export class ScenarioService {
  
  /**
   * Convertit les données depuis useScenarioLogic vers le format de sauvegarde
   */
  static convertFromScenarioState(scenarioState: { nodes: any[], tableFormat: string }, name: string, description?: string): ScenarioData {
    return {
      name,
      ...(description && { description }),
      graph_data: {
        nodes: scenarioState.nodes,
        context: { actionHistory: [] }, // Context vide pour l'instant
        tableFormat: scenarioState.tableFormat as TableFormat
      }
    }
  }

  /**
   * Sauvegarder un scénario
   */
  static async saveScenario(scenario: ScenarioData): Promise<ScenarioData | null> {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .insert({
          name: scenario.name,
          description: scenario.description || '',
          graph_data: scenario.graph_data
        })
        .select()
        .single()

      if (error) {
        console.error('Erreur lors de la sauvegarde du scénario:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du scénario:', error)
      return null
    }
  }

  /**
   * Mettre à jour un scénario existant
   */
  static async updateScenario(id: string, scenario: Partial<ScenarioData>): Promise<ScenarioData | null> {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .update({
          name: scenario.name,
          description: scenario.description,
          graph_data: scenario.graph_data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Erreur lors de la mise à jour du scénario:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erreur lors de la mise à jour du scénario:', error)
      return null
    }
  }

  /**
   * Charger un scénario par ID
   */
  static async loadScenario(id: string): Promise<ScenarioData | null> {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Erreur lors du chargement du scénario:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erreur lors du chargement du scénario:', error)
      return null
    }
  }

  /**
   * Lister tous les scénarios
   */
  static async listScenarios(): Promise<ScenarioData[]> {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur lors du chargement des scénarios:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erreur lors du chargement des scénarios:', error)
      return []
    }
  }

  /**
   * Supprimer un scénario
   */
  static async deleteScenario(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Erreur lors de la suppression du scénario:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erreur lors de la suppression du scénario:', error)
      return false
    }
  }
}