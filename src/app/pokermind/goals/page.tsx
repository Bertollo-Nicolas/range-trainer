'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, ArrowLeft, Target, CheckCircle, 
  Clock, TrendingUp, AlertCircle, Link as LinkIcon 
} from 'lucide-react'
import { PokerMindService } from '@/lib/services/pokermind-service'
import { Goal, Task, Habit } from '@/types/pokermind'
import Link from 'next/link'

// Composant GoalCard
function GoalCard({ 
  goal, 
  linkedTasks, 
  linkedHabits, 
  onEdit, 
  onUpdateProgress 
}: { 
  goal: Goal
  linkedTasks: Task[]
  linkedHabits: Habit[]
  onEdit: (goal: Goal) => void
  onUpdateProgress: (goalId: string, progress: number) => void
}) {
  const [newProgress, setNewProgress] = useState(goal.progress)
  
  const daysUntilDeadline = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysUntilDeadline < 0
  const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline >= 0
  
  const completedTasks = linkedTasks.filter(t => t.status === 'done').length
  const taskProgress = linkedTasks.length > 0 ? (completedTasks / linkedTasks.length) * 100 : 0
  
  const avgHabitRate = linkedHabits.length > 0 
    ? linkedHabits.reduce((sum, h) => sum + h.completionRate, 0) / linkedHabits.length 
    : 0

  const handleProgressUpdate = () => {
    if (newProgress !== goal.progress) {
      onUpdateProgress(goal.id, newProgress)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{goal.title}</CardTitle>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  En retard
                </Badge>
              )}
              {isUrgent && !isOverdue && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                  Urgent
                </Badge>
              )}
              {goal.progress === 100 && (
                <Badge className="text-xs bg-green-500">
                  Terminé
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Échéance: {new Date(goal.deadline).toLocaleDateString('fr-FR')}
              {daysUntilDeadline >= 0 && ` (${daysUntilDeadline} jours)`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(goal)}>
            Modifier
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Description */}
        {goal.description && (
          <p className="text-sm text-muted-foreground">{goal.description}</p>
        )}
        
        {/* Progress Manual */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progression manuelle</span>
            <span className="text-sm font-medium">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="h-2" />
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={newProgress}
              onChange={(e) => setNewProgress(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <Button 
              size="sm" 
              onClick={handleProgressUpdate}
              disabled={newProgress === goal.progress}
            >
              Mettre à jour
            </Button>
          </div>
        </div>
        
        {/* Statistiques automatiques */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{taskProgress.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">
              Tâches ({completedTasks}/{linkedTasks.length})
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{avgHabitRate.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">
              Habitudes ({linkedHabits.length})
            </div>
          </div>
        </div>
        
        {/* Éléments liés */}
        {(linkedTasks.length > 0 || linkedHabits.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium">
              <LinkIcon className="h-4 w-4" />
              Éléments liés
            </div>
            <div className="space-y-1">
              {linkedTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`h-3 w-3 ${task.status === 'done' ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={task.status === 'done' ? 'line-through text-muted-foreground' : ''}>
                    {task.title}
                  </span>
                  <Badge variant="outline" className="text-xs">{task.category.icon} {task.category.name}</Badge>
                </div>
              ))}
              {linkedHabits.map(habit => (
                <div key={habit.id} className="flex items-center gap-2 text-sm">
                  <Target className="h-3 w-3 text-purple-500" />
                  <span>{habit.name}</span>
                  <Badge variant="outline" className="text-xs">{habit.completionRate.toFixed(0)}%</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Dialog pour créer/éditer un objectif
function GoalDialog({ 
  goal, 
  isOpen, 
  onClose, 
  onSave,
  availableTasks,
  availableHabits
}: { 
  goal?: Goal
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  availableTasks: Task[]
  availableHabits: Habit[]
}) {
  const [title, setTitle] = useState(goal?.title || '')
  const [description, setDescription] = useState(goal?.description || '')
  const [deadline, setDeadline] = useState(
    goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : ''
  )
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>(goal?.linkedTasks || [])
  const [linkedHabitIds, setLinkedHabitIds] = useState<string[]>(goal?.linkedHabits || [])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (goal) {
      setTitle(goal.title)
      setDescription(goal.description || '')
      setDeadline(new Date(goal.deadline).toISOString().split('T')[0])
      setLinkedTaskIds(goal.linkedTasks)
      setLinkedHabitIds(goal.linkedHabits)
    } else {
      setTitle('')
      setDescription('')
      setDeadline('')
      setLinkedTaskIds([])
      setLinkedHabitIds([])
    }
  }, [goal])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !deadline) return

    setIsSaving(true)
    try {
      if (goal) {
        await PokerMindService.updateGoal(goal.id, {
          title: title.trim(),
          ...(description.trim() && { description: description.trim() }),
          deadline: new Date(deadline),
          linkedTasks: linkedTaskIds,
          linkedHabits: linkedHabitIds
        })
      } else {
        await PokerMindService.createGoal({
          title: title.trim(),
          ...(description.trim() && { description: description.trim() }),
          deadline: new Date(deadline),
          progress: 0,
          linkedTasks: linkedTaskIds,
          linkedHabits: linkedHabitIds,
          createdAt: new Date()
        })
      }
      onSave()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const toggleTaskLink = (taskId: string) => {
    setLinkedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const toggleHabitLink = (habitId: string) => {
    setLinkedHabitIds(prev => 
      prev.includes(habitId) 
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {goal ? 'Modifier l\'objectif' : 'Nouvel objectif SMART'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Titre (Spécifique & Mesurable)
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Atteindre 500€ de profit mensuel en NL50"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Description (Atteignable & Réaliste)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez comment vous comptez atteindre cet objectif..."
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Échéance (Temporellement défini)
            </label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          
          {/* Liaison avec les tâches */}
          {availableTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Tâches liées
              </label>
              <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                {availableTasks.map(task => (
                  <label key={task.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={linkedTaskIds.includes(task.id)}
                      onChange={() => toggleTaskLink(task.id)}
                      className="rounded"
                    />
                    <span className="text-sm flex-1">{task.title}</span>
                    <Badge variant="outline" className="text-xs">{task.category.icon} {task.category.name}</Badge>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Liaison avec les habitudes */}
          {availableHabits.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Habitudes liées
              </label>
              <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                {availableHabits.map(habit => (
                  <label key={habit.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={linkedHabitIds.includes(habit.id)}
                      onChange={() => toggleHabitLink(habit.id)}
                      className="rounded"
                    />
                    <span className="text-sm flex-1">{habit.name}</span>
                    <Badge variant="outline" className="text-xs">{habit.frequency}</Badge>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!title.trim() || !deadline || isSaving}>
              {isSaving ? 'Sauvegarde...' : goal ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>()

  const loadData = async () => {
    try {
      const [allGoals, allTasks, allHabits] = await Promise.all([
        PokerMindService.getGoals(),
        PokerMindService.getTasks(),
        PokerMindService.getHabits()
      ])
      setGoals(allGoals)
      setTasks(allTasks)
      setHabits(allHabits)
    } catch (error) {
      console.error('Error loading goals data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGoalSave = () => {
    loadData()
    setEditingGoal(undefined)
  }

  const handleUpdateProgress = async (goalId: string, progress: number) => {
    await PokerMindService.updateGoal(goalId, { progress })
    await loadData()
  }

  const getLinkedTasks = (goal: Goal) => {
    return tasks.filter(t => goal.linkedTasks.includes(t.id))
  }

  const getLinkedHabits = (goal: Goal) => {
    return habits.filter(h => goal.linkedHabits.includes(h.id))
  }

  // Stats
  const completedGoals = goals.filter(g => g.progress === 100).length
  const urgentGoals = goals.filter(g => {
    const daysUntil = Math.ceil((new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil <= 7 && daysUntil >= 0 && g.progress < 100
  }).length
  const overdueGoals = goals.filter(g => {
    const daysUntil = Math.ceil((new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil < 0 && g.progress < 100
  }).length
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Target className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p>Chargement des objectifs...</p>
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
            <div className="flex items-center space-x-4">
              <Link href="/pokermind">
                <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground" />
              </Link>
              <div className="flex items-center space-x-3">
                <Target className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Objectifs SMART</h1>
                  <p className="text-sm text-muted-foreground">
                    Spécifiques • Mesurables • Atteignables • Réalistes • Temporellement définis
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => setIsGoalDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel objectif
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{completedGoals}</p>
                  <p className="text-sm text-muted-foreground">Terminés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{urgentGoals}</p>
                  <p className="text-sm text-muted-foreground">Urgents (≤7j)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{overdueGoals}</p>
                  <p className="text-sm text-muted-foreground">En retard</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{avgProgress}%</p>
                  <p className="text-sm text-muted-foreground">Progression moy.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals Grid */}
        {goals.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                linkedTasks={getLinkedTasks(goal)}
                linkedHabits={getLinkedHabits(goal)}
                onEdit={(goal) => {
                  setEditingGoal(goal)
                  setIsGoalDialogOpen(true)
                }}
                onUpdateProgress={handleUpdateProgress}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun objectif</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par définir votre premier objectif SMART
            </p>
            <Button onClick={() => setIsGoalDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un objectif
            </Button>
          </div>
        )}
      </div>

      {/* Goal Dialog */}
      <GoalDialog
        {...(editingGoal && { goal: editingGoal })}
        isOpen={isGoalDialogOpen}
        onClose={() => {
          setIsGoalDialogOpen(false)
          setEditingGoal(undefined)
        }}
        onSave={handleGoalSave}
        availableTasks={tasks}
        availableHabits={habits}
      />
    </div>
  )
}