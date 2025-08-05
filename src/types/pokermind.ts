// Types pour PokerMind+ Dashboard
export type TaskStatus = 'todo' | 'inprogress' | 'done' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high'
export type HabitFrequency = 'daily' | '3x/week' | 'weekly'
export type HabitStatus = '✅' | '❌' | '⚠️'
export type HabitType = 'positive' | 'negative' | 'quantified' | 'duration'
export type GameQuality = 'A' | 'B' | 'C'
export type MentalTag = 'Tilt' | 'Motivation' | 'Patience' | 'Focus' | 'Stress' | 'Confidence'
export type LeakStatus = 'active' | 'resolved'

export interface Task {
  id: string
  title: string
  category: TaskCategory
  status: TaskStatus
  priority: TaskPriority
  createdAt: Date
  completedAt?: Date
  archivedAt?: Date
  deadline?: Date
  description?: string
  parentId?: string // For subtasks
  subtasks?: Task[]
  isTemplate?: boolean
  templateName?: string
}

export interface HabitCategory {
  id: string
  name: string
  color: string
  icon?: string
  isDefault?: boolean
}

export interface Habit {
  id: string
  name: string
  category?: HabitCategory
  frequency: HabitFrequency
  type: HabitType
  currentStreak: number
  maxStreak: number
  completionRate: number
  todayStatus: HabitStatus
  isHardcore: boolean
  createdAt: Date
  lastCompleted?: Date
  
  // Pour les habitudes quantifiées
  targetValue?: number
  targetUnit?: string // ex: "verres", "pages", "minutes"
  
  // Pour les habitudes de durée
  targetDuration?: number // en minutes
  
  // Description optionnelle
  description?: string
}

export interface HabitCompletion {
  id: string
  habitId: string
  date: Date
  status: HabitStatus
  comment?: string
  
  // Pour les habitudes quantifiées
  value?: number // valeur atteinte
  
  // Pour les habitudes de durée
  duration?: number // durée en minutes
}

export interface Goal {
  id: string
  title: string
  deadline: Date
  progress: number // 0-100
  description?: string
  linkedTasks: string[] // Task IDs
  linkedHabits: string[] // Habit IDs
  createdAt: Date
}

export interface JournalEntry {
  id: string
  date: Date
  content: string
  mood: number // -5 to +5
  gameQuality?: GameQuality
  tags: MentalTag[]
  createdAt: Date
}

export interface MentalLeak {
  id: string
  title: string
  trigger: string
  automaticThought: string
  mentalReflex: string
  status: LeakStatus
  linkedJournalEntries: string[]
  createdAt: Date
  resolvedAt?: Date
}

export interface SessionReview {
  id: string
  date: Date
  gameType: string
  duration: number // minutes
  selfAssessment: GameQuality
  technicalNotes: string
  mentalNotes: string
  createdAt: Date
}

export interface DashboardStats {
  tasksCompleted: number
  tasksTotal: number
  habitsCompleted: number
  habitsTotal: number
  currentMood: number
  averageMood: number
}

export interface TaskCategory {
  id: string
  name: string
  color: string
  icon?: string
  isDefault?: boolean
}

export interface TaskTemplate {
  id: string
  name: string
  task: Omit<Task, 'id' | 'createdAt' | 'isTemplate' | 'templateName'>
  createdAt: Date
}