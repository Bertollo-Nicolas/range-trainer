'use client'

import { useState, useEffect } from 'react'
import { AnkiTreeNode, WorkloadPrediction } from '@/types/anki'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Brain,
  Target,
  Zap
} from 'lucide-react'
import { AnkiService } from '@/lib/services/anki-service'

interface DeckPlanningProps {
  deck: AnkiTreeNode
  onClose: () => void
}

interface DeckPredictions {
  today: WorkloadPrediction
  nextWeek: WorkloadPrediction[]
  nextMonth: WorkloadPrediction[]
  heaviestDay: WorkloadPrediction
  lightestDay: WorkloadPrediction
}

export function DeckPlanning({ deck, onClose }: DeckPlanningProps) {
  const [predictions, setPredictions] = useState<DeckPredictions | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPredictions()
  }, [deck.id])

  const loadPredictions = async () => {
    try {
      setLoading(true)
      
      // Simuler les prédictions basées sur les données du deck
      const today = new Date()
      const predictions: DeckPredictions = {
        today: {
          date: today.toISOString().split('T')[0],
          predictedReviews: deck.dueCards,
          newCardsScheduled: Math.min(deck.newCards, deck.new_cards_per_day),
          estimatedTime: Math.round((deck.dueCards + Math.min(deck.newCards, deck.new_cards_per_day)) * 0.5)
        },
        nextWeek: [],
        nextMonth: [],
        heaviestDay: {
          date: '',
          predictedReviews: 0,
          newCardsScheduled: 0,
          estimatedTime: 0
        },
        lightestDay: {
          date: '',
          predictedReviews: 0,
          newCardsScheduled: 0,
          estimatedTime: 0
        }
      }

      // Générer les prédictions pour la semaine prochaine
      let maxWorkload = 0
      let minWorkload = Infinity
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i + 1)
        
        // Simulation basée sur l'algorithme SM-2
        const baseReviews = Math.max(0, deck.dueCards - i * 5)
        const randomVariation = Math.random() * 20 - 10
        const predictedReviews = Math.round(baseReviews + randomVariation)
        const newCards = Math.min(deck.newCards, deck.new_cards_per_day)
        const estimatedTime = Math.round((predictedReviews + newCards) * 0.5)
        
        const dayPrediction: WorkloadPrediction = {
          date: date.toISOString().split('T')[0],
          predictedReviews,
          newCardsScheduled: newCards,
          estimatedTime
        }
        
        predictions.nextWeek.push(dayPrediction)
        
        if (estimatedTime > maxWorkload) {
          maxWorkload = estimatedTime
          predictions.heaviestDay = dayPrediction
        }
        
        if (estimatedTime < minWorkload) {
          minWorkload = estimatedTime
          predictions.lightestDay = dayPrediction
        }
      }

      // Générer les prédictions pour le mois
      for (let i = 8; i < 30; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        
        const baseReviews = Math.max(0, Math.round(deck.dueCards * (1 - i * 0.02)))
        const predictedReviews = Math.round(baseReviews + (Math.random() * 30 - 15))
        const newCards = Math.min(deck.newCards, deck.new_cards_per_day)
        const estimatedTime = Math.round((predictedReviews + newCards) * 0.5)
        
        predictions.nextMonth.push({
          date: date.toISOString().split('T')[0],
          predictedReviews,
          newCardsScheduled: newCards,
          estimatedTime
        })
      }

      setPredictions(predictions)
    } catch (error) {
      console.error('Error loading predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const getWorkloadColor = (minutes: number) => {
    if (minutes < 15) return 'bg-green-100 text-green-800'
    if (minutes < 30) return 'bg-yellow-100 text-yellow-800'
    if (minutes < 60) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  const getWorkloadLevel = (minutes: number) => {
    if (minutes < 15) return 'Léger'
    if (minutes < 30) return 'Modéré'
    if (minutes < 60) return 'Intense'
    return 'Très intense'
  }

  const renderWeekView = () => {
    if (!predictions) return null

    return (
      <div className="space-y-4">
        <div className="grid gap-3">
          {/* Aujourd'hui */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Aujourd'hui</div>
                  <div className="text-sm text-muted-foreground">
                    {predictions.today.predictedReviews} révisions • {predictions.today.newCardsScheduled} nouvelles cartes
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getWorkloadColor(predictions.today.estimatedTime)}>
                    {predictions.today.estimatedTime} min
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {getWorkloadLevel(predictions.today.estimatedTime)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prochains jours */}
          {predictions.nextWeek.map((day, index) => (
            <Card key={day.date} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{formatDate(day.date)}</div>
                    <div className="text-sm text-muted-foreground">
                      {day.predictedReviews} révisions • {day.newCardsScheduled} nouvelles cartes
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getWorkloadColor(day.estimatedTime)}>
                      {day.estimatedTime} min
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getWorkloadLevel(day.estimatedTime)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    if (!predictions) return null

    const weeks: WorkloadPrediction[][] = []
    let currentWeek: WorkloadPrediction[] = []
    
    // Combiner semaine + mois
    const allDays = [...predictions.nextWeek, ...predictions.nextMonth]
    
    allDays.forEach((day, index) => {
      currentWeek.push(day)
      if ((index + 1) % 7 === 0 || index === allDays.length - 1) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })

    const maxTime = Math.max(...allDays.map(d => d.estimatedTime))

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Vue calendaire des 30 prochains jours
        </div>
        
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                const intensity = (day.estimatedTime / maxTime) * 100
                return (
                  <div
                    key={day.date}
                    className="aspect-square p-2 border rounded text-xs hover:shadow-md transition-shadow cursor-pointer"
                    style={{
                      backgroundColor: `hsl(${120 - (intensity * 1.2)}, 70%, ${90 - (intensity * 0.3)}%)`
                    }}
                    title={`${formatDate(day.date)}: ${day.estimatedTime} min`}
                  >
                    <div className="font-medium">{new Date(day.date).getDate()}</div>
                    <div className="text-xs opacity-75">{day.estimatedTime}m</div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Charge légère</span>
          <div className="flex gap-1">
            {[0, 25, 50, 75, 100].map(intensity => (
              <div 
                key={intensity}
                className="w-3 h-3 rounded-sm border"
                style={{
                  backgroundColor: `hsl(${120 - (intensity * 1.2)}, 70%, ${90 - (intensity * 0.3)}%)`
                }}
              />
            ))}
          </div>
          <span>Charge intense</span>
        </div>
      </div>
    )
  }

  if (loading || !predictions) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const weeklyTotal = predictions.nextWeek.reduce((sum, day) => sum + day.estimatedTime, 0)
  const avgDaily = Math.round(weeklyTotal / 7)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{deck.icon}</span>
              <div>
                <CardTitle className="text-2xl">{deck.name}</CardTitle>
                <p className="text-muted-foreground">Planification et prédictions</p>
              </div>
            </div>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Métriques de la semaine */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{avgDaily}min</div>
                <div className="text-sm text-muted-foreground">Moyenne/jour</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{predictions.heaviestDay.estimatedTime}min</div>
                <div className="text-sm text-muted-foreground">Jour le plus chargé</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{predictions.lightestDay.estimatedTime}min</div>
                <div className="text-sm text-muted-foreground">Jour le plus léger</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{Math.round(weeklyTotal / 60)}h</div>
                <div className="text-sm text-muted-foreground">Total semaine</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets pour les différentes vues */}
      <Tabs defaultValue="week" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="week">Vue semaine</TabsTrigger>
          <TabsTrigger value="month">Vue mois</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Prochains 7 jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderWeekView()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Vue mensuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderMonthView()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Recommandations intelligentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-800 dark:text-blue-200">
                        Configuration optimale suggérée
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Basé sur votre rythme actuel, nous recommandons{' '}
                        <strong>
                          {avgDaily > 45 ? Math.max(5, deck.new_cards_per_day - 5) : 
                           avgDaily < 15 ? deck.new_cards_per_day + 5 : deck.new_cards_per_day} nouvelles cartes par jour
                        </strong>
                        {avgDaily > 45 ? ' (réduction pour alléger la charge)' : 
                         avgDaily < 15 ? ' (augmentation pour progresser plus vite)' : ' (configuration actuelle optimale)'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200">
                        Meilleur planning de la semaine
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Le <strong>{formatDate(predictions.lightestDay.date)}</strong> sera votre jour le plus léger 
                        ({predictions.lightestDay.estimatedTime} min). Idéal pour étudier de nouvelles cartes !
                      </div>
                    </div>
                  </div>
                </div>

                {avgDaily > 45 && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-orange-800 dark:text-orange-200">
                          Attention à la surcharge
                        </div>
                        <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                          Votre charge quotidienne moyenne de {avgDaily} minutes peut conduire au burn-out. 
                          Considérez une pause ou réduisez temporairement le nombre de nouvelles cartes.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions rapides de planification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Actions rapides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <div className="text-lg">📈</div>
                    <div className="text-xs text-center">
                      <div className="font-medium">Augmenter</div>
                      <div className="text-muted-foreground">+5 cartes/jour</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <div className="text-lg">📉</div>
                    <div className="text-xs text-center">
                      <div className="font-medium">Réduire</div>
                      <div className="text-muted-foreground">-5 cartes/jour</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <div className="text-lg">🎯</div>
                    <div className="text-xs text-center">
                      <div className="font-medium">Optimiser</div>
                      <div className="text-muted-foreground">Configuration auto</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <div className="text-lg">⏸️</div>
                    <div className="text-xs text-center">
                      <div className="font-medium">Pause</div>
                      <div className="text-muted-foreground">Nouvelles cartes</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}