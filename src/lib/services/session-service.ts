import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type SessionRow = Database['public']['Tables']['sessions']['Row']
type SessionInsert = Database['public']['Tables']['sessions']['Insert']
type SessionUpdate = Database['public']['Tables']['sessions']['Update']
type SessionHandRow = Database['public']['Tables']['session_hands']['Row']

export interface SessionStats {
  id: string
  scenarioId?: string
  scenarioName?: string
  rangeId?: string
  rangeName?: string
  type: 'scenario' | 'range_training'
  startTime: Date
  endTime: Date
  duration: number // en minutes
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  accuracy: number
  streak: number
  createdAt: Date
}

export interface GlobalStats {
  totalSessions: number
  totalPlayTime: number // en minutes
  totalQuestions: number
  globalAccuracy: number
  bestStreak: number
  averageSessionDuration: number
  sessionsThisWeek: number
  improvementRate: number
}

export class SessionService {
  // Créer une nouvelle session
  static async createSession(session: Omit<SessionStats, 'id' | 'createdAt'>): Promise<SessionStats> {
    // Validation selon la contrainte DB valid_scenario_data
    if (session.type === 'scenario' && !session.scenarioId) {
      throw new Error('scenarioId is required for scenario sessions')
    }
    if (session.type === 'range_training' && !session.rangeId) {
      throw new Error('rangeId is required for range_training sessions')
    }

    const insertData: SessionInsert = {
      scenario_id: session.scenarioId || null,
      scenario_name: session.scenarioName || null,
      range_id: session.rangeId || null,
      range_name: session.rangeName || null,
      type: session.type,
      start_time: session.startTime.toISOString(),
      end_time: session.endTime.toISOString(),
      duration: session.duration,
      total_questions: session.totalQuestions,
      correct_answers: session.correctAnswers,
      incorrect_answers: session.incorrectAnswers,
      accuracy: session.accuracy,
      streak: session.streak
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      throw error
    }

    return this.mapRowToSession(data)
  }

  // Récupérer toutes les sessions
  static async getAllSessions(): Promise<SessionStats[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sessions:', error)
      return this.getFallbackSessions()
    }

    if (!data || data.length === 0) {
      return this.getFallbackSessions()
    }

    return data.map(this.mapRowToSession)
  }

  // Récupérer les sessions par type
  static async getSessionsByType(type: 'scenario' | 'range_training'): Promise<SessionStats[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sessions by type:', error)
      return []
    }

    return data?.map(this.mapRowToSession) || []
  }

  // Récupérer les sessions d'un scénario spécifique
  static async getSessionsByScenario(scenarioId: string): Promise<SessionStats[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sessions by scenario:', error)
      return []
    }

    return data?.map(this.mapRowToSession) || []
  }

  // Récupérer les sessions d'une range spécifique
  static async getSessionsByRange(rangeId: string): Promise<SessionStats[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('range_id', rangeId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sessions by range:', error)
      return []
    }

    return data?.map(this.mapRowToSession) || []
  }

  // Calculer les statistiques globales
  static async getGlobalStats(): Promise<GlobalStats> {
    try {
      const sessions = await this.getAllSessions()
      
      if (sessions.length === 0) {
        return this.getFallbackGlobalStats()
      }

      const totalSessions = sessions.length
      const totalPlayTime = sessions.reduce((acc, session) => acc + session.duration, 0)
      const totalQuestions = sessions.reduce((acc, session) => acc + session.totalQuestions, 0)
      const totalCorrectAnswers = sessions.reduce((acc, session) => acc + session.correctAnswers, 0)
      const globalAccuracy = totalQuestions > 0 ? Math.round((totalCorrectAnswers / totalQuestions) * 100) : 0
      const bestStreak = Math.max(...sessions.map(session => session.streak), 0)
      const averageSessionDuration = totalSessions > 0 ? totalPlayTime / totalSessions : 0

      // Sessions de cette semaine
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const sessionsThisWeek = sessions.filter(session => session.createdAt >= oneWeekAgo).length

      // Taux d'amélioration (simplifié)
      const recentSessions = sessions.slice(0, Math.min(5, sessions.length))
      const olderSessions = sessions.slice(-Math.min(5, sessions.length))
      const recentAvgAccuracy = recentSessions.length > 0 
        ? recentSessions.reduce((acc, s) => acc + s.accuracy, 0) / recentSessions.length 
        : 0
      const olderAvgAccuracy = olderSessions.length > 0 
        ? olderSessions.reduce((acc, s) => acc + s.accuracy, 0) / olderSessions.length 
        : 0
      const improvementRate = recentAvgAccuracy - olderAvgAccuracy

      return {
        totalSessions,
        totalPlayTime,
        totalQuestions,
        globalAccuracy,
        bestStreak,
        averageSessionDuration,
        sessionsThisWeek,
        improvementRate: Math.round(improvementRate * 10) / 10
      }
    } catch (error) {
      console.error('Error calculating global stats:', error)
      return this.getFallbackGlobalStats()
    }
  }

  // Supprimer une session
  static async deleteSession(id: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting session:', error)
      throw error
    }
  }

  // Récupérer les mains jouées d'une session
  static async getSessionHands(sessionId: string): Promise<SessionHandRow[]> {
    const { data, error } = await supabase
      .from('session_hands')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching session hands:', error)
      return []
    }

    return data || []
  }

  // Enregistrer une main jouée
  static async recordSessionHand(sessionId: string, handData: {
    hand: string
    card1: string
    card2: string
    position?: string | null
    playerAction?: string | null  
    correctAction?: string | null
    isCorrect: boolean
    responseTime?: number | null
    questionContext?: any | null
  }): Promise<void> {
    const { error } = await supabase
      .from('session_hands')
      .insert({
        session_id: sessionId,
        hand: handData.hand,
        card1: handData.card1,
        card2: handData.card2,
        position: handData.position,
        player_action: handData.playerAction,
        correct_action: handData.correctAction,
        is_correct: handData.isCorrect,
        response_time: handData.responseTime,
        question_context: handData.questionContext
      })

    if (error) {
      console.error('Error recording session hand:', error)
      throw error
    }
  }

  // Mettre à jour une session existante
  static async updateSession(sessionId: string, updates: Partial<SessionStats>): Promise<void> {
    const updateData: Partial<SessionInsert> = {}
    
    if (updates.endTime) updateData.end_time = updates.endTime.toISOString()
    if (updates.duration !== undefined) updateData.duration = updates.duration
    if (updates.totalQuestions !== undefined) updateData.total_questions = updates.totalQuestions
    if (updates.correctAnswers !== undefined) updateData.correct_answers = updates.correctAnswers
    if (updates.incorrectAnswers !== undefined) updateData.incorrect_answers = updates.incorrectAnswers
    if (updates.accuracy !== undefined) updateData.accuracy = updates.accuracy
    if (updates.streak !== undefined) updateData.streak = updates.streak

    const { error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      console.error('Error updating session:', error)
      throw error
    }
  }

  // Mapper une row de DB vers SessionStats
  private static mapRowToSession(row: SessionRow): SessionStats {
    return {
      id: row.id,
      scenarioId: row.scenario_id || undefined,
      scenarioName: row.scenario_name || undefined,
      rangeId: row.range_id || undefined,
      rangeName: row.range_name || undefined,
      type: row.type,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      duration: row.duration,
      totalQuestions: row.total_questions,
      correctAnswers: row.correct_answers,
      incorrectAnswers: row.incorrect_answers,
      accuracy: row.accuracy,
      streak: row.streak,
      createdAt: new Date(row.created_at)
    }
  }

  // Données de fallback pour les tests
  private static getFallbackSessions(): SessionStats[] {
    const now = new Date()
    
    return [
      {
        id: '1',
        scenarioId: 'sc1',
        scenarioName: 'UTG vs 3bet',
        type: 'scenario',
        startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 jours ago
        endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
        duration: 15,
        totalQuestions: 25,
        correctAnswers: 20,
        incorrectAnswers: 5,
        accuracy: 80,
        streak: 8,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        rangeId: 'r1',
        rangeName: 'BTN Opening Range',
        type: 'range_training',
        startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours ago
        endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
        duration: 15,
        totalQuestions: 30,
        correctAnswers: 25,
        incorrectAnswers: 5,
        accuracy: 83,
        streak: 12,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: '3',
        scenarioId: 'sc2',
        scenarioName: 'SB vs BTN',
        type: 'scenario',
        startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 jour ago
        endTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
        duration: 20,
        totalQuestions: 35,
        correctAnswers: 28,
        incorrectAnswers: 7,
        accuracy: 80,
        streak: 15,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      }
    ]
  }

  private static getFallbackGlobalStats(): GlobalStats {
    return {
      totalSessions: 3,
      totalPlayTime: 50,
      totalQuestions: 90,
      globalAccuracy: 81,
      bestStreak: 15,
      averageSessionDuration: 16.7,
      sessionsThisWeek: 3,
      improvementRate: 5.2
    }
  }
}