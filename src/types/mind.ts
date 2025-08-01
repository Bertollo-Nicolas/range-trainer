// Types pour le système PokerMind+

export interface Task {
  id: string
  title: string
  description?: string
  category: 'Grind' | 'Mental' | 'Review'
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface Habit {
  id: string
  name: string
  description?: string
  frequency: 'daily' | '3x_week' | 'weekly' | 'custom'
  frequency_count?: number // pour custom frequency
  current_streak: number
  max_streak: number
  completion_rate: number
  is_hardcore: boolean
  created_at: string
  updated_at: string
}

export interface HabitEntry {
  id: string
  habit_id: string
  date: string
  status: 'completed' | 'failed' | 'partial'
  comment?: string
  created_at: string
}

export interface Goal {
  id: string
  title: string
  description?: string
  deadline?: string
  progress: number // 0-100
  category: string
  is_smart: boolean
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface GoalTask {
  id: string
  goal_id: string
  task_id: string
}

export interface GoalHabit {
  id: string
  goal_id: string
  habit_id: string
}

export interface JournalEntry {
  id: string
  content: string
  mood: number // -5 to +5
  game_quality: 'A' | 'B' | 'C' | null
  tags: string[]
  date: string
  created_at: string
  updated_at: string
}

export interface MentalLeak {
  id: string
  title: string
  description?: string
  trigger: string
  automatic_thought: string
  mental_reflex: string
  status: 'active' | 'resolved'
  severity: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
  resolved_at?: string
}

export interface SessionReview {
  id: string
  session_date: string
  duration_minutes: number
  game_type: string
  game_rating: 'A' | 'B' | 'C'
  technical_notes?: string
  mental_notes?: string
  key_hands: number
  profit_loss: number
  hands_played: number
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  tasks_completed: number
  tasks_total: number
  habits_completed: number
  habits_total: number
  current_mood?: number
  weekly_completion_rate: number
}

export type MoodValue = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5

export interface MentalTag {
  key: string
  label: string
  color: string
  category: 'emotion' | 'state' | 'trigger' | 'strategy'
}

// Constantes pour les tags mentaux prédéfinis
export const MENTAL_TAGS: MentalTag[] = [
  { key: 'tilt', label: 'Tilt', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', category: 'emotion' },
  { key: 'motivation', label: 'Motivation', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', category: 'state' },
  { key: 'patience', label: 'Patience', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', category: 'state' },
  { key: 'concentration', label: 'Concentration', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', category: 'state' },
  { key: 'discipline', label: 'Discipline', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200', category: 'state' },
  { key: 'auto_controle', label: 'Auto-contrôle', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', category: 'strategy' },
  { key: 'confiance', label: 'Confiance', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', category: 'state' },
  { key: 'fatigue', label: 'Fatigue', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', category: 'state' },
  { key: 'pression', label: 'Pression', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200', category: 'trigger' },
  { key: 'meditation', label: 'Méditation', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200', category: 'strategy' }
]