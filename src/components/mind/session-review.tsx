'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  BookOpen,
  Brain,
  FileText,
  BarChart3,
  Eye
} from 'lucide-react'
import type { SessionReview } from '@/types/mind'

const mockReviews: SessionReview[] = [
  {
    id: '1',
    session_date: '2024-01-10',
    duration_minutes: 120,
    game_type: 'NL50 Zoom',
    game_rating: 'A',
    technical_notes: 'Excellente gestion des 3bets, bonnes value bets sur river. Spot de bluff river bien joué vs reg tight.',
    mental_notes: 'Très bon focus aujourd\'hui, pas de tilt malgré 2 bad beats. Méditation du matin a aidé.',
    key_hands: 3,
    profit_loss: 120.50,
    hands_played: 480,
    created_at: '2024-01-10T20:30:00Z',
    updated_at: '2024-01-10T20:30:00Z'
  },
  {
    id: '2',
    session_date: '2024-01-09',
    duration_minutes: 90,
    game_type: 'NL25 6-max',
    game_rating: 'B',
    technical_notes: 'Quelques erreurs de sizing sur turn, manqué un bon spot de thin value bet. À revoir.',
    mental_notes: 'Début de session difficile, un peu de frustration après les premiers downs. Mieux en fin de session.',
    key_hands: 2,
    profit_loss: -45.25,
    hands_played: 320,
    created_at: '2024-01-09T19:15:00Z',
    updated_at: '2024-01-09T19:15:00Z'
  },
  {
    id: '3',
    session_date: '2024-01-08',
    duration_minutes: 180,
    game_type: 'NL50 6-max',
    game_rating: 'C',
    technical_notes: 'Trop de call downs dans des spots marginaux. Range de 3bet trop wide vs certains opponents.',
    mental_notes: 'Grosse session tilt après bad beat précoce. Difficile de retrouver ma lucidité. Arrêt nécessaire.',
    key_hands: 5,
    profit_loss: -180.75,
    hands_played: 640,
    created_at: '2024-01-08T22:45:00Z',
    updated_at: '2024-01-08T22:45:00Z'
  }
]

const gameTypes = [
  'NL25 6-max',
  'NL50 6-max', 
  'NL100 6-max',
  'NL25 Zoom',
  'NL50 Zoom',
  'NL100 Zoom',
  'PLO25',
  'PLO50',
  'Tournament',
  'SNG'
]

export function SessionReview() {
  const [reviews, setReviews] = useState<SessionReview[]>(mockReviews)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<SessionReview | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRating, setFilterRating] = useState<string>('all')
  const [filterGameType, setFilterGameType] = useState<string>('all')

  // Form state pour nouvelle review
  const [newReview, setNewReview] = useState({
    session_date: new Date().toISOString().split('T')[0],
    duration_minutes: 120,
    game_type: 'NL50 6-max',
    game_rating: 'B' as 'A' | 'B' | 'C',
    technical_notes: '',
    mental_notes: '',
    key_hands: 0,
    profit_loss: 0,
    hands_played: 0
  })

  const resetNewReview = () => {
    setNewReview({
      session_date: new Date().toISOString().split('T')[0],
      duration_minutes: 120,
      game_type: 'NL50 6-max',
      game_rating: 'B',
      technical_notes: '',
      mental_notes: '',
      key_hands: 0,
      profit_loss: 0,
      hands_played: 0
    })
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'A': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'B': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'C': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600'
    if (profit < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  const getProfitIcon = (profit: number) => {
    if (profit > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (profit < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Target className="h-4 w-4 text-muted-foreground" />
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.game_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (review.technical_notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
                         (review.mental_notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesRating = filterRating === 'all' || review.game_rating === filterRating
    const matchesGameType = filterGameType === 'all' || review.game_type === filterGameType

    return matchesSearch && matchesRating && matchesGameType
  })

  const addReview = () => {
    const review: SessionReview = {
      id: Date.now().toString(),
      session_date: newReview.session_date,
      duration_minutes: newReview.duration_minutes,
      game_type: newReview.game_type,
      game_rating: newReview.game_rating,
      technical_notes: newReview.technical_notes,
      mental_notes: newReview.mental_notes,
      key_hands: newReview.key_hands,
      profit_loss: newReview.profit_loss,
      hands_played: newReview.hands_played,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setReviews([review, ...reviews])
    resetNewReview()
    setIsAddDialogOpen(false)
  }

  const viewReview = (review: SessionReview) => {
    setSelectedReview(review)
    setIsViewDialogOpen(true)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h${mins.toString().padStart(2, '0')}`
  }

  const totalSessions = reviews.length
  const totalProfit = reviews.reduce((sum, r) => sum + r.profit_loss, 0)
  const avgRating = reviews.length > 0 ? 
    reviews.reduce((sum, r) => sum + (r.game_rating === 'A' ? 3 : r.game_rating === 'B' ? 2 : 1), 0) / reviews.length : 0
  const profitableSessions = reviews.filter(r => r.profit_loss > 0).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Session Review</h1>
          <p className="text-muted-foreground">Analysez et évaluez vos sessions de jeu</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle session review</DialogTitle>
              <DialogDescription>
                Évaluez votre dernière session de poker
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={newReview.session_date}
                    onChange={(e) => setNewReview(prev => ({ ...prev, session_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Durée (minutes)</label>
                  <Input
                    type="number"
                    value={newReview.duration_minutes}
                    onChange={(e) => setNewReview(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Évaluation</label>
                  <Select 
                    value={newReview.game_rating} 
                    onValueChange={(value: 'A' | 'B' | 'C') => 
                      setNewReview(prev => ({ ...prev, game_rating: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Excellent</SelectItem>
                      <SelectItem value="B">B - Correct</SelectItem>
                      <SelectItem value="C">C - Décevant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type de jeu</label>
                <Select 
                  value={newReview.game_type} 
                  onValueChange={(value) => setNewReview(prev => ({ ...prev, game_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gameTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mains jouées</label>
                  <Input
                    type="number"
                    value={newReview.hands_played}
                    onChange={(e) => setNewReview(prev => ({ ...prev, hands_played: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mains clés</label>
                  <Input
                    type="number"
                    value={newReview.key_hands}
                    onChange={(e) => setNewReview(prev => ({ ...prev, key_hands: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Résultat (€)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newReview.profit_loss}
                    onChange={(e) => setNewReview(prev => ({ ...prev, profit_loss: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes techniques</label>
                <Textarea
                  placeholder="Analysez vos décisions techniques, les spots importants, les erreurs..."
                  value={newReview.technical_notes}
                  onChange={(e) => setNewReview(prev => ({ ...prev, technical_notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes mentales</label>
                <Textarea
                  placeholder="Comment vous sentiez-vous? Gestion du tilt, concentration, émotions..."
                  value={newReview.mental_notes}
                  onChange={(e) => setNewReview(prev => ({ ...prev, mental_notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={addReview}>
                  Ajouter la review
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions totales</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {profitableSessions} profitables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit total</CardTitle>
            {getProfitIcon(totalProfit)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getProfitColor(totalProfit)}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {((profitableSessions / Math.max(totalSessions, 1)) * 100).toFixed(0)}% win rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRating >= 2.5 ? 'A' : avgRating >= 1.5 ? 'B' : 'C'}
            </div>
            <p className="text-xs text-muted-foreground">
              {avgRating.toFixed(1)}/3.0
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps total</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(reviews.reduce((sum, r) => sum + r.duration_minutes, 0) / 60)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Ce mois-ci
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger>
                <SelectValue placeholder="Évaluation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes évaluations</SelectItem>
                <SelectItem value="A">A - Excellent</SelectItem>
                <SelectItem value="B">B - Correct</SelectItem>
                <SelectItem value="C">C - Décevant</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterGameType} onValueChange={setFilterGameType}>
              <SelectTrigger>
                <SelectValue placeholder="Type de jeu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {gameTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des reviews */}
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <Card key={review.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {new Date(review.session_date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </span>
                    <Badge variant="outline">{review.game_type}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <Badge variant="outline" className={getRatingColor(review.game_rating)}>
                    {review.game_rating}
                  </Badge>
                  <div className={`flex items-center gap-1 text-sm font-medium ${getProfitColor(review.profit_loss)}`}>
                    {getProfitIcon(review.profit_loss)}
                    {review.profit_loss >= 0 ? '+' : ''}{review.profit_loss.toFixed(2)}€
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDuration(review.duration_minutes)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{review.hands_played} mains</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{review.key_hands} mains clés</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span>{(review.profit_loss / (review.duration_minutes / 60)).toFixed(1)}€/h</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 font-medium text-muted-foreground mb-1">
                    <FileText className="h-4 w-4" />
                    Notes techniques
                  </div>
                  <p className="line-clamp-2">{review.technical_notes || 'Aucune note technique'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 font-medium text-muted-foreground mb-1">
                    <Brain className="h-4 w-4" />
                    Notes mentales
                  </div>
                  <p className="line-clamp-2">{review.mental_notes || 'Aucune note mentale'}</p>  
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t">
                <Button variant="ghost" size="sm" onClick={() => viewReview(review)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Voir détails
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredReviews.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium">Aucune review trouvée</h3>
                <p className="text-muted-foreground">
                  Modifiez vos filtres ou ajoutez votre première session review
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de détail */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedReview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Session du {new Date(selectedReview.session_date).toLocaleDateString('fr-FR')}
                </DialogTitle>
                <DialogDescription>
                  {selectedReview.game_type} - {formatDuration(selectedReview.duration_minutes)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className={getRatingColor(selectedReview.game_rating)}>
                    Évaluation: {selectedReview.game_rating}
                  </Badge>
                  <div className={`flex items-center gap-1 font-medium ${getProfitColor(selectedReview.profit_loss)}`}>
                    {getProfitIcon(selectedReview.profit_loss)}
                    {selectedReview.profit_loss >= 0 ? '+' : ''}{selectedReview.profit_loss.toFixed(2)}€
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedReview.hands_played}</div>
                    <div className="text-sm text-muted-foreground">Mains jouées</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedReview.key_hands}</div>
                    <div className="text-sm text-muted-foreground">Mains clés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {(selectedReview.profit_loss / (selectedReview.duration_minutes / 60)).toFixed(1)}€
                    </div>
                    <div className="text-sm text-muted-foreground">€/heure</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {(selectedReview.profit_loss / selectedReview.hands_played * 100).toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">bb/100</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes techniques
                    </h4>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm leading-relaxed">
                          {selectedReview.technical_notes || 'Aucune note technique renseignée.'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Notes mentales
                    </h4>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm leading-relaxed">
                          {selectedReview.mental_notes || 'Aucune note mentale renseignée.'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="pt-4 border-t text-sm text-muted-foreground">
                  Créé le {new Date(selectedReview.created_at).toLocaleDateString('fr-FR')} à {new Date(selectedReview.created_at).toLocaleTimeString('fr-FR')}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}