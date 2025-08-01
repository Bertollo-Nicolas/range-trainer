'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Target, 
  Calendar, 
  TrendingUp, 
  CheckSquare,
  ExternalLink
} from 'lucide-react'
import { Goal } from '@/types/mind'

const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Atteindre NL100 avec un bankroll de 3000€',
    description: 'Objectif principal pour 2024 : monter de stakes en gérant ma bankroll',
    deadline: '2024-12-31',
    progress: 45,
    category: 'Grind',
    is_smart: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-10'
  },
  {
    id: '2',
    title: 'Améliorer le winrate à 4bb/100 sur NL50',
    description: 'Réduire les leaks et optimiser le jeu post-flop',
    deadline: '2024-06-30',
    progress: 78,
    category: 'Performance',
    is_smart: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-10'
  },
  {
    id: '3',
    title: 'Établir une routine mentale solide',
    description: 'Méditation quotidienne et gestion du tilt',
    progress: 60,
    category: 'Mental',
    is_smart: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-10'
  }
]

export function SmartGoals() {
  const [goals] = useState<Goal[]>(mockGoals)


  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null
    const now = new Date()
    const end = new Date(deadline)
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getDeadlineStatus = (deadline?: string) => {
    const days = getDaysRemaining(deadline)
    if (!days) return null
    
    if (days < 0) return { color: 'text-red-600', text: 'Dépassé' }
    if (days <= 7) return { color: 'text-red-600', text: `${days}j restants` }
    if (days <= 30) return { color: 'text-yellow-600', text: `${days}j restants` }
    return { color: 'text-green-600', text: `${days}j restants` }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Grind': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Performance': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Mental': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Objectifs SMART</h1>
          <p className="text-muted-foreground">
            Définissez et suivez vos objectifs Spécifiques, Mesurables, Atteignables, Réalistes et Temporels
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvel objectif
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const deadlineStatus = getDeadlineStatus(goal.deadline)
          
          return (
            <Card key={goal.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-lg leading-tight">{goal.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {goal.is_smart && (
                      <Badge variant="default" className="bg-green-600">
                        SMART
                      </Badge>
                    )}
                    <Badge variant="secondary" className={getCategoryColor(goal.category)}>
                      {goal.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progression */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progression</span>
                    <span className="text-sm font-bold">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>

                {/* Deadline */}
                {goal.deadline && deadlineStatus && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>Échéance:</span>
                      <span>{new Date(goal.deadline).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <span className={`text-sm font-medium ${deadlineStatus.color}`}>
                      {deadlineStatus.text}
                    </span>
                  </div>
                )}

                {/* Actions et liens */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckSquare className="h-4 w-4" />
                    <span>3 tâches liées</span>
                    <Target className="h-4 w-4 ml-2" />
                    <span>2 habitudes</span>
                  </div>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Voir détails
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Vue d'ensemble */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Vue d'ensemble
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold">{goals.length}</div>
              <div className="text-sm text-muted-foreground">Objectifs actifs</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {goals.filter(g => g.is_smart).length}
              </div>
              <div className="text-sm text-muted-foreground">Objectifs SMART</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {Math.round(goals.reduce((acc, goal) => acc + goal.progress, 0) / goals.length)}%
              </div>
              <div className="text-sm text-muted-foreground">Progression moyenne</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guide SMART */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Qu'est-ce qu'un objectif SMART ?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
            <div className="space-y-1">
              <div className="font-semibold text-primary">S - Spécifique</div>
              <div className="text-muted-foreground">Objectif clair et précis</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-primary">M - Mesurable</div>
              <div className="text-muted-foreground">Progrès quantifiable</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-primary">A - Atteignable</div>
              <div className="text-muted-foreground">Réaliste avec vos ressources</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-primary">R - Réaliste</div>
              <div className="text-muted-foreground">Pertinent pour vous</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-primary">T - Temporel</div>
              <div className="text-muted-foreground">Échéance définie</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}