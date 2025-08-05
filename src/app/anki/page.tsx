'use client'

import { useState, useEffect } from 'react'
import { AnkiSidebar } from '@/components/anki/anki-sidebar'
import { AnkiTreeNode } from '@/types/anki'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { FSRSStudySession } from '@/components/anki/fsrs-study-session'
import { DeckStatistics } from '@/components/anki/deck-statistics'
import { CardManager } from '@/components/anki/card-manager'
import { useAnkiEngine } from '@/hooks/use-anki-engine'
import { 
  BookOpen, 
  Plus,
  TrendingUp,
  BarChart3,
  Calendar,
  Brain,
  Menu,
  ArrowLeft
} from 'lucide-react'

type ViewMode = 'overview' | 'cards' | 'study' | 'statistics'

// Force dynamic rendering to avoid SSG issues with Supabase
export const dynamic = 'force-dynamic'

export default function AnkiPage() {
  const [selectedDeck, setSelectedDeck] = useState<AnkiTreeNode | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [refreshSidebar, setRefreshSidebar] = useState<(() => void) | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { 
    dueCards,
    actions 
  } = useAnkiEngine({ autoStart: false })

  // Éviter les problèmes d'hydratation
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleSelectDeck = (deck: AnkiTreeNode | null) => {
    setSelectedDeck(deck)
    setViewMode('overview')
    setIsMobileMenuOpen(false) // Fermer le menu mobile
    if (deck) {
      actions.loadDueCards(deck.id)
    }
  }

  const handleRefreshReady = (refreshFn: () => void) => {
    setRefreshSidebar(() => refreshFn)
  }

  const handleStartStudy = async () => {
    if (selectedDeck) {
      try {
        await actions.startSession(selectedDeck.id)
        setViewMode('study')
      } catch (err) {
        console.error('Failed to start study session:', err)
      }
    }
  }


  const handleEndStudy = async () => {
    try {
      await actions.endSession()
      setViewMode('overview')
      if (selectedDeck) {
        await actions.loadDueCards(selectedDeck.id)
      }
      refreshSidebar?.()
    } catch (err) {
      console.error('Failed to end study session:', err)
    }
  }

  // Affichage de loading pendant l'hydratation
  if (!isClient) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden lg:block w-80 flex-shrink-0 bg-muted"></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background">
      {/* Sidebar Desktop */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <AnkiSidebar 
          onSelectDeck={handleSelectDeck}
          onRefreshReady={handleRefreshReady}
        />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden border-b bg-white">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {selectedDeck ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDeck(null)}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg">{selectedDeck.icon}</span>
                <h1 className="font-semibold truncate">{selectedDeck.name}</h1>
              </>
            ) : (
              <h1 className="font-semibold">Anki</h1>
            )}
          </div>
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <AnkiSidebar 
                onSelectDeck={handleSelectDeck}
                onRefreshReady={handleRefreshReady}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {selectedDeck ? (
          <div className="h-full">
            {viewMode === 'overview' && (
              <DeckView 
                deck={selectedDeck}
                dueCards={dueCards}
                onViewCards={() => setViewMode('cards')}
                onStartStudy={handleStartStudy}
                onViewStatistics={() => setViewMode('statistics')}
              />
            )}
            {viewMode === 'cards' && (
              <div className="h-full overflow-y-auto p-4 lg:p-6">
                <div className="max-w-6xl mx-auto">
                  <CardManager 
                    deck={selectedDeck}
                    onBack={() => setViewMode('overview')}
                  />
                </div>
              </div>
            )}
            {viewMode === 'study' && (
              <div className="h-full overflow-y-auto p-4 lg:p-6">
                <FSRSStudySession
                  deckId={selectedDeck.id}
                  onSessionEnd={handleEndStudy}
                />
              </div>
            )}
            {viewMode === 'statistics' && (
              <div className="h-full overflow-y-auto p-4 lg:p-6">
                <DeckStatistics
                  deck={selectedDeck}
                  onClose={() => setViewMode('overview')}
                />
              </div>
            )}
          </div>
        ) : (
          <EmptyState onOpenMenu={() => setIsMobileMenuOpen(true)} />
        )}
      </div>
    </div>
  )
}

// Composant pour l'état vide
function EmptyState({ onOpenMenu }: { onOpenMenu?: () => void }) {
  return (
    <div className="flex items-center justify-center h-full p-4 lg:p-8">
      <div className="text-center max-w-md w-full">
        <div className="text-4xl lg:text-6xl mb-4">🎴</div>
        <h2 className="text-xl lg:text-2xl font-bold mb-2">Bienvenue dans Anki</h2>
        <p className="text-muted-foreground mb-6 text-sm lg:text-base">
          <span className="hidden lg:inline">Sélectionnez un deck dans la sidebar pour commencer l'étude, ou créez votre premier deck pour débuter.</span>
          <span className="lg:hidden">Accédez au menu pour sélectionner un deck ou créer votre premier deck.</span>
        </p>
        
        {/* Bouton mobile pour ouvrir le menu */}
        <div className="lg:hidden mb-6">
          <Button onClick={onOpenMenu} className="bg-blue-600 hover:bg-blue-700">
            <Menu className="h-4 w-4 mr-2" />
            Ouvrir le menu
          </Button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Card className="p-3">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="font-medium">Étude intelligente</div>
              <div className="text-muted-foreground text-xs">Algorithme FSRS</div>
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
  dueCards,
  onViewCards, 
  onStartStudy, 
  onViewStatistics
}: { 
  deck: AnkiTreeNode
  dueCards: any[]
  onViewCards: () => void
  onStartStudy: () => void
  onViewStatistics: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header du deck */}
      <div className="border-b p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl lg:text-3xl">{deck.icon}</span>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl lg:text-2xl font-bold truncate">{deck.name}</h1>
              {deck.description && (
                <p className="text-muted-foreground text-sm lg:text-base truncate">{deck.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {deck.cardCount || 0} cartes
            </Badge>
            {dueCards.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {dueCards.length} à réviser
              </Badge>
            )}
            {dueCards.filter(dc => dc.priority === 'new').length > 0 && (
              <Badge className="bg-green-600 text-xs">
                {dueCards.filter(dc => dc.priority === 'new').length} nouvelles
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Layout mobile: stack vertical, desktop: grid */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Stats mobiles en premier sur petit écran */}
            <div className="lg:hidden">
              <DeckStats deck={deck} dueCards={dueCards} />
            </div>

            {/* Zone d'étude - order différent selon écran */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <StudyArea dueCards={dueCards} onStartStudy={onStartStudy} onViewCards={onViewCards} />
            </div>

            {/* Sidebar stats desktop */}
            <div className="hidden lg:block space-y-6 order-1 lg:order-2">
              <DeckStats deck={deck} dueCards={dueCards} />
              <QuickActions 
                onViewCards={onViewCards}
                onStartStudy={onStartStudy}
                onViewStatistics={onViewStatistics}
              />
            </div>

            {/* Actions mobiles */}
            <div className="lg:hidden order-3">
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
  dueCards,
  onStartStudy, 
  onViewCards 
}: { 
  dueCards: any[]
  onStartStudy: () => void
  onViewCards: () => void
}) {
  const hasDueCards = dueCards.length > 0
  const hasNewCards = dueCards.filter(dc => dc.priority === 'new').length > 0

  return (
    <Card className="min-h-[300px] lg:min-h-[400px]">
      <CardHeader className="pb-3 lg:pb-6">
        <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
          <Brain className="h-4 w-4 lg:h-5 lg:w-5" />
          Zone d'étude
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center pt-0">
        {hasDueCards || hasNewCards ? (
          <div className="text-center space-y-3 lg:space-y-4">
            <BookOpen className="h-12 w-12 lg:h-16 lg:w-16 mx-auto text-blue-500" />
            <h3 className="text-lg lg:text-xl font-semibold">Prêt à étudier !</h3>
            <p className="text-muted-foreground text-sm lg:text-base px-2">
              {hasDueCards && `${dueCards.length} carte${dueCards.length > 1 ? 's' : ''} à réviser`}
              {hasDueCards && hasNewCards && ' • '}
              {hasNewCards && `${dueCards.filter(dc => dc.priority === 'new').length} nouvelle${dueCards.filter(dc => dc.priority === 'new').length > 1 ? 's' : ''} carte${dueCards.filter(dc => dc.priority === 'new').length > 1 ? 's' : ''}`}
            </p>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" onClick={onStartStudy}>
              Commencer l'étude
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-3 lg:space-y-4">
            <Brain className="h-12 w-12 lg:h-16 lg:w-16 mx-auto text-green-500" />
            <h3 className="text-lg lg:text-xl font-semibold">Toutes les cartes révisées !</h3>
            <p className="text-muted-foreground text-sm lg:text-base px-2">
              Excellent travail ! Revenez plus tard pour la prochaine session.
            </p>
            <Button variant="outline" onClick={onViewCards} className="w-full sm:w-auto">
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
function DeckStats({ deck, dueCards }: { deck: AnkiTreeNode; dueCards: any[] }) {
  return (
    <Card>
      <CardHeader className="pb-3 lg:pb-6">
        <CardTitle className="text-base lg:text-lg">📊 Statistiques</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:gap-4 mb-3 lg:mb-4">
          <div className="text-center">
            <div className="text-xl lg:text-2xl font-bold text-blue-600">{deck.cardCount || 0}</div>
            <div className="text-xs text-muted-foreground">Total cartes</div>
          </div>
          <div className="text-center">
            <div className="text-xl lg:text-2xl font-bold text-orange-600">{dueCards.length}</div>
            <div className="text-xs text-muted-foreground">À réviser</div>
          </div>
          <div className="text-center">
            <div className="text-xl lg:text-2xl font-bold text-green-600">{dueCards.filter(dc => dc.priority === 'new').length}</div>
            <div className="text-xs text-muted-foreground">Nouvelles</div>
          </div>
          <div className="text-center">
            <div className="text-xl lg:text-2xl font-bold text-purple-600">
              {dueCards.filter(dc => dc.priority === 'overdue').length}
            </div>
            <div className="text-xs text-muted-foreground">En retard</div>
          </div>
        </div>

        {/* Configuration du deck - masqué sur mobile pour économiser l'espace */}
        <div className="hidden lg:block pt-4 border-t">
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
      <CardHeader className="pb-3 lg:pb-6">
        <CardTitle className="text-base lg:text-lg">⚡ Actions rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {/* Sur mobile: boutons horizontaux plus compacts */}
        <div className="lg:hidden flex gap-2">
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={onStartStudy}>
            <Brain className="h-4 w-4 mr-1" />
            Étudier
          </Button>
          <Button className="flex-1 text-sm" variant="outline" onClick={onViewCards}>
            <Plus className="h-4 w-4 mr-1" />
            Cartes
          </Button>
          <Button className="flex-1 text-sm" variant="outline" onClick={onViewStatistics}>
            <BarChart3 className="h-4 w-4 mr-1" />
            Stats
          </Button>
        </div>
        
        {/* Sur desktop: boutons verticaux */}
        <div className="hidden lg:block space-y-2">
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
        </div>
      </CardContent>
    </Card>
  )
}

