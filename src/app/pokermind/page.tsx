'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, CheckCircle, Target, BookOpen, 
  TrendingUp, Calendar, Settings,
  Plus, Edit2, Timer
} from 'lucide-react'
import Link from 'next/link'
import { PokerMindService } from '@/lib/services/pokermind-service'
import { DashboardStats, Task, Habit, TaskCategory } from '@/types/pokermind'

// Composant Mood Slider
function MoodSlider({ 
  value, 
  onChange, 
  disabled = false 
}: { 
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const getMoodColor = (mood: number) => {
    if (mood >= 3) return 'text-green-500'
    if (mood >= 1) return 'text-blue-500'
    if (mood >= -1) return 'text-gray-500'
    if (mood >= -3) return 'text-orange-500'
    return 'text-red-500'
  }

  const getMoodEmoji = (mood: number) => {
    if (mood >= 4) return '😄'
    if (mood >= 2) return '😊'
    if (mood >= 0) return '😐'
    if (mood >= -2) return '😔'
    return '😞'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Humeur du jour</span>
        <span className={`text-2xl ${getMoodColor(value)}`}>
          {getMoodEmoji(value)} {value > 0 ? '+' : ''}{value}
        </span>
      </div>
      <input
        type="range"
        min="-5"
        max="5"
        step="1"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>-5</span>
        <span>0</span>
        <span>+5</span>
      </div>
    </div>
  )
}

// Composant Task Quick Add
function TaskQuickAdd({ onTaskAdded }: { onTaskAdded: () => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TaskCategory | null>(null)
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [isAdding, setIsAdding] = useState(false)

  const loadCategories = async () => {
    const allCategories = await PokerMindService.getTaskCategories()
    setCategories(allCategories)
    if (allCategories.length > 0) {
      setCategory(allCategories[0])
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !category) return

    setIsAdding(true)
    try {
      await PokerMindService.createTask({
        title: title.trim(),
        category,
        priority: 'medium',
        status: 'todo',
        createdAt: new Date()
      })
      setTitle('')
      onTaskAdded()
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nouvelle tâche..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={category?.id || ''}
          onChange={(e) => {
            const selectedCategory = categories.find(c => c.id === e.target.value)
            if (selectedCategory) setCategory(selectedCategory)
          }}
          className="px-3 py-2 border border-border rounded-md"
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={!title.trim() || !category || isAdding} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Ajouter
      </Button>
    </form>
  )
}

// Composant Today's Tasks
function TodayTasks({ tasks, onTaskUpdate }: { 
  tasks: Task[]
  onTaskUpdate: () => void 
}) {
  const handleStatusChange = async (taskId: string, newStatus: 'todo' | 'inprogress' | 'done') => {
    await PokerMindService.updateTask(taskId, { status: newStatus })
    onTaskUpdate()
  }


  const getCategoryColor = (category: TaskCategory) => {
    return {
      backgroundColor: `${category.color}20`,
      color: category.color
    }
  }

  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <div
          key={task.id}
          className="flex items-center justify-between p-3 border border-border rounded-lg"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </span>
              <Badge style={getCategoryColor(task.category)}>
                {task.category.name}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={task.status === 'todo' ? 'default' : 'outline'}
              onClick={() => handleStatusChange(task.id, 'todo')}
              className="px-2 py-1 h-auto"
            >
              À faire
            </Button>
            <Button
              size="sm"
              variant={task.status === 'inprogress' ? 'default' : 'outline'}
              onClick={() => handleStatusChange(task.id, 'inprogress')}
              className="px-2 py-1 h-auto"
            >
              En cours
            </Button>
            <Button
              size="sm"
              variant={task.status === 'done' ? 'default' : 'outline'}
              onClick={() => handleStatusChange(task.id, 'done')}
              className="px-2 py-1 h-auto"
            >
              ✓
            </Button>
          </div>
        </div>
      ))}
      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Aucune tâche pour aujourd'hui
        </div>
      )}
    </div>
  )
}

// Composant Today's Habits
function TodayHabits({ habits, onHabitUpdate }: { 
  habits: Habit[]
  onHabitUpdate: () => void 
}) {
  const handleStatusChange = async (habitId: string, newStatus: '✅' | '❌' | '⚠️') => {
    await PokerMindService.updateHabit(habitId, { todayStatus: newStatus })
    
    // Enregistrer la complétion
    await PokerMindService.recordHabitCompletion({
      habitId,
      date: new Date(),
      status: newStatus,
      comment: ''
    })
    
    onHabitUpdate()
  }

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Quotidien'
      case '3x/week': return '3x/semaine'
      case 'weekly': return 'Hebdomadaire'
      default: return frequency
    }
  }

  return (
    <div className="space-y-3">
      {habits.map(habit => (
        <div
          key={habit.id}
          className="p-3 border border-border rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{habit.name}</span>
                {habit.isHardcore && (
                  <Badge variant="destructive" className="text-xs">
                    Hardcore
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {getFrequencyText(habit.frequency)} • Streak: {habit.currentStreak} (Max: {habit.maxStreak})
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={habit.todayStatus === '✅' ? 'default' : 'outline'}
                onClick={() => handleStatusChange(habit.id, '✅')}
                className="px-2 py-1 h-auto text-green-600"
              >
                ✅
              </Button>
              <Button
                size="sm"
                variant={habit.todayStatus === '⚠️' ? 'default' : 'outline'}
                onClick={() => handleStatusChange(habit.id, '⚠️')}
                className="px-2 py-1 h-auto text-orange-600"
              >
                ⚠️
              </Button>
              <Button
                size="sm"
                variant={habit.todayStatus === '❌' ? 'default' : 'outline'}
                onClick={() => handleStatusChange(habit.id, '❌')}
                className="px-2 py-1 h-auto text-red-600"
              >
                ❌
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={habit.completionRate} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground">
              {habit.completionRate.toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
      {habits.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Aucune habitude configurée
        </div>
      )}
    </div>
  )
}

// Composant principal Dashboard
export default function PokerMindDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [currentMood, setCurrentMood] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      await PokerMindService.initializeSampleData()
      
      const [dashboardStats, allTasks, allHabits] = await Promise.all([
        PokerMindService.getDashboardStats(),
        PokerMindService.getTasks(),
        PokerMindService.getHabits()
      ])

      setStats(dashboardStats)
      setCurrentMood(dashboardStats.currentMood)
      
      // Filtrer les tâches du jour
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTasks = allTasks.filter(t => {
        const taskDate = new Date(t.createdAt)
        taskDate.setHours(0, 0, 0, 0)
        return taskDate.getTime() === today.getTime()
      })
      
      setTasks(todayTasks)
      setHabits(allHabits)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleMoodChange = async (newMood: number) => {
    setCurrentMood(newMood)
    // En production, on sauvegarderait dans une entrée de journal
    await PokerMindService.createJournalEntry({
      date: new Date(),
      content: `Humeur mise à jour: ${newMood}`,
      mood: newMood,
      tags: []
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p>Chargement du dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">PokerMind+</h1>
                <p className="text-sm text-muted-foreground">
                  Dashboard Mental & Performance
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle entrée
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.tasksCompleted || 0}/{stats?.tasksTotal || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Tâches du jour</p>
                </div>
              </div>
              <Progress 
                value={stats?.tasksTotal ? (stats.tasksCompleted / stats.tasksTotal) * 100 : 0} 
                className="mt-2 h-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.habitsCompleted || 0}/{stats?.habitsTotal || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Habitudes</p>
                </div>
              </div>
              <Progress 
                value={stats?.habitsTotal ? (stats.habitsCompleted / stats.habitsTotal) * 100 : 0} 
                className="mt-2 h-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.currentMood ? (stats.currentMood > 0 ? '+' : '') + stats.currentMood : '0'}
                  </p>
                  <p className="text-sm text-muted-foreground">Humeur actuelle</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.averageMood ? (stats.averageMood > 0 ? '+' : '') + stats.averageMood.toFixed(1) : '0'}
                  </p>
                  <p className="text-sm text-muted-foreground">Moyenne 7j</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tâches du jour */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Tâches du jour
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TaskQuickAdd onTaskAdded={loadData} />
              <TodayTasks tasks={tasks} onTaskUpdate={loadData} />
            </CardContent>
          </Card>

          {/* Humeur + Boutons rapides */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Humeur & Mental</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MoodSlider 
                  value={currentMood} 
                  onChange={handleMoodChange} 
                />
                <Button className="w-full">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Écrire journal du jour
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accès rapide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/pokermind/tasks">
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="h-4 w-4 mr-2" />
                    Task Manager
                  </Button>
                </Link>
                <Link href="/pokermind/habits">
                  <Button variant="outline" className="w-full justify-start">
                    <Timer className="h-4 w-4 mr-2" />
                    Habit Tracker
                  </Button>
                </Link>
                <Link href="/pokermind/goals">
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="h-4 w-4 mr-2" />
                    Objectifs SMART
                  </Button>
                </Link>
                <Link href="/pokermind/journal">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Journal Mental
                  </Button>
                </Link>
                <Link href="/pokermind/leaks">
                  <Button variant="outline" className="w-full justify-start">
                    <Brain className="h-4 w-4 mr-2" />
                    Mental Leaks
                  </Button>
                </Link>
                <Link href="/pokermind/reviews">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Session Review
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Habitudes du jour */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Habitudes du jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TodayHabits habits={habits} onHabitUpdate={loadData} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}