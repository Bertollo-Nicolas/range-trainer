// Service pour gérer les données PokerMind+ (simulation localStorage pour le développement)

import { 
  Task, Habit, Goal, JournalEntry, MentalLeak, SessionReview, 
  HabitCompletion, DashboardStats,
  TaskCategory, TaskTemplate, HabitCategory
} from '@/types/pokermind'

const STORAGE_KEYS = {
  TASKS: 'pokermind_tasks',
  HABITS: 'pokermind_habits',
  HABIT_COMPLETIONS: 'pokermind_habit_completions',
  HABIT_CATEGORIES: 'pokermind_habit_categories',
  GOALS: 'pokermind_goals',
  JOURNAL_ENTRIES: 'pokermind_journal_entries',
  MENTAL_LEAKS: 'pokermind_mental_leaks',
  SESSION_REVIEWS: 'pokermind_session_reviews',
  TASK_CATEGORIES: 'pokermind_task_categories',
  TASK_TEMPLATES: 'pokermind_task_templates'
}

// Utilitaires localStorage
const getFromStorage = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : []
}

const saveToStorage = <T>(key: string, data: T[]): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

// Generate unique ID
const generateUniqueId = (prefix?: string): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  const counter = Math.floor(Math.random() * 1000)
  return prefix ? `${prefix}_${timestamp}_${random}_${counter}` : `${timestamp}_${random}_${counter}`
}

export class PokerMindService {
  
  // === TASKS ===
  static async getTasks(): Promise<Task[]> {
    return getFromStorage<Task>(STORAGE_KEYS.TASKS)
  }

  static async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    const tasks = await this.getTasks()
    const newTask: Task = {
      id: generateUniqueId('task'),
      ...task
    }
    tasks.push(newTask)
    saveToStorage(STORAGE_KEYS.TASKS, tasks)
    return newTask
  }

  static async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const tasks = await this.getTasks()
    const index = tasks.findIndex(t => t.id === id)
    if (index === -1) return null
    
    tasks[index] = { ...tasks[index], ...updates }
    if (updates.status === 'done' && !tasks[index].completedAt) {
      tasks[index].completedAt = new Date()
    }
    if (updates.status === 'archived' && !tasks[index].archivedAt) {
      tasks[index].archivedAt = new Date()
    }
    
    saveToStorage(STORAGE_KEYS.TASKS, tasks)
    return tasks[index]
  }

  static async deleteTask(id: string): Promise<boolean> {
    const tasks = await this.getTasks()
    const filtered = tasks.filter(t => t.id !== id)
    saveToStorage(STORAGE_KEYS.TASKS, filtered)
    return filtered.length < tasks.length
  }

  static async archiveTask(id: string): Promise<Task | null> {
    return this.updateTask(id, { status: 'archived', archivedAt: new Date() })
  }

  static async duplicateTask(id: string): Promise<Task | null> {
    const tasks = await this.getTasks()
    const originalTask = tasks.find(t => t.id === id)
    if (!originalTask) return null

    const duplicatedTask: Task = {
      ...originalTask,
      id: generateUniqueId('task'),
      title: `${originalTask.title} (copie)`,
      status: 'todo',
      createdAt: new Date()
    }
    // Remove optional properties to avoid type issues
    delete (duplicatedTask as any).completedAt
    delete (duplicatedTask as any).archivedAt

    tasks.push(duplicatedTask)
    saveToStorage(STORAGE_KEYS.TASKS, tasks)
    return duplicatedTask
  }

  // === HABITS ===
  static async getHabits(): Promise<Habit[]> {
    const habits = getFromStorage<any>(STORAGE_KEYS.HABITS)
    
    // Migration des anciennes habitudes vers le nouveau format
    let needsUpdate = false
    const categories = await this.getHabitCategories()
    const defaultCategory = categories.length > 0 ? categories[0] : undefined
    
    const migratedHabits: Habit[] = habits.map((habit: any) => {
      if (!habit.type) {
        needsUpdate = true
        const migratedHabit: Habit = {
          ...habit,
          type: 'positive' as const,
          category: defaultCategory
        }
        return migratedHabit
      }
      return habit as Habit
    })
    
    // Sauvegarder si migration nécessaire
    if (needsUpdate) {
      saveToStorage(STORAGE_KEYS.HABITS, migratedHabits)
    }
    
    return migratedHabits
  }

  static async createHabit(habit: Omit<Habit, 'id'>): Promise<Habit> {
    const habits = await this.getHabits()
    const newHabit: Habit = {
      id: generateUniqueId('habit'),
      ...habit
    }
    habits.push(newHabit)
    saveToStorage(STORAGE_KEYS.HABITS, habits)
    return newHabit
  }

  static async updateHabit(id: string, updates: Partial<Habit>): Promise<Habit | null> {
    const habits = await this.getHabits()
    const index = habits.findIndex(h => h.id === id)
    if (index === -1) return null
    
    habits[index] = { ...habits[index], ...updates }
    saveToStorage(STORAGE_KEYS.HABITS, habits)
    return habits[index]
  }

  static async getHabitCompletions(): Promise<HabitCompletion[]> {
    return getFromStorage<HabitCompletion>(STORAGE_KEYS.HABIT_COMPLETIONS)
  }

  static async recordHabitCompletion(completion: Omit<HabitCompletion, 'id'>): Promise<HabitCompletion> {
    const completions = await this.getHabitCompletions()
    const newCompletion: HabitCompletion = {
      id: generateUniqueId(),
      ...completion
    }
    completions.push(newCompletion)
    saveToStorage(STORAGE_KEYS.HABIT_COMPLETIONS, completions)

    // Mettre à jour les streaks de l'habitude
    await this.updateHabitStreaks(completion.habitId)
    
    return newCompletion
  }

  private static async updateHabitStreaks(habitId: string): Promise<void> {
    const completions = await this.getHabitCompletions()
    const habitCompletions = completions
      .filter(c => c.habitId === habitId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0

    // Calculer les streaks
    for (const completion of habitCompletions) {
      if (completion.status === '✅') {
        tempStreak++
        maxStreak = Math.max(maxStreak, tempStreak)
        if (tempStreak > currentStreak) currentStreak = tempStreak
      } else {
        tempStreak = 0
      }
    }

    // Calculer le taux de complétion
    const totalCompletions = habitCompletions.length
    const successfulCompletions = habitCompletions.filter(c => c.status === '✅').length
    const completionRate = totalCompletions > 0 ? (successfulCompletions / totalCompletions) * 100 : 0

    await this.updateHabit(habitId, {
      currentStreak,
      maxStreak,
      completionRate
    })
  }

  // === GOALS ===
  static async getGoals(): Promise<Goal[]> {
    return getFromStorage<Goal>(STORAGE_KEYS.GOALS)
  }

  static async createGoal(goal: Omit<Goal, 'id'>): Promise<Goal> {
    const goals = await this.getGoals()
    const newGoal: Goal = {
      id: generateUniqueId(),
      ...goal
    }
    goals.push(newGoal)
    saveToStorage(STORAGE_KEYS.GOALS, goals)
    return newGoal
  }

  static async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    const goals = await this.getGoals()
    const index = goals.findIndex(g => g.id === id)
    if (index === -1) return null
    
    goals[index] = { ...goals[index], ...updates }
    saveToStorage(STORAGE_KEYS.GOALS, goals)
    return goals[index]
  }

  // === JOURNAL ===
  static async getJournalEntries(): Promise<JournalEntry[]> {
    return getFromStorage<JournalEntry>(STORAGE_KEYS.JOURNAL_ENTRIES)
  }

  static async createJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry> {
    const entries = await this.getJournalEntries()
    const newEntry: JournalEntry = {
      id: generateUniqueId(),
      createdAt: new Date(),
      ...entry
    }
    entries.push(newEntry)
    saveToStorage(STORAGE_KEYS.JOURNAL_ENTRIES, entries)
    return newEntry
  }

  static async updateJournalEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry | null> {
    const entries = await this.getJournalEntries()
    const index = entries.findIndex(e => e.id === id)
    if (index === -1) return null
    
    entries[index] = { ...entries[index], ...updates }
    saveToStorage(STORAGE_KEYS.JOURNAL_ENTRIES, entries)
    return entries[index]
  }

  static async deleteJournalEntry(id: string): Promise<boolean> {
    const entries = await this.getJournalEntries()
    const filtered = entries.filter(e => e.id !== id)
    saveToStorage(STORAGE_KEYS.JOURNAL_ENTRIES, filtered)
    return filtered.length < entries.length
  }

  // === MENTAL LEAKS ===
  static async getMentalLeaks(): Promise<MentalLeak[]> {
    return getFromStorage<MentalLeak>(STORAGE_KEYS.MENTAL_LEAKS)
  }

  static async createMentalLeak(leak: Omit<MentalLeak, 'id' | 'createdAt'>): Promise<MentalLeak> {
    const leaks = await this.getMentalLeaks()
    const newLeak: MentalLeak = {
      id: generateUniqueId(),
      createdAt: new Date(),
      ...leak
    }
    leaks.push(newLeak)
    saveToStorage(STORAGE_KEYS.MENTAL_LEAKS, leaks)
    return newLeak
  }

  static async updateMentalLeak(id: string, updates: Partial<MentalLeak>): Promise<MentalLeak | null> {
    const leaks = await this.getMentalLeaks()
    const index = leaks.findIndex(l => l.id === id)
    if (index === -1) return null
    
    leaks[index] = { ...leaks[index], ...updates }
    if (updates.status === 'resolved' && !leaks[index].resolvedAt) {
      leaks[index].resolvedAt = new Date()
    }
    
    saveToStorage(STORAGE_KEYS.MENTAL_LEAKS, leaks)
    return leaks[index]
  }

  static async deleteMentalLeak(id: string): Promise<boolean> {
    const leaks = await this.getMentalLeaks()
    const filtered = leaks.filter(l => l.id !== id)
    saveToStorage(STORAGE_KEYS.MENTAL_LEAKS, filtered)
    return filtered.length < leaks.length
  }

  // === SESSION REVIEWS ===
  static async getSessionReviews(): Promise<SessionReview[]> {
    return getFromStorage<SessionReview>(STORAGE_KEYS.SESSION_REVIEWS)
  }

  static async createSessionReview(review: Omit<SessionReview, 'id' | 'createdAt'>): Promise<SessionReview> {
    const reviews = await this.getSessionReviews()
    const newReview: SessionReview = {
      id: generateUniqueId(),
      createdAt: new Date(),
      ...review
    }
    reviews.push(newReview)
    saveToStorage(STORAGE_KEYS.SESSION_REVIEWS, reviews)
    return newReview
  }

  static async updateSessionReview(id: string, updates: Partial<SessionReview>): Promise<SessionReview | null> {
    const reviews = await this.getSessionReviews()
    const index = reviews.findIndex(r => r.id === id)
    if (index === -1) return null
    
    reviews[index] = { ...reviews[index], ...updates }
    saveToStorage(STORAGE_KEYS.SESSION_REVIEWS, reviews)
    return reviews[index]
  }

  static async deleteSessionReview(id: string): Promise<boolean> {
    const reviews = await this.getSessionReviews()
    const filtered = reviews.filter(r => r.id !== id)
    saveToStorage(STORAGE_KEYS.SESSION_REVIEWS, filtered)
    return filtered.length < reviews.length
  }

  // === TASK CATEGORIES ===
  static async getTaskCategories(): Promise<TaskCategory[]> {
    const categories = getFromStorage<TaskCategory>(STORAGE_KEYS.TASK_CATEGORIES)
    
    // Initialize default categories if empty
    if (categories.length === 0) {
      const defaultCategories: TaskCategory[] = [
        { id: 'grind', name: 'Grind', color: '#10b981', isDefault: true },
        { id: 'mental', name: 'Mental', color: '#8b5cf6', isDefault: true },
        { id: 'review', name: 'Review', color: '#3b82f6', isDefault: true }
      ]
      saveToStorage(STORAGE_KEYS.TASK_CATEGORIES, defaultCategories)
      return defaultCategories
    }
    
    return categories
  }

  static async createTaskCategory(category: Omit<TaskCategory, 'id'>): Promise<TaskCategory> {
    const categories = await this.getTaskCategories()
    const newCategory: TaskCategory = {
      id: generateUniqueId('category'),
      ...category
    }
    categories.push(newCategory)
    saveToStorage(STORAGE_KEYS.TASK_CATEGORIES, categories)
    return newCategory
  }

  static async updateTaskCategory(id: string, updates: Partial<TaskCategory>): Promise<TaskCategory | null> {
    const categories = await this.getTaskCategories()
    const index = categories.findIndex(c => c.id === id)
    if (index === -1) return null
    
    categories[index] = { ...categories[index], ...updates }
    saveToStorage(STORAGE_KEYS.TASK_CATEGORIES, categories)
    return categories[index]
  }

  static async deleteTaskCategory(id: string): Promise<boolean> {
    const categories = await this.getTaskCategories()
    const category = categories.find(c => c.id === id)
    if (category?.isDefault) return false // Can't delete default categories
    
    const filtered = categories.filter(c => c.id !== id)
    saveToStorage(STORAGE_KEYS.TASK_CATEGORIES, filtered)
    return filtered.length < categories.length
  }

  // === TASK TEMPLATES ===
  static async getTaskTemplates(): Promise<TaskTemplate[]> {
    return getFromStorage<TaskTemplate>(STORAGE_KEYS.TASK_TEMPLATES)
  }

  static async createTaskTemplate(template: Omit<TaskTemplate, 'id' | 'createdAt'>): Promise<TaskTemplate> {
    const templates = await this.getTaskTemplates()
    const newTemplate: TaskTemplate = {
      id: generateUniqueId('template'),
      createdAt: new Date(),
      ...template
    }
    templates.push(newTemplate)
    saveToStorage(STORAGE_KEYS.TASK_TEMPLATES, templates)
    return newTemplate
  }

  static async createTaskFromTemplate(templateId: string): Promise<Task | null> {
    const templates = await this.getTaskTemplates()
    const template = templates.find(t => t.id === templateId)
    if (!template) return null

    const newTask: Task = {
      id: generateUniqueId('task'),
      createdAt: new Date(),
      ...template.task,
      priority: template.task.priority || 'medium'
    }

    const tasks = await this.getTasks()
    tasks.push(newTask)
    saveToStorage(STORAGE_KEYS.TASKS, tasks)
    return newTask
  }

  static async deleteTaskTemplate(id: string): Promise<boolean> {
    const templates = await this.getTaskTemplates()
    const filtered = templates.filter(t => t.id !== id)
    saveToStorage(STORAGE_KEYS.TASK_TEMPLATES, filtered)
    return filtered.length < templates.length
  }

  // === HABIT CATEGORIES ===
  static async getHabitCategories(): Promise<HabitCategory[]> {
    const categories = getFromStorage<HabitCategory>(STORAGE_KEYS.HABIT_CATEGORIES)
    
    // Initialize default categories if empty
    if (categories.length === 0) {
      const defaultCategories: HabitCategory[] = [
        { id: 'health', name: 'Santé', color: '#10b981', isDefault: true },
        { id: 'productivity', name: 'Productivité', color: '#3b82f6', isDefault: true },
        { id: 'personal', name: 'Développement Personnel', color: '#8b5cf6', isDefault: true },
        { id: 'fitness', name: 'Fitness', color: '#f59e0b', isDefault: true }
      ]
      saveToStorage(STORAGE_KEYS.HABIT_CATEGORIES, defaultCategories)
      return defaultCategories
    }
    
    return categories
  }

  static async createHabitCategory(category: Omit<HabitCategory, 'id'>): Promise<HabitCategory> {
    const categories = await this.getHabitCategories()
    const newCategory: HabitCategory = {
      id: generateUniqueId('habit_category'),
      ...category
    }
    categories.push(newCategory)
    saveToStorage(STORAGE_KEYS.HABIT_CATEGORIES, categories)
    return newCategory
  }

  static async updateHabitCategory(id: string, updates: Partial<HabitCategory>): Promise<HabitCategory | null> {
    const categories = await this.getHabitCategories()
    const index = categories.findIndex(c => c.id === id)
    if (index === -1) return null
    
    categories[index] = { ...categories[index], ...updates }
    saveToStorage(STORAGE_KEYS.HABIT_CATEGORIES, categories)
    return categories[index]
  }

  static async deleteHabitCategory(id: string): Promise<boolean> {
    const categories = await this.getHabitCategories()
    const category = categories.find(c => c.id === id)
    if (category?.isDefault) return false // Can't delete default categories
    
    const filtered = categories.filter(c => c.id !== id)
    saveToStorage(STORAGE_KEYS.HABIT_CATEGORIES, filtered)
    return filtered.length < categories.length
  }

  // === DASHBOARD STATS ===
  static async getDashboardStats(): Promise<DashboardStats> {
    const tasks = await this.getTasks()
    const habits = await this.getHabits()
    const entries = await this.getJournalEntries()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Stats des tâches du jour
    const todayTasks = tasks.filter(t => {
      const taskDate = new Date(t.createdAt)
      taskDate.setHours(0, 0, 0, 0)
      return taskDate.getTime() === today.getTime()
    })

    const tasksCompleted = todayTasks.filter(t => t.status === 'done').length
    const tasksTotal = todayTasks.filter(t => t.status !== 'archived').length

    // Stats des habitudes du jour
    const habitsCompleted = habits.filter(h => h.todayStatus === '✅').length
    const habitsTotal = habits.length

    // Stats mood
    const recentEntries = entries
      .filter(e => new Date(e.date).getTime() >= today.getTime() - 7 * 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const currentMood = recentEntries.length > 0 ? recentEntries[0].mood : 0
    const averageMood = recentEntries.length > 0 
      ? recentEntries.reduce((sum, e) => sum + e.mood, 0) / recentEntries.length 
      : 0

    return {
      tasksCompleted,
      tasksTotal,
      habitsCompleted,
      habitsTotal,
      currentMood,
      averageMood
    }
  }

  // === SAMPLE DATA ===
  static async initializeSampleData(): Promise<void> {
    const tasks = await this.getTasks()
    const habits = await this.getHabits()
    
    // Check for duplicate IDs and clear if found
    const taskIds = tasks.map(t => t.id)
    const habitIds = habits.map(h => h.id)
    const hasDuplicateTaskIds = taskIds.length !== new Set(taskIds).size
    const hasDuplicateHabitIds = habitIds.length !== new Set(habitIds).size
    
    if (hasDuplicateTaskIds || hasDuplicateHabitIds) {
      // Clear all data if duplicates found
      localStorage.removeItem(STORAGE_KEYS.TASKS)
      localStorage.removeItem(STORAGE_KEYS.HABITS)
      localStorage.removeItem(STORAGE_KEYS.HABIT_COMPLETIONS)
      localStorage.removeItem(STORAGE_KEYS.GOALS)
      localStorage.removeItem(STORAGE_KEYS.JOURNAL_ENTRIES)
      localStorage.removeItem(STORAGE_KEYS.MENTAL_LEAKS)
      localStorage.removeItem(STORAGE_KEYS.SESSION_REVIEWS)
      localStorage.removeItem(STORAGE_KEYS.TASK_CATEGORIES)
      localStorage.removeItem(STORAGE_KEYS.TASK_TEMPLATES)
      localStorage.removeItem(STORAGE_KEYS.HABIT_CATEGORIES)
    }
    
    
    // Plus de tâches d'exemple - l'utilisateur créera les siennes

    // Plus d'habitudes d'exemple - l'utilisateur créera les siennes
  }

  // Fonction pour forcer la migration des données (dev/debug)
  static async forceDataMigration(): Promise<void> {
    console.log('🔄 Migration forcée des données...')
    
    // Migrer les habitudes existantes
    const habits = getFromStorage<any>(STORAGE_KEYS.HABITS)
    const categories = await this.getHabitCategories()
    
    if (habits.length > 0 && categories.length > 0) {
      const migratedHabits = habits.map((habit: any) => ({
        ...habit,
        type: habit.type || 'positive',
        category: habit.category || categories[0]
      }))
      
      saveToStorage(STORAGE_KEYS.HABITS, migratedHabits)
      console.log(`✅ ${habits.length} habitudes migrées`)
    }
  }
}