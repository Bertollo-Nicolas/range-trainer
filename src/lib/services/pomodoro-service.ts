import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type PomodoroSessionRow = Database['public']['Tables']['pomodoro_sessions']['Row']
type PomodoroSessionInsert = Database['public']['Tables']['pomodoro_sessions']['Insert']

export interface PomodoroSession {
  id: string
  name: string
  workDuration: number // en secondes
  shortBreakDuration: number // en secondes
  longBreakDuration: number // en secondes
  cyclesBeforeLongBreak: number
  currentCycle: number
  currentType: 'work' | 'short_break' | 'long_break'
  timeLeft: number // en secondes
  isRunning: boolean
  isPaused: boolean
  completedPomodoros: number
  startTime?: Date
  pauseTime?: Date
  createdAt: Date
  updatedAt: Date
}

export interface PomodoroConfig {
  name: string
  workDuration: number // en minutes
  shortBreakDuration: number // en minutes
  longBreakDuration: number // en minutes
  cyclesBeforeLongBreak: number
}

export interface PomodoroHistoryEntry {
  id: string
  sessionId: string
  type: 'work' | 'short_break' | 'long_break'
  plannedDuration: number
  actualDuration?: number
  completed: boolean
  startTime: Date
  endTime?: Date
}

export class PomodoroService {
  // Créer une nouvelle session
  static async createSession(config: PomodoroConfig): Promise<PomodoroSession> {
    const insertData: PomodoroSessionInsert = {
      name: config.name,
      work_duration: config.workDuration * 60, // convertir en secondes
      short_break_duration: config.shortBreakDuration * 60,
      long_break_duration: config.longBreakDuration * 60,
      cycles_before_long_break: config.cyclesBeforeLongBreak,
      current_cycle: 0,
      current_type: 'work',
      time_left: config.workDuration * 60,
      is_running: false,
      is_paused: false,
      completed_pomodoros: 0
    }

    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating pomodoro session:', error)
      throw error
    }

    return this.mapRowToSession(data)
  }

  // Récupérer la session active (s'il y en a une)
  static async getActiveSession(): Promise<PomodoroSession | null> {
    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('is_running', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching active session:', error)
      return null
    }

    return data ? this.mapRowToSession(data) : null
  }

  // Récupérer la dernière session (active ou non)
  static async getLatestSession(): Promise<PomodoroSession | null> {
    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching latest session:', error)
      return null
    }

    return data ? this.mapRowToSession(data) : null
  }

  // Récupérer toutes les sessions
  static async getAllSessions(): Promise<PomodoroSession[]> {
    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20) // Limiter à 20 sessions récentes

    if (error) {
      console.error('Error fetching all sessions:', error)
      return []
    }

    return data.map(row => this.mapRowToSession(row))
  }

  // Mettre à jour une session
  static async updateSession(sessionId: string, updates: Partial<PomodoroSession>): Promise<void> {
    const updateData: Partial<PomodoroSessionInsert> = {}
    
    if (updates.currentType !== undefined) updateData.current_type = updates.currentType
    if (updates.currentCycle !== undefined) updateData.current_cycle = updates.currentCycle
    if (updates.timeLeft !== undefined) updateData.time_left = updates.timeLeft
    if (updates.isRunning !== undefined) updateData.is_running = updates.isRunning
    if (updates.isPaused !== undefined) updateData.is_paused = updates.isPaused
    if (updates.completedPomodoros !== undefined) updateData.completed_pomodoros = updates.completedPomodoros
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime?.toISOString()
    if (updates.pauseTime !== undefined) updateData.pause_time = updates.pauseTime?.toISOString()

    const { error } = await supabase
      .from('pomodoro_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      console.error('Error updating pomodoro session:', error)
      throw error
    }
  }

  // Arrêter toutes les sessions actives
  static async stopAllSessions(): Promise<void> {
    const { error } = await supabase
      .from('pomodoro_sessions')
      .update({ is_running: false, is_paused: false })
      .eq('is_running', true)

    if (error) {
      console.error('Error stopping sessions:', error)
      throw error
    }
  }

  // Supprimer une session
  static async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('pomodoro_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.error('Error deleting pomodoro session:', error)
      throw error
    }
  }

  // Ajouter une entrée à l'historique
  static async addHistoryEntry(entry: Omit<PomodoroHistoryEntry, 'id'>): Promise<void> {
    const { error } = await supabase
      .from('pomodoro_history')
      .insert({
        session_id: entry.sessionId,
        type: entry.type,
        planned_duration: entry.plannedDuration,
        actual_duration: entry.actualDuration,
        completed: entry.completed,
        start_time: entry.startTime.toISOString(),
        end_time: entry.endTime?.toISOString()
      })

    if (error) {
      console.error('Error adding history entry:', error)
      throw error
    }
  }

  // Récupérer l'historique d'une session
  static async getSessionHistory(sessionId: string): Promise<PomodoroHistoryEntry[]> {
    const { data, error } = await supabase
      .from('pomodoro_history')
      .select('*')
      .eq('session_id', sessionId)
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Error fetching session history:', error)
      return []
    }

    return data.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      type: row.type,
      plannedDuration: row.planned_duration,
      actualDuration: row.actual_duration || undefined,
      completed: row.completed,
      startTime: new Date(row.start_time),
      ...(row.end_time && { endTime: new Date(row.end_time) })
    }))
  }

  // Mapper une row de DB vers PomodoroSession
  private static mapRowToSession(row: PomodoroSessionRow): PomodoroSession {
    return {
      id: row.id,
      name: row.name,
      workDuration: row.work_duration,
      shortBreakDuration: row.short_break_duration,
      longBreakDuration: row.long_break_duration,
      cyclesBeforeLongBreak: row.cycles_before_long_break,
      currentCycle: row.current_cycle,
      currentType: row.current_type,
      timeLeft: row.time_left,
      isRunning: row.is_running,
      isPaused: row.is_paused,
      completedPomodoros: row.completed_pomodoros,
      ...(row.start_time && { startTime: new Date(row.start_time) }),
      ...(row.pause_time && { pauseTime: new Date(row.pause_time) }),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}