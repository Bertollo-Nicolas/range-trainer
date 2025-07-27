'use client'

import { useState, useEffect } from 'react'
import { AnkiTreeNode, HeatmapData, LearningCurvePoint } from '@/types/anki'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target,
  Calendar,
  Brain,
  Zap,
  Award
} from 'lucide-react'
import { AnkiService } from '@/lib/services/anki-service'

interface DeckStatisticsProps {
  deck: AnkiTreeNode
  onClose: () => void
}

interface DetailedStats {
  totalCards: number
  newCards: number
  learningCards: number
  reviewCards: number
  dueCards: number
  masteredCards: number
  averageEase: number
  retentionRate: number
  dailyStreak: number
  totalStudyTime: number
  cardsStudiedToday: number
  accuracyToday: number
}

export function DeckStatistics({ deck, onClose }: DeckStatisticsProps) {
  const [stats, setStats] = useState<DetailedStats | null>(null)
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([])
  const [learningCurve, setLearningCurve] = useState<LearningCurvePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatistics()
  }, [deck.id])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      
      // Charger les stats de base
      const basicStats = await AnkiService.getDeckStats(deck.id)
      
      // Charger la heatmap (90 derniers jours)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      const heatmap = await AnkiService.getHeatmapData(startDate, endDate)
      
      // Charger la courbe d'apprentissage (30 derniers jours)
      const curve = await AnkiService.getLearningCurve(deck.id, 30)
      
      // Calculer les stats détaillées
      const masteredCards = basicStats.totalCards - basicStats.newCards - basicStats.learningCards - basicStats.reviewCards
      const retentionRate = curve.length > 0 ? curve[curve.length - 1]?.retention || 0 : 0
      
      const detailedStats: DetailedStats = {
        ...basicStats,
        masteredCards,
        averageEase: curve.length > 0 ? curve[curve.length - 1]?.averageEase || 2.5 : 2.5,
        retentionRate,
        dailyStreak: calculateStreak(heatmap),
        totalStudyTime: calculateTotalStudyTime(heatmap),
        cardsStudiedToday: getTodayCount(heatmap),
        accuracyToday: retentionRate
      }
      
      setStats(detailedStats)
      setHeatmapData(heatmap)
      setLearningCurve(curve)
    } catch (error) {
      console.error('Error loading statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStreak = (heatmap: HeatmapData[]): number => {
    let streak = 0
    const sortedData = [...heatmap].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    for (const day of sortedData) {
      if (day.count > 0) {
        streak++
      } else {
        break
      }
    }
    
    return streak
  }

  const calculateTotalStudyTime = (heatmap: HeatmapData[]): number => {
    // Estimation: 30 secondes par carte en moyenne
    return heatmap.reduce((total, day) => total + (day.count * 30), 0)
  }

  const getTodayCount = (heatmap: HeatmapData[]): number => {
    const today = new Date().toISOString().split('T')[0]
    const todayData = heatmap.find(day => day.date === today)
    return todayData?.count || 0
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getIntensityColor = (level: number): string => {
    switch (level) {
      case 0: return 'bg-gray-100 dark:bg-gray-800'
      case 1: return 'bg-green-200 dark:bg-green-900'
      case 2: return 'bg-green-300 dark:bg-green-700'
      case 3: return 'bg-green-400 dark:bg-green-600'
      case 4: return 'bg-green-500 dark:bg-green-500'
      default: return 'bg-gray-100 dark:bg-gray-800'
    }
  }

  const renderHeatmap = () => {
    const weeks: HeatmapData[][] = []
    let currentWeek: HeatmapData[] = []
    
    // Remplir avec les 90 derniers jours
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayData = heatmapData.find(data => data.date === dateStr) || {
        date: dateStr,
        count: 0,
        level: 0 as const
      }
      
      currentWeek.push(dayData)
      
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return (
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">Activité des 90 derniers jours</div>
        <div className="w-full">
          <div className="flex justify-center">
            <div className="flex gap-1 overflow-x-auto max-w-full">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={day.date}
                      className={`w-4 h-4 rounded-sm ${getIntensityColor(day.level)} cursor-pointer transition-transform hover:scale-110`}
                      title={`${day.date}: ${day.count} cartes`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Moins</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className={`w-4 h-4 rounded-sm ${getIntensityColor(level)}`} />
            ))}
          </div>
          <span>Plus</span>
        </div>
        
        {/* Statistiques de la heatmap */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold">
              {heatmapData.reduce((sum, day) => sum + day.count, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total cartes étudiées</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold">
              {heatmapData.filter(day => day.count > 0).length}
            </div>
            <div className="text-xs text-muted-foreground">Jours actifs</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold">
              {heatmapData.length > 0 ? Math.round(heatmapData.reduce((sum, day) => sum + day.count, 0) / heatmapData.filter(day => day.count > 0).length) || 0 : 0}
            </div>
            <div className="text-xs text-muted-foreground">Moyenne/jour actif</div>
          </div>
        </div>
      </div>
    )
  }

  const renderLearningCurve = () => {
    if (learningCurve.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          Pas assez de données pour afficher la courbe d'apprentissage
        </div>
      )
    }

    const maxRetention = Math.max(...learningCurve.map(point => point.retention))
    const maxCards = Math.max(...learningCurve.map(point => point.cardsReviewed))

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Progression des 30 derniers jours</div>
        <div className="relative h-48 border rounded-lg p-4">
          {/* Courbe simplifiée avec des barres */}
          <div className="flex items-end justify-between h-full gap-1">
            {learningCurve.slice(-14).map((point, index) => {
              const retentionHeight = (point.retention / 100) * 100
              const cardHeight = (point.cardsReviewed / maxCards) * 50
              
              return (
                <div key={point.date} className="flex flex-col items-center gap-1 flex-1">
                  <div className="flex flex-col items-center justify-end h-32 gap-1">
                    {/* Barre de rétention */}
                    <div 
                      className="bg-green-500 rounded-t w-full"
                      style={{ height: `${retentionHeight}%` }}
                      title={`Rétention: ${point.retention.toFixed(1)}%`}
                    />
                    {/* Barre de cartes */}
                    <div 
                      className="bg-blue-500 rounded-t w-full"
                      style={{ height: `${cardHeight}%` }}
                      title={`Cartes: ${point.cardsReviewed}`}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(point.date).getDate()}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Légende */}
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Rétention (%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Cartes révisées</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading || !stats) {
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
                <p className="text-muted-foreground">Statistiques détaillées</p>
              </div>
            </div>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Métriques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalCards}</div>
                <div className="text-sm text-muted-foreground">Total cartes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.retentionRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Rétention</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.dailyStreak}</div>
                <div className="text-sm text-muted-foreground">Jours d'affilée</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{formatTime(stats.totalStudyTime)}</div>
                <div className="text-sm text-muted-foreground">Temps total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets pour les différentes vues */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="progress">Progression</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Répartition des cartes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Répartition des cartes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{stats.newCards}</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Nouvelles</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">{stats.learningCards}</div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">Apprentissage</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{stats.reviewCards}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Révision</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{stats.dueCards}</div>
                  <div className="text-sm text-red-700 dark:text-red-300">À réviser</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{stats.masteredCards}</div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Maîtrisées</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance aujourd'hui */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Performance aujourd'hui
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.cardsStudiedToday}</div>
                  <div className="text-sm text-muted-foreground">Cartes étudiées</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.accuracyToday.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Précision</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.averageEase.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Ease moyen</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Courbe d'apprentissage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderLearningCurve()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Heatmap d'activité
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderHeatmap()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}