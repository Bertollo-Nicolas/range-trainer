/**
 * Composant de session d'étude utilisant FSRS
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useAnkiEngine } from '@/hooks/use-anki-engine'
import { ANKI_GRADES, ANKI_GRADE_LABELS, ANKI_GRADE_COLORS } from '@/lib/anki'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  Clock,
  Target,
  TrendingUp,
  SkipForward
} from 'lucide-react'

interface FSRSStudySessionProps {
  deckId: string
  onSessionEnd?: (stats: any) => void
}

export function FSRSStudySession({ deckId, onSessionEnd }: FSRSStudySessionProps) {
  const {
    loading,
    error,
    isStudying,
    dueCards,
    currentCard,
    currentCardIndex,
    totalCards,
    remainingCards,
    sessionStats,
    actions
  } = useAnkiEngine({ deckId, autoStart: true })

  // État local
  const [showAnswer, setShowAnswer] = useState(false)
  const [studyStartTime, setStudyStartTime] = useState<Date | null>(null)
  const [cardStartTime, setCardStartTime] = useState<Date | null>(null)

  // ==================== EFFECTS ====================

  // Démarre automatiquement la session si des cartes sont disponibles
  useEffect(() => {
    if (dueCards.length > 0 && !isStudying && !loading) {
      handleStartSession()
    }
  }, [dueCards.length, isStudying, loading])

  // Réinitialise l'affichage quand on change de carte
  useEffect(() => {
    setShowAnswer(false)
    setCardStartTime(new Date())
  }, [currentCardIndex])

  // ==================== HANDLERS ====================

  const handleStartSession = async () => {
    try {
      await actions.startSession(deckId)
      setStudyStartTime(new Date())
      setCardStartTime(new Date())
    } catch (err) {
      console.error('Failed to start session:', err)
    }
  }

  const handleEndSession = async () => {
    try {
      const completedSession = await actions.endSession()
      setStudyStartTime(null)
      setCardStartTime(null)
      
      if (completedSession && onSessionEnd) {
        onSessionEnd({
          ...sessionStats,
          session: completedSession
        })
      }
    } catch (err) {
      console.error('Failed to end session:', err)
    }
  }

  const handleReviewCard = async (grade: number) => {
    const duration = cardStartTime 
      ? new Date().getTime() - cardStartTime.getTime()
      : 0

    try {
      await actions.reviewCard(grade, duration)
      setShowAnswer(false)
      setCardStartTime(new Date())
    } catch (err) {
      console.error('Failed to review card:', err)
    }
  }

  const handleShowAnswer = () => {
    setShowAnswer(true)
  }

  const handleSkipCard = () => {
    actions.skipCard()
    setShowAnswer(false)
  }

  const handleResetCard = async () => {
    try {
      await actions.resetCard()
      setShowAnswer(false)
    } catch (err) {
      console.error('Failed to reset card:', err)
    }
  }

  // ==================== CALCULS ====================

  const progress = totalCards > 0 ? ((currentCardIndex / totalCards) * 100) : 0
  const studyTime = studyStartTime 
    ? Math.floor((new Date().getTime() - studyStartTime.getTime()) / 1000)
    : 0

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // ==================== RENDU ====================

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading study session...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto border-red-200">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="font-semibold mb-2">Error</p>
            <p className="text-sm">{error}</p>
            <Button 
              onClick={() => actions.refresh()} 
              variant="outline" 
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (totalCards === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold mb-2">All done!</h3>
            <p className="text-muted-foreground mb-4">
              No cards due for review right now.
            </p>
            <Button onClick={() => actions.loadDueCards(deckId)}>
              Check for new cards
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header avec statistiques */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Study Session
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTime(studyTime)}
              </div>
              {isStudying ? (
                <Button onClick={handleEndSession} variant="outline" size="sm">
                  <Pause className="h-4 w-4 mr-1" />
                  End Session
                </Button>
              ) : (
                <Button onClick={handleStartSession} size="sm">
                  <Play className="h-4 w-4 mr-1" />
                  Start Session
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{currentCardIndex + 1} / {totalCards}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Stats en temps réel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold">{sessionStats.cardsReviewed}</div>
              <div className="text-xs text-muted-foreground">Reviewed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {Math.round(sessionStats.accuracy * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{sessionStats.newCards}</div>
              <div className="text-xs text-muted-foreground">New</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{remainingCards}</div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carte actuelle */}
      {currentCard && (
        <Card className="min-h-[400px]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={
                  currentCard.priority === 'new' ? 'default' :
                  currentCard.priority === 'learning' ? 'secondary' :
                  currentCard.priority === 'overdue' ? 'destructive' : 'outline'
                }>
                  {currentCard.priority}
                </Badge>
                {currentCard.card.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  onClick={handleResetCard}
                  variant="ghost"
                  size="sm"
                  title="Reset card progress"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSkipCard}
                  variant="ghost"
                  size="sm"
                  title="Skip this card"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question */}
            <div className="min-h-[120px] flex items-center justify-center text-center">
              <div 
                className="text-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentCard.card.front }}
              />
            </div>

            {/* Séparateur */}
            <div className="border-t" />

            {/* Réponse */}
            <div className="min-h-[120px] flex items-center justify-center text-center">
              {showAnswer ? (
                <div 
                  className="text-lg leading-relaxed text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: currentCard.card.back }}
                />
              ) : (
                <Button 
                  onClick={handleShowAnswer}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Show Answer
                </Button>
              )}
            </div>

            {/* Boutons de révision */}
            {showAnswer && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4">
                <Button
                  onClick={() => handleReviewCard(ANKI_GRADES.AGAIN)}
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  style={{ borderColor: ANKI_GRADE_COLORS[ANKI_GRADES.AGAIN] }}
                >
                  <span className="font-semibold" style={{ color: ANKI_GRADE_COLORS[ANKI_GRADES.AGAIN] }}>
                    {ANKI_GRADE_LABELS[ANKI_GRADES.AGAIN]}
                  </span>
                  <span className="text-xs text-muted-foreground">{'< 1m'}</span>
                </Button>

                <Button
                  onClick={() => handleReviewCard(ANKI_GRADES.HARD)}
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  style={{ borderColor: ANKI_GRADE_COLORS[ANKI_GRADES.HARD] }}
                >
                  <span className="font-semibold" style={{ color: ANKI_GRADE_COLORS[ANKI_GRADES.HARD] }}>
                    {ANKI_GRADE_LABELS[ANKI_GRADES.HARD]}
                  </span>
                  <span className="text-xs text-muted-foreground">{'< 6m'}</span>
                </Button>

                <Button
                  onClick={() => handleReviewCard(ANKI_GRADES.GOOD)}
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  style={{ borderColor: ANKI_GRADE_COLORS[ANKI_GRADES.GOOD] }}
                >
                  <span className="font-semibold" style={{ color: ANKI_GRADE_COLORS[ANKI_GRADES.GOOD] }}>
                    {ANKI_GRADE_LABELS[ANKI_GRADES.GOOD]}
                  </span>
                  <span className="text-xs text-muted-foreground">{'< 10m'}</span>
                </Button>

                <Button
                  onClick={() => handleReviewCard(ANKI_GRADES.EASY)}
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  style={{ borderColor: ANKI_GRADE_COLORS[ANKI_GRADES.EASY] }}
                >
                  <span className="font-semibold" style={{ color: ANKI_GRADE_COLORS[ANKI_GRADES.EASY] }}>
                    {ANKI_GRADE_LABELS[ANKI_GRADES.EASY]}
                  </span>
                  <span className="text-xs text-muted-foreground">{'4d'}</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Distribution des grades */}
      {sessionStats.cardsReviewed > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Session Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(sessionStats.gradeDistribution).map(([grade, count]) => {
                const gradeNumber = parseInt(grade) as 1 | 2 | 3 | 4;
                return (
                  <div key={grade} className="text-center">
                    <div 
                      className="text-lg font-semibold"
                      style={{ color: ANKI_GRADE_COLORS[gradeNumber] }}
                    >
                      {count}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ANKI_GRADE_LABELS[gradeNumber]}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}