'use client'

import { useState, useEffect } from 'react'
import { AnkiCard, AnkiTreeNode, ReviewResponse, REVIEW_QUALITY } from '@/types/anki'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  Clock,
  CheckCircle,
  Brain,
  Target
} from 'lucide-react'

interface StudySessionProps {
  deck: AnkiTreeNode
  cards: AnkiCard[]
  onReviewCard: (cardId: string, response: ReviewResponse) => Promise<void>
  onEndSession: () => void
}

export function StudySession({ deck, cards, onReviewCard, onEndSession }: StudySessionProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    cardsStudied: 0,
    correctAnswers: 0,
    totalTime: 0,
    startTime: Date.now()
  })
  const [cardStartTime, setCardStartTime] = useState(Date.now())

  const currentCard = cards[currentCardIndex]
  const isLastCard = currentCardIndex === cards.length - 1
  const progress = ((currentCardIndex + (showAnswer ? 0.5 : 0)) / cards.length) * 100

  useEffect(() => {
    setCardStartTime(Date.now())
  }, [currentCardIndex])

  const handleShowAnswer = () => {
    setShowAnswer(true)
  }

  const handleReview = async (quality: 1 | 2 | 3 | 4) => {
    const responseTime = Date.now() - cardStartTime
    
    try {
      await onReviewCard(currentCard.id, {
        quality,
        responseTime
      })

      // Mettre à jour les stats
      setSessionStats(prev => ({
        ...prev,
        cardsStudied: prev.cardsStudied + 1,
        correctAnswers: prev.correctAnswers + (quality >= 3 ? 1 : 0),
        totalTime: prev.totalTime + responseTime
      }))

      // Passer à la carte suivante ou terminer
      if (isLastCard) {
        onEndSession()
      } else {
        setCurrentCardIndex(prev => prev + 1)
        setShowAnswer(false)
      }
    } catch (error) {
      console.error('Error reviewing card:', error)
    }
  }

  const getQualityConfig = (quality: number) => {
    switch (quality) {
      case REVIEW_QUALITY.AGAIN:
        return { 
          label: 'Encore', 
          color: 'bg-red-600 hover:bg-red-700', 
          shortcut: '1',
          description: 'Incorrect, revoir bientôt'
        }
      case REVIEW_QUALITY.HARD:
        return { 
          label: 'Difficile', 
          color: 'bg-orange-600 hover:bg-orange-700', 
          shortcut: '2',
          description: 'Correct mais difficile'
        }
      case REVIEW_QUALITY.GOOD:
        return { 
          label: 'Bien', 
          color: 'bg-green-600 hover:bg-green-700', 
          shortcut: '3',
          description: 'Correct avec effort normal'
        }
      case REVIEW_QUALITY.EASY:
        return { 
          label: 'Facile', 
          color: 'bg-blue-600 hover:bg-blue-700', 
          shortcut: '4',
          description: 'Correct et facile'
        }
      default:
        return { label: '', color: '', shortcut: '', description: '' }
    }
  }

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!showAnswer && e.code === 'Space') {
        e.preventDefault()
        handleShowAnswer()
      } else if (showAnswer && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        handleReview(parseInt(e.key) as 1 | 2 | 3 | 4)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showAnswer])

  const accuracy = sessionStats.cardsStudied > 0 
    ? Math.round((sessionStats.correctAnswers / sessionStats.cardsStudied) * 100) 
    : 0

  const averageTime = sessionStats.cardsStudied > 0 
    ? Math.round(sessionStats.totalTime / sessionStats.cardsStudied / 1000) 
    : 0

  if (!currentCard) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold mb-2">Session terminée !</h2>
          <p className="text-muted-foreground mb-6">Excellent travail !</p>
          <Button onClick={onEndSession}>Retour au deck</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header avec progression */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{deck.icon}</span>
              <div>
                <CardTitle className="text-lg">{deck.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Carte {currentCardIndex + 1} sur {cards.length}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={onEndSession}>
              Terminer
            </Button>
          </div>
          <Progress value={progress} className="mt-3" />
        </CardHeader>
      </Card>

      {/* Stats de session */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-lg font-bold">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">Précision</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-lg font-bold">{averageTime}s</div>
              <div className="text-xs text-muted-foreground">Temps moyen</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            <div>
              <div className="text-lg font-bold">{sessionStats.cardsStudied}</div>
              <div className="text-xs text-muted-foreground">Étudiées</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-orange-500" />
            <div>
              <div className="text-lg font-bold">{cards.length - currentCardIndex}</div>
              <div className="text-xs text-muted-foreground">Restantes</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Carte d'étude */}
      <Card className="min-h-[400px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {currentCard.card_state === 'new' ? 'Nouvelle' : 
                 currentCard.card_state === 'learning' ? 'Apprentissage' :
                 currentCard.card_state === 'review' ? 'Révision' : 'Réapprentissage'}
              </Badge>
              {currentCard.tags && currentCard.tags.length > 0 && (
                <div className="flex gap-1">
                  {currentCard.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {currentCard.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{currentCard.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Ease: {currentCard.ease_factor.toFixed(2)} • 
              Révisions: {currentCard.review_count}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Question */}
          <div className="text-center space-y-4">
            <div className="text-lg font-medium text-muted-foreground">Question</div>
            <div className="text-xl leading-relaxed p-6 bg-muted/30 rounded-lg">
              {currentCard.front}
            </div>
          </div>

          {/* Réponse */}
          {showAnswer ? (
            <div className="text-center space-y-4">
              <div className="text-lg font-medium text-muted-foreground">Réponse</div>
              <div className="text-xl leading-relaxed p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                {currentCard.back}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Button 
                size="lg" 
                onClick={handleShowAnswer}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                Montrer la réponse (Espace)
              </Button>
            </div>
          )}

          {/* Boutons de notation */}
          {showAnswer && (
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Comment avez-vous trouvé cette carte ?
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[REVIEW_QUALITY.AGAIN, REVIEW_QUALITY.HARD, REVIEW_QUALITY.GOOD, REVIEW_QUALITY.EASY].map((quality) => {
                  const config = getQualityConfig(quality)
                  return (
                    <Button
                      key={quality}
                      onClick={() => handleReview(quality)}
                      className={`${config.color} text-white h-auto py-3 px-4 flex flex-col gap-1`}
                    >
                      <div className="font-semibold">{config.label}</div>
                      <div className="text-xs opacity-90">{config.description}</div>
                      <div className="text-xs opacity-75">({config.shortcut})</div>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground text-center">
            {!showAnswer ? (
              <>
                <kbd className="px-2 py-1 bg-background rounded border">Espace</kbd> pour montrer la réponse
              </>
            ) : (
              <>
                Utilisez les touches <kbd className="px-2 py-1 bg-background rounded border mx-1">1</kbd>
                <kbd className="px-2 py-1 bg-background rounded border mx-1">2</kbd>
                <kbd className="px-2 py-1 bg-background rounded border mx-1">3</kbd>
                <kbd className="px-2 py-1 bg-background rounded border mx-1">4</kbd> pour noter votre réponse
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}