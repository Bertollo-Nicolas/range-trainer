'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Calendar,
  Award,
  Activity,
  Search
} from "lucide-react"
import { SessionService, SessionStats, GlobalStats } from '@/lib/services/session-service'
import { RangeHeatmap } from '@/components/heatmap'

export default function StatsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionStats[]>([])
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Charger les données au démarrage
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [sessionsData, globalStatsData] = await Promise.all([
        SessionService.getAllSessions(),
        SessionService.getGlobalStats()
      ])
      
      setSessions(sessionsData)
      setGlobalStats(globalStatsData)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  // Données pour les graphiques
  const accuracyData = sessions.map((session, index) => ({
    session: `S${index + 1}`,
    accuracy: session.accuracy,
    date: session.createdAt.toLocaleDateString()
  }))

  const typeDistribution = [
    { 
      name: 'Scénarios', 
      value: sessions.filter(s => s.type === 'scenario').length,
      color: '#3b82f6'
    },
    { 
      name: 'Range Training', 
      value: sessions.filter(s => s.type === 'range_training').length,
      color: '#10b981'
    }
  ]

  const weeklyData = [
    { day: 'Lun', sessions: 0, accuracy: 0 },
    { day: 'Mar', sessions: 1, accuracy: 80 },
    { day: 'Mer', sessions: 1, accuracy: 83 },
    { day: 'Jeu', sessions: 1, accuracy: 80 },
    { day: 'Ven', sessions: 0, accuracy: 0 },
    { day: 'Sam', sessions: 0, accuracy: 0 },
    { day: 'Dim', sessions: 0, accuracy: 0 }
  ]

  // Filtrer les sessions selon la recherche
  const filteredSessions = sessions.filter(session => 
    (session.scenarioName || session.rangeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p>Chargement des statistiques...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!globalStats) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-xl font-semibold mb-4">Aucune donnée disponible</h2>
            <p className="text-muted-foreground">
              Commencez à vous entraîner pour voir vos statistiques !
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Statistiques</h1>
            <p className="text-muted-foreground">Suivez vos progrès et performances</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant={selectedPeriod === 'week' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('week')}
              size="sm"
            >
              Cette semaine
            </Button>
            <Button 
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('month')}
              size="sm"
            >
              Ce mois
            </Button>
            <Button 
              variant={selectedPeriod === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('all')}
              size="sm"
            >
              Tout
            </Button>
          </div>
        </div>

        {/* Cartes de statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions totales</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                +{globalStats.sessionsThisWeek} cette semaine
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Précision globale</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.globalAccuracy}%</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 text-green-600" />
                +{globalStats.improvementRate}% vs mois dernier
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meilleure série</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.bestStreak}</div>
              <p className="text-xs text-muted-foreground">
                Bonnes réponses d'affilée
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temps de jeu</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.totalPlayTime}min</div>
              <p className="text-xs text-muted-foreground">
                ~{globalStats.averageSessionDuration.toFixed(1)}min par session
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Évolution de la précision */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution de la précision</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={accuracyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Précision']}
                    labelFormatter={(label) => `Session ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Répartition par type d'entraînement */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Activité hebdomadaire */}
        <Card>
          <CardHeader>
            <CardTitle>Activité de la semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="sessions" orientation="left" />
                <YAxis yAxisId="accuracy" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Bar yAxisId="sessions" dataKey="sessions" fill="#3b82f6" name="Sessions" />
                <Line yAxisId="accuracy" type="monotone" dataKey="accuracy" stroke="#10b981" name="Précision %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Historique des sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des sessions</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredSessions.map((session) => (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/stats/sessions/${session.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      session.type === 'scenario' ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">
                        {session.scenarioName || session.rangeName}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {session.createdAt.toLocaleDateString('fr-FR')}
                        <Clock className="h-3 w-3 ml-1" />
                        {session.duration}min
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={session.type === 'scenario' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {session.type === 'scenario' ? 'Scénario' : 'Range'}
                    </Badge>
                    
                    <div className="text-right">
                      <div className="font-medium text-sm">{session.accuracy}%</div>
                      <div className="text-xs text-muted-foreground">
                        {session.correctAnswers}/{session.totalQuestions}
                      </div>
                    </div>
                    
                    <div className="w-12 text-center">
                      <div className="text-xs text-muted-foreground">Série</div>
                      <div className="text-sm font-medium">{session.streak}</div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredSessions.length === 0 && searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune session trouvée pour "{searchQuery}"
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Heatmap des erreurs */}
        <RangeHeatmap />

        {/* Objectifs et badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Objectifs */}
          <Card>
            <CardHeader>
              <CardTitle>Objectifs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Précision 90%</span>
                  <span>{globalStats.globalAccuracy}/90%</span>
                </div>
                <Progress value={(globalStats.globalAccuracy / 90) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>10 sessions cette semaine</span>
                  <span>{globalStats.sessionsThisWeek}/10</span>
                </div>
                <Progress value={(globalStats.sessionsThisWeek / 10) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Série de 20</span>
                  <span>{globalStats.bestStreak}/20</span>
                </div>
                <Progress value={(globalStats.bestStreak / 20) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Award className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="text-xs">Première session</div>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-xs">Précision 80%</div>
                </div>
                
                <div className="text-center opacity-50">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-xs">Série de 20</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}