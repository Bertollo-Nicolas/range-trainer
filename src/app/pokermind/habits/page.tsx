'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, ArrowLeft, Timer, ChevronLeft, ChevronRight, 
  Target, Calendar as CalendarIcon, TrendingUp, Award,
  Clock, BarChart3, Minus
} from 'lucide-react'
import { PokerMindService } from '@/lib/services/pokermind-service'
import { Habit, HabitFrequency, HabitStatus, HabitCompletion, HabitCategory, HabitType } from '@/types/pokermind'
import Link from 'next/link'

// Composant Calendar pour afficher les complétions
function HabitCalendar({ 
  habit, 
  completions 
}: { 
  habit: Habit
  completions: HabitCompletion[]
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek }
  }

  const getCompletionForDate = (date: Date) => {
    const dateString = date.toDateString()
    return completions.find(c => 
      c.habitId === habit.id && 
      new Date(c.date).toDateString() === dateString
    )
  }

  const getStatusColor = (status: HabitStatus) => {
    switch (status) {
      case '✅': return 'bg-green-500'
      case '⚠️': return 'bg-orange-500'
      case '❌': return 'bg-red-500'
      default: return 'bg-gray-200'
    }
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const days = []
  
  // Jours vides au début
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-8"></div>)
  }
  
  // Jours du mois
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const completion = getCompletionForDate(date)
    const isToday = date.toDateString() === new Date().toDateString()
    
    days.push(
      <div key={day} className="relative">
        <div className={`
          h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium
          ${isToday ? 'ring-2 ring-primary' : ''}
          ${completion ? getStatusColor(completion.status) + ' text-white' : 'hover:bg-gray-100'}
        `}>
          {day}
        </div>
      </div>
    )
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigateMonth('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-medium capitalize">{monthName}</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigateMonth('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['D', 'L', 'Ma', 'Me', 'J', 'V', 'S'].map((day, index) => (
          <div key={`day-${index}`} className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
      
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Réussi</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Partiel</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Échec</span>
        </div>
      </div>
    </div>
  )
}

// Composant pour la saisie des valeurs quantifiées
function QuantifiedInput({ 
  habit, 
  onSubmit 
}: { 
  habit: Habit
  onSubmit: (habitId: string, value: number, duration?: number) => void
}) {
  const [value, setValue] = useState('')
  const [duration, setDuration] = useState('')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numValue = parseFloat(value)
    const numDuration = duration ? parseFloat(duration) : undefined
    
    if (!isNaN(numValue)) {
      onSubmit(habit.id, numValue, numDuration)
      setValue('')
      setDuration('')
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {habit.type === 'quantified' && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`${habit.targetValue || 0} ${habit.targetUnit || 'unités'}`}
            className="text-sm"
            min="0"
            step="0.1"
          />
          <span className="text-xs text-muted-foreground">{habit.targetUnit}</span>
        </div>
      )}
      
      {habit.type === 'duration' && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder={`${habit.targetDuration || 0} min`}
            className="text-sm"
            min="0"
            step="1"
          />
          <span className="text-xs text-muted-foreground">minutes</span>
        </div>
      )}
      
      <Button type="submit" size="sm" className="w-full">
        Valider
      </Button>
    </form>
  )
}

// Composant HabitCard
function HabitCard({ 
  habit, 
  completions, 
  onStatusChange, 
  onQuantifiedSubmit,
  onEdit 
}: { 
  habit: Habit
  completions: HabitCompletion[]
  onStatusChange: (habitId: string, status: HabitStatus) => void
  onQuantifiedSubmit: (habitId: string, value: number, duration?: number) => void
  onEdit: (habit: Habit) => void
}) {
  const getFrequencyText = (frequency: HabitFrequency) => {
    switch (frequency) {
      case 'daily': return 'Quotidien'
      case '3x/week': return '3x/semaine'
      case 'weekly': return 'Hebdomadaire'
      default: return frequency
    }
  }

  const getHabitTypeIcon = (type: HabitType) => {
    switch (type) {
      case 'quantified': return <BarChart3 className="h-4 w-4" />
      case 'duration': return <Clock className="h-4 w-4" />
      case 'negative': return <Minus className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getHabitTypeText = (type: HabitType) => {
    switch (type) {
      case 'quantified': return 'Quantifiée'
      case 'duration': return 'Durée'
      case 'negative': return 'À éviter'
      default: return 'Simple'
    }
  }

  const getCategoryDisplay = (category?: HabitCategory) => {
    if (!category) {
      return {
        name: 'Non catégorisé',
        color: '#6b7280',
        bgColor: '#6b728020'
      }
    }
    return {
      name: category.name,
      color: category.color,
      bgColor: `${category.color}4D`
    }
  }

  // Calculer le progrès pour les habitudes quantifiées
  const getTodayProgress = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayCompletion = completions.find(c => 
      new Date(c.date).getTime() === today.getTime()
    )
    
    if (!todayCompletion) return null
    
    if (habit.type === 'quantified' && habit.targetValue && todayCompletion.value) {
      return {
        current: todayCompletion.value,
        target: habit.targetValue,
        percentage: Math.min((todayCompletion.value / habit.targetValue) * 100, 100),
        unit: habit.targetUnit || 'unités'
      }
    }
    
    if (habit.type === 'duration' && habit.targetDuration && todayCompletion.duration) {
      return {
        current: todayCompletion.duration,
        target: habit.targetDuration,
        percentage: Math.min((todayCompletion.duration / habit.targetDuration) * 100, 100),
        unit: 'min'
      }
    }
    
    return null
  }

  const todayProgress = getTodayProgress()

  // Vérifier si l'habitude a déjà été marquée aujourd'hui
  const getTodayCompletion = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return completions.find(c => 
      c.habitId === habit.id && 
      new Date(c.date).getTime() === today.getTime()
    )
  }

  const todayCompletion = getTodayCompletion()
  const hasCompletedToday = todayCompletion !== undefined

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{habit.name}</CardTitle>
              {habit.isHardcore && (
                <Badge variant="destructive" className="text-xs">
                  Hardcore
                </Badge>
              )}
            </div>
            
            {/* Catégorie et type */}
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="px-2 py-1 rounded text-xs font-medium"
                style={{
                  color: getCategoryDisplay(habit.category).color,
                  backgroundColor: getCategoryDisplay(habit.category).bgColor
                }}
              >
                {getCategoryDisplay(habit.category).name}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getHabitTypeIcon(habit.type)}
                <span>{getHabitTypeText(habit.type)}</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {getFrequencyText(habit.frequency)}
              {habit.type === 'quantified' && habit.targetValue && (
                <span> • {habit.targetValue} {habit.targetUnit}</span>
              )}
              {habit.type === 'duration' && habit.targetDuration && (
                <span> • {habit.targetDuration} minutes</span>
              )}
            </p>
            
            {habit.description && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                {habit.description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(habit)}>
            Modifier
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{habit.currentStreak}</div>
            <div className="text-xs text-muted-foreground">Streak actuel</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{habit.maxStreak}</div>
            <div className="text-xs text-muted-foreground">Record</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{habit.completionRate.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Réussite</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={habit.completionRate} className="h-2" />
        </div>
        
        {/* Progrès du jour pour habitudes quantifiées/durée */}
        {todayProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progrès aujourd'hui:</span>
              <span className="font-medium">
                {todayProgress.current} / {todayProgress.target} {todayProgress.unit}
              </span>
            </div>
            <Progress value={todayProgress.percentage} className="h-2" />
          </div>
        )}

        {/* Actions du jour */}
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-sm font-medium block mb-3">
              {habit.type === 'negative' ? 'Aujourd\'hui, as-tu évité ?' : 'Aujourd\'hui'}
            </span>
            
            {hasCompletedToday ? (
              /* Déjà fait aujourd'hui */
              <div className="space-y-2">
                <div className={`p-3 rounded-lg border-2 ${
                  todayCompletion?.status === '✅' ? 'bg-green-50 border-green-200' :
                  todayCompletion?.status === '⚠️' ? 'bg-orange-50 border-orange-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="text-lg font-medium">
                    {todayCompletion?.status === '✅' ? 
                      (habit.type === 'negative' ? '✅ Évité avec succès !' : '✅ Fait !') :
                      todayCompletion?.status === '⚠️' ? '⚠️ Partiellement fait' :
                      (habit.type === 'negative' ? '❌ Pas évité' : '❌ Pas fait')
                    }
                  </div>
                  {todayProgress && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {todayProgress.current} / {todayProgress.target} {todayProgress.unit}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={() => onStatusChange(habit.id, '❌')} 
                  variant="outline" 
                  size="sm"
                  className="text-orange-600 hover:text-orange-700"
                >
                  Modifier
                </Button>
              </div>
            ) : (
              /* Pas encore fait aujourd'hui */
              <div className="space-y-3">
                {/* Saisie pour habitudes quantifiées/durée AVANT les boutons */}
                {(habit.type === 'quantified' || habit.type === 'duration') && (
                  <QuantifiedInput habit={habit} onSubmit={onQuantifiedSubmit} />
                )}
                
                {/* Boutons d'action plus gros */}
                {habit.type === 'positive' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => onStatusChange(habit.id, '✅')}
                      className="h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
                    >
                      ✅ Fait
                    </Button>
                    <Button
                      onClick={() => onStatusChange(habit.id, '❌')}
                      variant="outline"
                      className="h-12 border-red-200 text-red-600 hover:bg-red-50 font-medium"
                    >
                      ❌ Pas fait
                    </Button>
                  </div>
                )}
                
                {habit.type === 'negative' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => onStatusChange(habit.id, '✅')}
                      className="h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
                    >
                      ✅ Évité
                    </Button>
                    <Button
                      onClick={() => onStatusChange(habit.id, '❌')}
                      variant="outline"
                      className="h-12 border-red-200 text-red-600 hover:bg-red-50 font-medium"
                    >
                      ❌ Pas évité
                    </Button>
                  </div>
                )}
                
                {(habit.type === 'quantified' || habit.type === 'duration') && (
                  <div className="text-xs text-muted-foreground">
                    Saisissez votre {habit.type === 'quantified' ? 'valeur' : 'durée'} ci-dessus puis l'évaluation se fera automatiquement
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Calendrier */}
        <HabitCalendar habit={habit} completions={completions} />
      </CardContent>
    </Card>
  )
}

// Dialog pour créer/éditer une habitude
function HabitDialog({ 
  habit, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  habit?: Habit
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(habit?.name || '')
  const [description, setDescription] = useState(habit?.description || '')
  const [category, setCategory] = useState<HabitCategory | null>(habit?.category || null)
  const [type, setType] = useState<HabitType>(habit?.type || 'positive')
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency || 'daily')
  const [isHardcore, setIsHardcore] = useState(habit?.isHardcore || false)
  const [targetValue, setTargetValue] = useState(habit?.targetValue?.toString() || '')
  const [targetUnit, setTargetUnit] = useState(habit?.targetUnit || '')
  const [targetDuration, setTargetDuration] = useState(habit?.targetDuration?.toString() || '')
  const [categories, setCategories] = useState<HabitCategory[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const loadCategories = async () => {
    const allCategories = await PokerMindService.getHabitCategories()
    setCategories(allCategories)
    if (!category && allCategories.length > 0) {
      setCategory(allCategories[0])
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (habit) {
      setName(habit.name)
      setDescription(habit.description || '')
      setCategory(habit.category || null)
      setType(habit.type)
      setFrequency(habit.frequency)
      setIsHardcore(habit.isHardcore)
      setTargetValue(habit.targetValue?.toString() || '')
      setTargetUnit(habit.targetUnit || '')
      setTargetDuration(habit.targetDuration?.toString() || '')
    } else {
      setName('')
      setDescription('')
      setType('positive')
      setFrequency('daily')
      setIsHardcore(false)
      setTargetValue('')
      setTargetUnit('')
      setTargetDuration('')
      if (categories.length > 0) {
        setCategory(categories[0])
      }
    }
  }, [habit, categories])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !category) return

    setIsSaving(true)
    try {
      const habitData: Partial<Habit> = {
        name: name.trim(),
        category,
        type,
        frequency,
        isHardcore
      }

      if (description.trim()) {
        habitData.description = description.trim()
      }

      if (type === 'quantified') {
        if (targetValue && targetUnit.trim()) {
          habitData.targetValue = parseFloat(targetValue)
          habitData.targetUnit = targetUnit.trim()
        }
      }

      if (type === 'duration') {
        if (targetDuration) {
          habitData.targetDuration = parseInt(targetDuration)
        }
      }

      if (habit) {
        await PokerMindService.updateHabit(habit.id, habitData)
      } else {
        await PokerMindService.createHabit({
          ...habitData,
          currentStreak: 0,
          maxStreak: 0,
          completionRate: 0,
          todayStatus: type === 'negative' ? '✅' : '❌', // Pour les habitudes négatives, on commence par "réussi" (évité)
          createdAt: new Date()
        } as Omit<Habit, 'id'>)
      }
      onSave()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {habit ? 'Modifier l\'habitude' : 'Nouvelle habitude'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nom</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de l'habitude..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description (optionnel)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de l'habitude..."
              rows={2}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Catégorie</label>
            <Select value={category?.id || ''} onValueChange={(value) => {
              const selectedCategory = categories.find(c => c.id === value)
              if (selectedCategory) setCategory(selectedCategory)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type d'habitude</label>
            <Select value={type} onValueChange={(value: HabitType) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">✅ Positive (à faire)</SelectItem>
                <SelectItem value="negative">🚫 Négative (à éviter)</SelectItem>
                <SelectItem value="quantified">📊 Quantifiée (avec objectif chiffré)</SelectItem>
                <SelectItem value="duration">⏱️ Durée (temps à consacrer)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Champs conditionnels selon le type */}
          {type === 'quantified' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Objectif</label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="Ex: 8"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Unité</label>
                <Input
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder="Ex: verres, pages, km..."
                />
              </div>
            </div>
          )}

          {type === 'duration' && (
            <div>
              <label className="block text-sm font-medium mb-2">Durée cible (minutes)</label>
              <Input
                type="number"
                value={targetDuration}
                onChange={(e) => setTargetDuration(e.target.value)}
                placeholder="Ex: 30"
                min="1"
                step="1"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2">Fréquence</label>
            <Select value={frequency} onValueChange={(value: HabitFrequency) => setFrequency(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="3x/week">3x par semaine</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hardcore"
              checked={isHardcore}
              onChange={(e) => setIsHardcore(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="hardcore" className="text-sm font-medium">
              Habitude Hardcore (échec = reset du streak)
            </label>
          </div>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim() || !category || isSaving}>
              {isSaving ? 'Sauvegarde...' : habit ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [isHabitDialogOpen, setIsHabitDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()

  const loadData = async () => {
    try {
      const [allHabits, allCompletions, categories] = await Promise.all([
        PokerMindService.getHabits(),
        PokerMindService.getHabitCompletions(),
        PokerMindService.getHabitCategories()
      ])
      
      // Assigner des catégories par défaut aux habitudes migrées
      let needsUpdate = false
      const updatedHabits = allHabits.map(habit => {
        if (!habit.category && categories.length > 0) {
          needsUpdate = true
          return {
            ...habit,
            category: categories[0] // Première catégorie disponible
          }
        }
        return habit
      })
      
      // Sauvegarder les habitudes mises à jour
      if (needsUpdate) {
        for (const habit of updatedHabits.filter(h => !allHabits.find(ah => ah.id === h.id)?.category)) {
          await PokerMindService.updateHabit(habit.id, { category: categories[0] })
        }
        // Recharger les données mises à jour
        const freshHabits = await PokerMindService.getHabits()
        setHabits(freshHabits)
      } else {
        setHabits(allHabits)
      }
      
      setCompletions(allCompletions)
    } catch (error) {
      console.error('Error loading habit data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStatusChange = async (habitId: string, newStatus: HabitStatus) => {
    // Vérifier s'il y a déjà une completion aujourd'hui
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const existingCompletion = completions.find(c => 
      c.habitId === habitId && 
      new Date(c.date).getTime() === today.getTime()
    )
    
    // Si le statut est '❌' et qu'il y a déjà une completion, on la supprime pour permettre une nouvelle saisie
    if (newStatus === '❌' && existingCompletion) {
      // On va juste mettre à jour le statut sans créer de nouvelle completion
      await PokerMindService.updateHabit(habitId, { todayStatus: newStatus })
      await loadData()
      return
    }
    
    // Si pas de completion existante, en créer une nouvelle
    if (!existingCompletion) {
      await PokerMindService.updateHabit(habitId, { todayStatus: newStatus })
      
      // Enregistrer la complétion
      await PokerMindService.recordHabitCompletion({
        habitId,
        date: new Date(),
        status: newStatus,
        comment: ''
      })
      
      await loadData()
    }
    // Si completion existe déjà et statut n'est pas '❌', ne rien faire (anti-spam)
  }

  const handleQuantifiedSubmit = async (habitId: string, value: number, duration?: number) => {
    const habit = habits.find(h => h.id === habitId)
    if (!habit) return

    // Vérifier s'il y a déjà une completion aujourd'hui
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const existingCompletion = completions.find(c => 
      c.habitId === habitId && 
      new Date(c.date).getTime() === today.getTime()
    )
    
    // Anti-spam : si déjà une completion aujourd'hui, ne pas permettre une nouvelle
    if (existingCompletion) {
      return
    }

    let status: HabitStatus = '⚠️' // Par défaut partiel

    // Déterminer le statut selon le type et la valeur atteinte
    if (habit.type === 'quantified' && habit.targetValue) {
      if (value >= habit.targetValue) status = '✅'
      else if (value >= habit.targetValue * 0.7) status = '⚠️'
      else status = '❌'
    }

    if (habit.type === 'duration' && habit.targetDuration && duration) {
      if (duration >= habit.targetDuration) status = '✅'
      else if (duration >= habit.targetDuration * 0.7) status = '⚠️'
      else status = '❌'
    }

    // Mettre à jour le statut de l'habitude
    await PokerMindService.updateHabit(habitId, { todayStatus: status })
    
    // Enregistrer la complétion avec les valeurs
    const completionData: Omit<HabitCompletion, 'id'> = {
      habitId,
      date: new Date(),
      status,
      comment: ''
    }
    
    if (habit.type === 'quantified' && value !== undefined) {
      completionData.value = value
    }
    
    if (habit.type === 'duration' && duration !== undefined) {
      completionData.duration = duration
    }
    
    await PokerMindService.recordHabitCompletion(completionData)
    
    await loadData()
  }

  const handleHabitSave = () => {
    loadData()
    setEditingHabit(undefined)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Timer className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p>Chargement des habitudes...</p>
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
                <Timer className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Habit Tracker</h1>
                  <p className="text-sm text-muted-foreground">
                    Suivez vos habitudes et construisez des streaks
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => setIsHabitDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle habitude
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
                <Target className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {habits.filter(h => h.todayStatus === '✅').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Réussies aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {Math.max(...habits.map(h => h.currentStreak), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Meilleur streak actuel</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {habits.length > 0 ? Math.round(habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Taux moyen</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{habits.length}</p>
                  <p className="text-sm text-muted-foreground">Habitudes actives</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Habits Grid */}
        {habits.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completions={completions.filter(c => c.habitId === habit.id)}
                onStatusChange={handleStatusChange}
                onQuantifiedSubmit={handleQuantifiedSubmit}
                onEdit={(habit) => {
                  setEditingHabit(habit)
                  setIsHabitDialogOpen(true)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Timer className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune habitude</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par créer votre première habitude
            </p>
            <Button onClick={() => setIsHabitDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une habitude
            </Button>
          </div>
        )}
      </div>

      {/* Habit Dialog */}
      <HabitDialog
        {...(editingHabit && { habit: editingHabit })}
        isOpen={isHabitDialogOpen}
        onClose={() => {
          setIsHabitDialogOpen(false)
          setEditingHabit(undefined)
        }}
        onSave={handleHabitSave}
      />
    </div>
  )
}