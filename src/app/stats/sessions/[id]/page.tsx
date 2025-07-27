'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, Target, Zap, Calendar } from 'lucide-react'
import { SessionService, SessionStats } from '@/lib/services/session-service'
import { Database } from '@/types/database'
import { formatCard } from '@/utils/card-colors'

type SessionHand = Database['public']['Tables']['session_hands']['Row']

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  
  const [session, setSession] = useState<SessionStats | null>(null)
  const [hands, setHands] = useState<SessionHand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const loadSessionData = async () => {
      try {
        setLoading(true)
        
        // Récupérer la session
        const sessions = await SessionService.getAllSessions()
        const currentSession = sessions.find(s => s.id === sessionId)
        
        if (!currentSession) {
          setError('Session non trouvée')
          return
        }
        
        setSession(currentSession)
        
        // Récupérer les mains jouées
        const sessionHands = await SessionService.getSessionHands(sessionId)
        setHands(sessionHands)
        
      } catch (err) {
        console.error('Error loading session data:', err)
        setError('Erreur lors du chargement des données')
      } finally {
        setLoading(false)
      }
    }

    loadSessionData()
  }, [sessionId])

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}min`
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  }

  const getHandColor = (hand: SessionHand) => {
    return hand.is_correct 
      ? 'bg-green-100 border-green-300 text-green-800' 
      : 'bg-red-100 border-red-300 text-red-800'
  }

  const getActionBadgeColor = (action: string | null) => {
    if (!action) return 'secondary'
    switch (action.toLowerCase()) {
      case 'fold': return 'destructive'
      case 'call': return 'default'
      case 'raise': return 'default'
      case 'all-in': return 'destructive'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Session non trouvée'}</p>
            <Button onClick={() => router.push('/stats')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux Stats
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={() => router.push('/stats')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {session.scenarioName || session.rangeName}
            </h1>
            <p className="text-muted-foreground">
              Session du {new Intl.DateTimeFormat('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }).format(session.createdAt)}
            </p>
          </div>
        </div>
        <Badge variant={session.type === 'scenario' ? 'default' : 'secondary'}>
          {session.type === 'scenario' ? 'Scénario' : 'Range Training'}
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Durée</p>
                <p className="font-semibold">{formatDuration(session.duration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Précision</p>
                <p className="font-semibold">{session.accuracy}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Meilleur Streak</p>
                <p className="font-semibold">{session.streak}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="font-semibold">{session.totalQuestions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hands Played */}
      <Card>
        <CardHeader>
          <CardTitle>Mains Jouées ({hands.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {hands.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune main enregistrée pour cette session
            </p>
          ) : (
            <div className="space-y-2">
              {hands.map((hand, index) => (
                <div 
                  key={hand.id} 
                  className={`p-4 rounded-lg border ${getHandColor(hand)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 font-mono text-lg font-bold">
                        {(() => {
                          const card1 = formatCard(hand.card1)
                          const card2 = formatCard(hand.card2)
                          return (
                            <>
                              <span className={card1.color}>
                                {card1.rank}{card1.symbol}
                              </span>
                              <span className={card2.color}>
                                {card2.rank}{card2.symbol}
                              </span>
                            </>
                          )
                        })()}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({hand.hand})
                      </span>
                      {hand.position && (
                        <Badge variant="outline">{hand.position}</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {hand.player_action && (
                        <Badge variant={getActionBadgeColor(hand.player_action)}>
                          {hand.player_action}
                        </Badge>
                      )}
                      {hand.correct_action && hand.player_action !== hand.correct_action && (
                        <Badge variant="outline" className="text-green-600">
                          Correct: {hand.correct_action}
                        </Badge>
                      )}
                      {hand.response_time && (
                        <span className="text-xs text-muted-foreground">
                          {(hand.response_time / 1000).toFixed(1)}s
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(new Date(hand.created_at))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}