'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Circle, 
  Calendar, 
  TrendingUp, 
  Edit3,
  Target,
  Clock,
  Smile,
  Frown,
  Meh
} from 'lucide-react'
import { DashboardStats, MoodValue } from '@/types/mind'

export function DashboardPokerMind() {
  const [mood, setMood] = useState<MoodValue>(0)
  const [stats, setStats] = useState<DashboardStats>({
    tasks_completed: 0,
    tasks_total: 0,
    habits_completed: 0,
    habits_total: 0,
    weekly_completion_rate: 0
  })

  // Mock data pour l'exemple
  const todayTasks = [
    { id: '1', title: 'Analyser 20 mains de la session hier', category: 'Review', completed: true },
    { id: '2', title: 'Session de 2h multi-table', category: 'Grind', completed: false },
    { id: '3', title: 'Méditation 15 minutes', category: 'Mental', completed: true },
    { id: '4', title: 'Étudier les ranges UTG vs BB', category: 'Review', completed: false }
  ]

  const todayHabits = [
    { id: '1', name: 'Méditation matinale', streak: 12, completed: true },
    { id: '2', name: 'Review post-session', streak: 8, completed: false },
    { id: '3', name: 'Exercice physique', streak: 5, completed: true },
    { id: '4', name: 'Lecture poker 30min', streak: 3, completed: false }
  ]

  useEffect(() => {
    const completedTasks = todayTasks.filter(t => t.completed).length
    const completedHabits = todayHabits.filter(h => h.completed).length
    
    setStats({
      tasks_completed: completedTasks,
      tasks_total: todayTasks.length,
      habits_completed: completedHabits,
      habits_total: todayHabits.length,
      weekly_completion_rate: 75 // Mock data
    })
  }, [])

  const getMoodIcon = (moodValue: number) => {
    if (moodValue >= 2) return <Smile className="h-5 w-5 text-green-500" />
    if (moodValue <= -2) return <Frown className="h-5 w-5 text-red-500" />
    return <Meh className="h-5 w-5 text-yellow-500" />
  }

  const getMoodColor = (moodValue: number) => {
    if (moodValue >= 2) return 'text-green-600'
    if (moodValue <= -2) return 'text-red-600'
    return 'text-yellow-600'
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Grind': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Mental': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'Review': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header avec date */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard PokerMind+</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Edit3 className="h-4 w-4" />
          Écrire journal du jour
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches du jour</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.tasks_completed}/{stats.tasks_total}
            </div>
            <Progress 
              value={(stats.tasks_completed / Math.max(stats.tasks_total, 1)) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Habitudes</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.habits_completed}/{stats.habits_total}
            </div>
            <Progress 
              value={(stats.habits_completed / Math.max(stats.habits_total, 1)) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion hebdo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekly_completion_rate}%</div>
            <Progress value={stats.weekly_completion_rate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tâches du jour */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tâches du jour
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {task.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className={getCategoryColor(task.category)}>
                  {task.category}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Mood et Habitudes */}
        <div className="space-y-4">
          {/* Mood Slider */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getMoodIcon(mood)}
                Humeur du jour
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>-5</span>
                  <span className={`font-medium ${getMoodColor(mood)}`}>
                    {mood > 0 ? '+' : ''}{mood}
                  </span>
                  <span>+5</span>
                </div>
                <Slider
                  value={[mood + 5]}
                  onValueChange={([value]) => setMood((value - 5) as MoodValue)}
                  max={10}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Habitudes rapides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Habitudes du jour
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayHabits.map((habit) => (
                <div key={habit.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {habit.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={`text-sm ${habit.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {habit.name}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    🔥 {habit.streak}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}