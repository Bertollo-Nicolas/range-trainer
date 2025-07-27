'use client'

import { useState, useEffect } from 'react'
import { AnkiSidebar } from '@/components/anki/anki-sidebar'
import { AnkiTreeNode } from '@/types/anki'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardList } from '@/components/anki/card-list'
import { StudySession } from '@/components/anki/study-session'
import { DeckStatistics } from '@/components/anki/deck-statistics'
import { useAnkiCards } from '@/hooks/use-anki-cards'
import { 
  BookOpen, 
  Plus,
  TrendingUp,
  BarChart3,
  Calendar,
  Brain
} from 'lucide-react'

type ViewMode = 'overview' | 'cards' | 'study' | 'statistics'

export default function AnkiPage() {
  const [selectedDeck, setSelectedDeck] = useState<AnkiTreeNode | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [refreshSidebar, setRefreshSidebar] = useState<(() => void) | null>(null)
  const [isClient, setIsClient] = useState(false)
  const { cards, dueCards, loading, actions } = useAnkiCards()

  // Éviter les problèmes d'hydratation
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleSelectDeck = (deck: AnkiTreeNode | null) => {
    setSelectedDeck(deck)
    setViewMode('overview')
    if (deck) {
      actions.loadCards(deck.id)
      actions.loadDueCards(deck.id)
    }
  }

  const handleRefreshReady = (refreshFn: () => void) => {
    setRefreshSidebar(() => refreshFn)
  }

  const handleStartStudy = () => {
    if (selectedDeck) {
      actions.loadDueCards(selectedDeck.id)
      setViewMode('study')
    }
  }

  const handleStartCustomStudy = (selectedCards: any[]) => {
    // Pour l'étude personnalisée, on utilise les cartes sélectionnées
    setViewMode('study')
  }

  const handleEndStudy = () => {
    setViewMode('overview')
    if (selectedDeck) {
      actions.loadCards(selectedDeck.id)
      actions.loadDueCards(selectedDeck.id)
    }
    refreshSidebar?.()
  }

  // Affichage de loading pendant l'hydratation
  if (!isClient) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-80 flex-shrink-0 bg-muted"></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <AnkiSidebar 
          onSelectDeck={handleSelectDeck}
          onRefreshReady={handleRefreshReady}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {selectedDeck ? (
          <div className="h-full">
            {viewMode === 'overview' && (
              <DeckView 
                deck={selectedDeck} 
                onViewCards={() => setViewMode('cards')}
                onStartStudy={handleStartStudy}
                onViewStatistics={() => setViewMode('statistics')}
              />
            )}
            {viewMode === 'cards' && (
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto">
                  <div className="mb-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setViewMode('overview')}
                      className="mb-4"
                    >
                      ← Retour au deck
                    </Button>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                      <span className="text-4xl">{selectedDeck.icon}</span>
                      {selectedDeck.name} - Cartes
                    </h1>
                  </div>
                  <CardList
                    deck={selectedDeck}
                    cards={cards}
                    loading={loading}
                    onCreateCard={actions.createCard}
                    onEditCard={actions.updateCard}
                    onDeleteCard={actions.deleteCard}
                    onStartCustomStudy={handleStartCustomStudy}
                  />
                </div>
              </div>
            )}
            {viewMode === 'study' && dueCards.length > 0 && (
              <div className="h-full overflow-y-auto p-6">
                <StudySession
                  deck={selectedDeck}
                  cards={dueCards}
                  onReviewCard={actions.reviewCard}
                  onEndSession={handleEndStudy}
                />
              </div>
            )}
            {viewMode === 'statistics' && (
              <div className="h-full overflow-y-auto p-6">
                <DeckStatistics
                  deck={selectedDeck}
                  onClose={() => setViewMode('overview')}
                />
              </div>
            )}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

// Composant pour l'état vide
function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🎴</div>
        <h2 className="text-2xl font-bold mb-2">Bienvenue dans Anki</h2>
        <p className="text-muted-foreground mb-6">
          Sélectionnez un deck dans la sidebar pour commencer l'étude, ou créez votre premier deck pour débuter.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Card className="p-3">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="font-medium">Étude intelligente</div>
              <div className="text-muted-foreground text-xs">Algorithme SM-2</div>
            </Card>
            <Card className="p-3">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="font-medium">Statistiques</div>
              <div className="text-muted-foreground text-xs">Suivi détaillé</div>
            </Card>
            <Card className="p-3">
              <BarChart3 className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <div className="font-medium">Heatmap</div>
              <div className="text-muted-foreground text-xs">Activité quotidienne</div>
            </Card>
            <Card className="p-3">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-orange-500" />
              <div className="font-medium">Planification</div>
              <div className="text-muted-foreground text-xs">Prédictions de charge</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant pour afficher un deck sélectionné
function DeckView({ 
  deck, 
  onViewCards, 
  onStartStudy, 
  onViewStatistics
}: { 
  deck: AnkiTreeNode
  onViewCards: () => void
  onStartStudy: () => void
  onViewStatistics: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header du deck */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{deck.icon}</span>
            <div>
              <h1 className="text-2xl font-bold">{deck.name}</h1>
              {deck.description && (
                <p className="text-muted-foreground">{deck.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {deck.cardCount} cartes
            </Badge>
            {deck.dueCards > 0 && (
              <Badge variant="destructive">
                {deck.dueCards} à réviser
              </Badge>
            )}
            {deck.newCards > 0 && (
              <Badge className="bg-green-600">
                {deck.newCards} nouvelles
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Zone d'étude */}
            <div className="lg:col-span-2">
              <StudyArea deck={deck} onStartStudy={onStartStudy} onViewCards={onViewCards} />
            </div>

            {/* Sidebar stats */}
            <div className="space-y-6">
              <DeckStats deck={deck} />
              <QuickActions 
                onViewCards={onViewCards}
                onStartStudy={onStartStudy}
                onViewStatistics={onViewStatistics}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Zone d'étude principale
function StudyArea({ 
  deck, 
  onStartStudy, 
  onViewCards 
}: { 
  deck: AnkiTreeNode
  onStartStudy: () => void
  onViewCards: () => void
}) {
  const hasDueCards = deck.dueCards > 0
  const hasNewCards = deck.newCards > 0

  return (
    <Card className="min-h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Zone d'étude
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        {hasDueCards || hasNewCards ? (
          <div className="text-center space-y-4">
            <BookOpen className="h-16 w-16 mx-auto text-blue-500" />
            <h3 className="text-xl font-semibold">Prêt à étudier !</h3>
            <p className="text-muted-foreground">
              {hasDueCards && `${deck.dueCards} carte${deck.dueCards > 1 ? 's' : ''} à réviser`}
              {hasDueCards && hasNewCards && ' • '}
              {hasNewCards && `${deck.newCards} nouvelle${deck.newCards > 1 ? 's' : ''} carte${deck.newCards > 1 ? 's' : ''}`}
            </p>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={onStartStudy}>
              Commencer l'étude
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <Brain className="h-16 w-16 mx-auto text-green-500" />
            <h3 className="text-xl font-semibold">Toutes les cartes révisées !</h3>
            <p className="text-muted-foreground">
              Excellent travail ! Revenez plus tard pour la prochaine session.
            </p>
            <Button variant="outline" onClick={onViewCards}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter des cartes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Statistiques du deck
function DeckStats({ deck }: { deck: AnkiTreeNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">📊 Statistiques</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{deck.cardCount}</div>
            <div className="text-xs text-muted-foreground">Total cartes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{deck.dueCards}</div>
            <div className="text-xs text-muted-foreground">À réviser</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{deck.newCards}</div>
            <div className="text-xs text-muted-foreground">Nouvelles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {deck.cardCount > 0 ? Math.round(((deck.cardCount - deck.dueCards - deck.newCards) / deck.cardCount) * 100) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">Maîtrisées</div>
          </div>
        </div>

        {/* Configuration du deck */}
        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm mb-2">Configuration</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Nouvelles cartes/jour: {deck.new_cards_per_day}</div>
            <div>Révisions/jour: {deck.review_cards_per_day}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Actions rapides
function QuickActions({ 
  onViewCards, 
  onStartStudy,
  onViewStatistics
}: { 
  onViewCards: () => void
  onStartStudy: () => void
  onViewStatistics: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">⚡ Actions rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={onStartStudy}>
          <Brain className="h-4 w-4 mr-2" />
          Commencer l'étude
        </Button>
        <Button className="w-full" variant="outline" onClick={onViewCards}>
          <Plus className="h-4 w-4 mr-2" />
          Gérer les cartes
        </Button>
        <Button className="w-full" variant="outline" onClick={onViewStatistics}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Voir les statistiques
        </Button>
      </CardContent>
    </Card>
  )
}

