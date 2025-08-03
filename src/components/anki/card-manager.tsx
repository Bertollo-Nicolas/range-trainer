'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AnkiTreeNode } from '@/types/anki'
import { CardCreator } from './card-creator'
import { useAnkiEngine } from '@/hooks/use-anki-engine'
import { FSRSCard } from '@/lib/anki'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Pause, 
  RotateCcw,
  ArrowLeft,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CardManagerProps {
  deck: AnkiTreeNode
  onBack: () => void
}

export function CardManager({ deck, onBack }: CardManagerProps) {
  const { engine, actions } = useAnkiEngine()
  const [cards, setCards] = useState<FSRSCard[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreator, setShowCreator] = useState(false)
  // const [editingCard, setEditingCard] = useState<FSRSCard | null>(null) // Pour une future fonctionnalité d'édition
  const [loadingCards, setLoadingCards] = useState(false)

  // Chargement des cartes du deck
  useEffect(() => {
    loadCards()
  }, [deck.id, engine])

  const loadCards = async () => {
    if (!actions.getAllCards) return

    try {
      setLoadingCards(true)
      const allCards = await actions.getAllCards(deck.id)
      setCards(allCards)
    } catch (error) {
      console.error('Error loading cards:', error)
    } finally {
      setLoadingCards(false)
    }
  }

  // Filtrage des cartes
  const filteredCards = cards.filter(card => 
    card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.back.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleCardCreated = () => {
    setShowCreator(false)
    loadCards()
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) return

    try {
      await actions.deleteCard(cardId)
      loadCards()
    } catch (error) {
      console.error('Error deleting card:', error)
    }
  }

  const handleSuspendCard = async (cardId: string, isSuspended: boolean) => {
    try {
      if (isSuspended) {
        await actions.unsuspendCard(cardId)
      } else {
        await actions.suspendCard(cardId)
      }
      loadCards()
    } catch (error) {
      console.error('Error suspending/unsuspending card:', error)
    }
  }

  const handleResetCard = async (cardId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir remettre à zéro cette carte ?')) return

    try {
      await engine?.resetCard(cardId)
      loadCards()
    } catch (error) {
      console.error('Error resetting card:', error)
    }
  }

  if (showCreator) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setShowCreator(false)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
        
        <CardCreator 
          deckId={deck.id}
          onCardCreated={handleCardCreated}
          onClose={() => setShowCreator(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">{deck.icon}</span>
            <span>Cartes - {deck.name}</span>
          </h1>
        </div>
        
        <Button onClick={() => setShowCreator(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle carte
        </Button>
      </div>

      {/* Barre de recherche */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les cartes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{cards.length}</div>
            <div className="text-sm text-muted-foreground">Total cartes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {cards.filter(c => c.state === 0).length}
            </div>
            <div className="text-sm text-muted-foreground">Nouvelles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {cards.filter(c => c.state === 1 || c.state === 2).length}
            </div>
            <div className="text-sm text-muted-foreground">En apprentissage</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {cards.filter(c => c.suspended).length}
            </div>
            <div className="text-sm text-muted-foreground">Suspendues</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des cartes */}
      <Card>
        <CardHeader>
          <CardTitle>
            Cartes ({filteredCards.length})
            {loadingCards && <span className="text-sm font-normal ml-2">(Chargement...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCards ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Aucune carte trouvée pour cette recherche'
                  : 'Aucune carte dans ce deck. Créez votre première carte !'}
              </p>
              {!searchTerm && (
                <Button 
                  className="mt-4" 
                  onClick={() => setShowCreator(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une carte
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  onDelete={() => handleDeleteCard(card.id)}
                  onSuspend={() => handleSuspendCard(card.id, card.suspended)}
                  onReset={() => handleResetCard(card.id)}
                  onEdit={() => console.log('Edit card:', card.id)} // TODO: Implémenter l'édition
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Composant pour une carte individuelle
function CardItem({ 
  card, 
  onDelete, 
  onSuspend, 
  onReset, 
  onEdit 
}: { 
  card: FSRSCard
  onDelete: () => void
  onSuspend: () => void
  onReset: () => void
  onEdit: () => void
}) {
  const getStateBadge = () => {
    switch (card.state) {
      case 0: return <Badge variant="secondary">Nouvelle</Badge>
      case 1: return <Badge className="bg-blue-600">Apprentissage</Badge>
      case 2: return <Badge className="bg-orange-600">Réapprentissage</Badge>
      case 3: return <Badge className="bg-green-600">Révisée</Badge>
      default: return <Badge variant="outline">Inconnue</Badge>
    }
  }

  const getStatusBadges = () => {
    const badges = []
    if (card.suspended) badges.push(<Badge key="suspended" variant="destructive">Suspendue</Badge>)
    if (card.buried) badges.push(<Badge key="buried" className="bg-gray-600">Enterrée</Badge>)
    if (card.leechCount > 0) badges.push(<Badge key="leech" variant="outline">Leech ({card.leechCount})</Badge>)
    return badges
  }

  return (
    <Card className={`${card.suspended ? 'opacity-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Question (Recto)
                </label>
                <p className="text-sm mt-1 line-clamp-3">{card.front}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Réponse (Verso)
                </label>
                <p className="text-sm mt-1 line-clamp-3">{card.back}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {getStateBadge()}
              {getStatusBadges()}
              {card.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="text-xs text-muted-foreground mt-2">
              Créée: {card.createdAt.toLocaleDateString()} • 
              Modifiée: {card.updatedAt.toLocaleDateString()} • 
              Prochaine: {card.due.toLocaleDateString()}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSuspend}>
                <Pause className="h-4 w-4 mr-2" />
                {card.suspended ? 'Réactiver' : 'Suspendre'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Remettre à zéro
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}