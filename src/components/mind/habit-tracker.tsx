'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Plus, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  Clock
} from 'lucide-react'
import { Habit } from '@/types/mind'

const mockHabits: Habit[] = [
  {
    id: '1',
    name: 'Méditation matinale',
    description: '15 minutes de méditation au réveil',
    frequency: 'daily',
    current_streak: 12,
    max_streak: 18,
    completion_rate: 85,
    is_hardcore: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-10'
  },
  {
    id: '2',
    name: 'Review post-session',
    description: 'Analyser les erreurs après chaque session',
    frequency: '3x_week',
    current_streak: 8,
    max_streak: 15,
    completion_rate: 75,
    is_hardcore: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-10'
  },
  {
    id: '3',
    name: 'Exercice physique',
    description: '30 minutes d\'activité physique',
    frequency: 'daily',
    current_streak: 5,
    max_streak: 12,
    completion_rate: 60,
    is_hardcore: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-10'
  }
]

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>(mockHabits)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null)
  const [showFailDialog, setShowFailDialog] = useState(false)
  const [failComment, setFailComment] = useState('')


  const getTodayStatus = (_habitId: string) => {
    // Mock logic - en réalité, on ferait un appel API
    const random = Math.random()
    if (random > 0.7) return 'completed'
    if (random > 0.3) return 'failed'
    return null // pas encore fait aujourd'hui
  }

  const getFrequencyDisplay = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Quotidien'
      case '3x_week': return '3x/semaine'
      case 'weekly': return 'Hebdomadaire'
      default: return frequency
    }
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />
      case 'partial': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default: return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
    }
  }

  const handleMarkHabit = (habit: Habit, status: 'completed' | 'failed' | 'partial') => {
    if (status === 'failed' && habit.is_hardcore) {
      setSelectedHabit(habit)
      setShowFailDialog(true)
      return
    }

    // Mettre à jour l'habitude
    const newStreak = status === 'completed' ? habit.current_streak + 1 : 0
    const updatedHabit = {
      ...habit,
      current_streak: newStreak,
      max_streak: Math.max(habit.max_streak, newStreak)
    }

    setHabits(habits.map(h => h.id === habit.id ? updatedHabit : h))
  }

  const confirmFailure = () => {
    if (!selectedHabit) return

    const updatedHabit = {
      ...selectedHabit,
      current_streak: 0 // Reset en mode hardcore
    }

    setHabits(habits.map(h => h.id === selectedHabit.id ? updatedHabit : h))
    setShowFailDialog(false)
    setFailComment('')
    setSelectedHabit(null)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setSelectedDate(newDate)
  }

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay()

    const days = []
    
    // Jours vides au début
    for (let i = 0; i < startWeekday; i++) {
      days.push(null)
    }
    
    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getDayStatus = (_habit: Habit, date: Date | null) => {
    if (!date) return null
    // Mock logic - en réalité, on récupérerait les données de la base
    const random = Math.random()
    if (random > 0.8) return 'completed'
    if (random > 0.6) return 'failed'
    if (random > 0.4) return 'partial'
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Habit Tracker</h1>
          <p className="text-muted-foreground">Suivez vos habitudes pour améliorer votre jeu</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle habitude
        </Button>
      </div>

      {/* Liste des habitudes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {habits.map((habit) => {
          const todayStatus = getTodayStatus(habit.id)
          return (
            <Card key={habit.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {habit.name}
                      {habit.is_hardcore && (
                        <Badge variant="destructive" className="text-xs">
                          HARDCORE
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{habit.description}</p>
                  </div>
                  {getStatusIcon(todayStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {getFrequencyDisplay(habit.frequency)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {habit.completion_rate}% réussite
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Flame className="h-4 w-4 text-orange-500" />
                        {habit.current_streak}
                      </div>
                      <div className="text-xs text-muted-foreground">Actuelle</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{habit.max_streak}</div>
                      <div className="text-xs text-muted-foreground">Record</div>
                    </div>
                  </div>
                </div>

                {!todayStatus && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleMarkHabit(habit, 'completed')}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Fait
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkHabit(habit, 'partial')}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Partiel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleMarkHabit(habit, 'failed')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Raté
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Vue calendrier mensuel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Vue calendrier
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-32 text-center">
                {selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {habits.map((habit) => (
            <div key={habit.id} className="mb-6 last:mb-0">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                {habit.name}
                {habit.is_hardcore && (
                  <Badge variant="destructive" className="text-xs">HARDCORE</Badge>
                )}
              </h4>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                  <div key={day} className="text-center text-xs font-medium p-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((date, index) => {
                  const status = getDayStatus(habit, date)
                  return (
                    <div
                      key={index}
                      className={`
                        aspect-square rounded-sm border flex items-center justify-center text-xs
                        ${!date ? 'border-transparent' : 'border-border'}
                        ${status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' : ''}
                        ${status === 'failed' ? 'bg-red-100 text-red-800 border-red-300' : ''}
                        ${status === 'partial' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                      `}
                    >
                      {date?.getDate()}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dialog de confirmation pour échec hardcore */}
      <Dialog open={showFailDialog} onOpenChange={setShowFailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirmer l'échec (Mode Hardcore)</DialogTitle>
            <DialogDescription>
              Cette habitude est en mode hardcore. Un échec réinitialisera votre streak à 0.
              Veuillez expliquer pourquoi vous avez échoué aujourd'hui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Expliquez les raisons de l'échec..."
              value={failComment}
              onChange={(e) => setFailComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFailDialog(false)}>
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmFailure}
                disabled={!failComment.trim()}
              >
                Confirmer l'échec
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}