'use client'

import { useState } from 'react'
import { AnkiCard, AnkiTreeNode } from '@/types/anki'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  MoreHorizontal,
  Filter,
  Brain,
  Upload
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateCardDialog } from './create-card-dialog'
import { CardPreviewDialog } from './card-preview-dialog'
import { EditCardDialog } from './edit-card-dialog'
import { JsonImportDialog } from './json-import-dialog'

interface CardListProps {
  deck: AnkiTreeNode
  cards: AnkiCard[]
  loading: boolean
  onCreateCard: (cardData: any) => Promise<AnkiCard>
  onEditCard: (cardId: string, updates: any) => Promise<void>
  onDeleteCard: (cardId: string) => Promise<void>
  onStartCustomStudy?: (selectedCards: AnkiCard[]) => void
  onRefresh?: () => void
}

export function CardList({ deck, cards, loading, onCreateCard, onEditCard, onDeleteCard, onStartCustomStudy, onRefresh }: CardListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterState, setFilterState] = useState<'all' | 'new' | 'learning' | 'review' | 'due'>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showJsonImportDialog, setShowJsonImportDialog] = useState(false)
  const [selectedCard, setSelectedCard] = useState<AnkiCard | null>(null)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  // Filtrer les cartes
  const filteredCards = cards.filter(card => {
    const matchesSearch = 
      card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.back.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesFilter = 
      filterState === 'all' ||
      filterState === card.card_state ||
      (filterState === 'due' && new Date(card.due_date) <= new Date())

    return matchesSearch && matchesFilter
  })

  const getStateColor = (state: string) => {
    switch (state) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'learning': return 'bg-yellow-100 text-yellow-800'
      case 'review': return 'bg-green-100 text-green-800'
      case 'relearning': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'new': return 'Nouvelle'
      case 'learning': return 'Apprentissage'
      case 'review': return 'Révision'
      case 'relearning': return 'Réapprentissage'
      default: return state
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Demain"
    if (diffDays === -1) return "Hier"
    if (diffDays > 0) return `Dans ${diffDays} jours`
    return `Il y a ${Math.abs(diffDays)} jours`
  }

  const handleCreateCard = async (cardData: any) => {
    try {
      await onCreateCard(cardData)
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Error creating card:', error)
    }
  }

  const handlePreviewCard = (card: AnkiCard) => {
    setSelectedCard(card)
    setShowPreviewDialog(true)
  }

  const handleEditCard = (card: AnkiCard) => {
    setSelectedCard(card)
    setShowEditDialog(true)
  }

  const handleEditSubmit = async (cardId: string, updates: any) => {
    try {
      await onEditCard(cardId, updates)
      setShowEditDialog(false)
      setSelectedCard(null)
    } catch (error) {
      console.error('Error editing card:', error)
    }
  }

  const handleCardSelect = (cardId: string, checked: boolean) => {
    const newSelected = new Set(selectedCards)
    if (checked) {
      newSelected.add(cardId)
    } else {
      newSelected.delete(cardId)
    }
    setSelectedCards(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCards(new Set(filteredCards.map(card => card.id)))
    } else {
      setSelectedCards(new Set())
    }
  }

  const handleStartCustomStudy = () => {
    if (selectedCards.size > 0 && onStartCustomStudy) {
      const cardsToStudy = filteredCards.filter(card => selectedCards.has(card.id))
      onStartCustomStudy(cardsToStudy)
    }
  }

  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    if (selectMode) {
      setSelectedCards(new Set())
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header fixe avec recherche et filtres */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Première ligne : titre et actions principales */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Gestion des cartes</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={toggleSelectMode} size="sm">
                  {selectMode ? 'Annuler sélection' : 'Sélectionner'}
                </Button>
                <Button variant="outline" onClick={() => setShowJsonImportDialog(true)} size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import JSON
                </Button>
                <Button onClick={() => setShowCreateDialog(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle carte
                </Button>
              </div>
            </div>

            {/* Deuxième ligne : recherche et filtres */}
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 min-w-[120px]">
                    <Filter className="h-4 w-4" />
                    {filterState === 'all' ? 'Toutes' : getStateLabel(filterState)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterState('all')}>
                    Toutes les cartes ({cards.length})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterState('new')}>
                    Nouvelles ({cards.filter(c => c.card_state === 'new').length})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterState('learning')}>
                    En apprentissage ({cards.filter(c => c.card_state === 'learning').length})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterState('review')}>
                    En révision ({cards.filter(c => c.card_state === 'review').length})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterState('due')}>
                    À réviser ({cards.filter(c => new Date(c.due_date) <= new Date()).length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="text-sm text-muted-foreground self-center">
                {filteredCards.length} carte{filteredCards.length > 1 ? 's' : ''}
              </div>
            </div>

            {/* Actions pour les cartes sélectionnées */}
            {selectMode && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedCards.size === filteredCards.length && filteredCards.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedCards.size} carte{selectedCards.size > 1 ? 's' : ''} sélectionnée{selectedCards.size > 1 ? 's' : ''}
                  </span>
                </div>
                {selectedCards.size > 0 && onStartCustomStudy && (
                  <Button size="sm" onClick={handleStartCustomStudy}>
                    <Brain className="h-4 w-4 mr-2" />
                    Étudier la sélection
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Container principal avec hauteur fixe */}
      <Card className="flex-1 min-h-0">
        <CardContent className="p-0 h-full">
          {filteredCards.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center text-muted-foreground">
                {searchTerm || filterState !== 'all' ? (
                  <div>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune carte trouvée</p>
                  </div>
                ) : (
                  <div>
                    <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune carte dans ce deck</p>
                    <Button 
                      variant="link" 
                      onClick={() => setShowCreateDialog(true)}
                      className="mt-2"
                    >
                      Créer votre première carte
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Header de la table (fixe) */}
              <div className="border-b bg-muted/30 p-3">
                <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {selectMode && <div className="w-6"></div>}
                  <div className="w-20">État</div>
                  <div className="flex-1">Question</div>
                  <div className="flex-1">Réponse</div>
                  <div className="w-24">Stats</div>
                  <div className="w-20">Échéance</div>
                  <div className="w-8"></div>
                </div>
              </div>

              {/* Liste avec scroll (hauteur fixe) */}
              <div className="h-full overflow-y-auto">
                <div className="divide-y">
                  {filteredCards.map((card) => (
                    <div key={card.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                      {/* Checkbox de sélection */}
                      {selectMode && (
                        <div className="w-6">
                          <Checkbox
                            checked={selectedCards.has(card.id)}
                            onCheckedChange={(checked) => handleCardSelect(card.id, checked)}
                          />
                        </div>
                      )}
                      
                      {/* État */}
                      <div className="w-20">
                        <Badge className={`${getStateColor(card.card_state)} text-xs px-2 py-1`}>
                          {getStateLabel(card.card_state).slice(0, 3)}
                        </Badge>
                        {new Date(card.due_date) <= new Date() && card.card_state !== 'new' && (
                          <Badge variant="destructive" className="text-xs px-1 py-0 ml-1">!</Badge>
                        )}
                      </div>
                      
                      {/* Question */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{card.front}</div>
                        {card.tags && card.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {card.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {card.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{card.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Réponse */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-muted-foreground truncate">{card.back}</div>
                      </div>
                      
                      {/* Stats */}
                      <div className="w-24 text-xs text-muted-foreground">
                        <div>{card.review_count} rev</div>
                        <div>×{card.ease_factor.toFixed(1)}</div>
                      </div>
                      
                      {/* Échéance */}
                      <div className="w-20 text-xs text-muted-foreground">
                        {formatDate(card.due_date).split(' ')[0]}
                      </div>
                      
                      {/* Actions */}
                      <div className="w-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePreviewCard(card)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Prévisualiser
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditCard(card)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => onDeleteCard(card.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateCardDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateCard}
        deckId={deck.id}
      />

      <CardPreviewDialog
        isOpen={showPreviewDialog}
        onClose={() => {
          setShowPreviewDialog(false)
          setSelectedCard(null)
        }}
        card={selectedCard}
      />

      <EditCardDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false)
          setSelectedCard(null)
        }}
        onSubmit={handleEditSubmit}
        card={selectedCard}
      />

      <JsonImportDialog
        isOpen={showJsonImportDialog}
        onClose={() => setShowJsonImportDialog(false)}
        onSuccess={() => {
          setShowJsonImportDialog(false)
          onRefresh?.()
        }}
        deckId={deck.id}
        deckName={deck.name}
      />
    </div>
  )
}