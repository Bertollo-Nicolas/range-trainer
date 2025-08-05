'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Plus, ArrowLeft, BarChart3, Clock, Star, 
  TrendingUp, Calendar, Edit, Trash2 
} from 'lucide-react'
import { PokerMindService } from '@/lib/services/pokermind-service'
import { SessionReview, GameQuality } from '@/types/pokermind'
import Link from 'next/link'

// Composant SessionReviewCard
function SessionReviewCard({ 
  review, 
  onEdit, 
  onDelete 
}: { 
  review: SessionReview
  onEdit: (review: SessionReview) => void
  onDelete: (reviewId: string) => void
}) {
  const getQualityColor = (quality: GameQuality) => {
    switch (quality) {
      case 'A': return 'bg-green-500 text-white'
      case 'B': return 'bg-blue-500 text-white'
      case 'C': return 'bg-orange-500 text-white'
      default: return 'bg-gray-300 text-gray-700'
    }
  }

  const getQualityLabel = (quality: GameQuality) => {
    switch (quality) {
      case 'A': return 'Excellent'
      case 'B': return 'Bon'
      case 'C': return 'À améliorer'
      default: return quality
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}min` : ''}` : `${mins}min`
  }

  const daysSinceSession = Math.floor((new Date().getTime() - new Date(review.date).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-lg">{review.gameType}</CardTitle>
              <Badge className={getQualityColor(review.selfAssessment)}>
                {getQualityLabel(review.selfAssessment)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(review.date).toLocaleDateString('fr-FR')}
                {daysSinceSession === 0 && <span className="text-primary">(Aujourd'hui)</span>}
                {daysSinceSession === 1 && <span>(Hier)</span>}
                {daysSinceSession > 1 && <span>(Il y a {daysSinceSession} jours)</span>}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(review.duration)}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(review)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(review.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Notes techniques */}
        {review.technicalNotes && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Notes techniques
            </h4>
            <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded whitespace-pre-wrap">
              {review.technicalNotes}
            </p>
          </div>
        )}
        
        {/* Notes mentales */}
        {review.mentalNotes && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
              <Star className="h-4 w-4" />
              Notes mentales
            </h4>
            <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded whitespace-pre-wrap">
              {review.mentalNotes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Dialog pour créer/éditer une session review
function SessionReviewDialog({ 
  review, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  review?: SessionReview
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}) {
  const [date, setDate] = useState(
    review?.date ? new Date(review.date).toISOString().split('T')[0] : 
    new Date().toISOString().split('T')[0]
  )
  const [gameType, setGameType] = useState(review?.gameType || '')
  const [duration, setDuration] = useState(review?.duration?.toString() || '')
  const [selfAssessment, setSelfAssessment] = useState<GameQuality>(review?.selfAssessment || 'B')
  const [technicalNotes, setTechnicalNotes] = useState(review?.technicalNotes || '')
  const [mentalNotes, setMentalNotes] = useState(review?.mentalNotes || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (review) {
      setDate(new Date(review.date).toISOString().split('T')[0])
      setGameType(review.gameType)
      setDuration(review.duration.toString())
      setSelfAssessment(review.selfAssessment)
      setTechnicalNotes(review.technicalNotes)
      setMentalNotes(review.mentalNotes)
    } else {
      setDate(new Date().toISOString().split('T')[0])
      setGameType('')
      setDuration('')
      setSelfAssessment('B')
      setTechnicalNotes('')
      setMentalNotes('')
    }
  }, [review])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gameType.trim() || !duration || parseInt(duration) <= 0) return

    setIsSaving(true)
    try {
      if (review) {
        await PokerMindService.updateSessionReview(review.id, {
          date: new Date(date),
          gameType: gameType.trim(),
          duration: parseInt(duration),
          selfAssessment,
          technicalNotes: technicalNotes.trim(),
          mentalNotes: mentalNotes.trim()
        })
      } else {
        await PokerMindService.createSessionReview({
          date: new Date(date),
          gameType: gameType.trim(),
          duration: parseInt(duration),
          selfAssessment,
          technicalNotes: technicalNotes.trim(),
          mentalNotes: mentalNotes.trim()
        })
      }
      onSave()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {review ? 'Modifier la session review' : 'Nouvelle session review'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Durée (minutes)</label>
              <Input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="120"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Type de jeu</label>
            <Input
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
              placeholder="ex: Cash NL50 6max, MTT €22, SNG €11..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Auto-évaluation</label>
            <Select value={selfAssessment} onValueChange={(value: GameQuality) => setSelfAssessment(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A - Excellent jeu</SelectItem>
                <SelectItem value="B">B - Bon jeu</SelectItem>
                <SelectItem value="C">C - Jeu à améliorer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Notes techniques (spots, ranges, sizing, etc.)
            </label>
            <Textarea
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="Décrivez les points techniques observés, les spots intéressants, les ajustements à faire..."
              rows={4}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Notes mentales (focus, tilt, patience, etc.)
            </label>
            <Textarea
              value={mentalNotes}
              onChange={(e) => setMentalNotes(e.target.value)}
              placeholder="Comment était votre état mental ? Quels aspects mentaux à travailler ?"
              rows={4}
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!gameType.trim() || !duration || parseInt(duration) <= 0 || isSaving}>
              {isSaving ? 'Sauvegarde...' : review ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function SessionReviewsPage() {
  const [reviews, setReviews] = useState<SessionReview[]>([])
  const [filteredReviews, setFilteredReviews] = useState<SessionReview[]>([])
  const [loading, setLoading] = useState(true)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<SessionReview | undefined>()
  
  // Filtres
  const [gameTypeFilter, setGameTypeFilter] = useState('all')
  const [qualityFilter, setQualityFilter] = useState<GameQuality | 'all'>('all')
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month')

  const loadReviews = async () => {
    try {
      const allReviews = await PokerMindService.getSessionReviews()
      const sortedReviews = allReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setReviews(sortedReviews)
      setFilteredReviews(sortedReviews)
    } catch (error) {
      console.error('Error loading session reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  // Appliquer les filtres
  useEffect(() => {
    let filtered = reviews

    // Filtre par type de jeu
    if (gameTypeFilter !== 'all') {
      filtered = filtered.filter(review => 
        review.gameType.toLowerCase().includes(gameTypeFilter.toLowerCase())
      )
    }

    // Filtre par qualité
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(review => review.selfAssessment === qualityFilter)
    }

    // Filtre par date
    if (dateRange !== 'all') {
      const now = new Date()
      const cutoffDate = new Date()
      
      if (dateRange === 'week') {
        cutoffDate.setDate(now.getDate() - 7)
      } else if (dateRange === 'month') {
        cutoffDate.setMonth(now.getMonth() - 1)
      }
      
      filtered = filtered.filter(review => new Date(review.date) >= cutoffDate)
    }

    setFilteredReviews(filtered)
  }, [reviews, gameTypeFilter, qualityFilter, dateRange])

  const handleReviewSave = () => {
    loadReviews()
    setEditingReview(undefined)
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette session review ?')) {
      await PokerMindService.deleteSessionReview(reviewId)
      await loadReviews()
    }
  }

  // Stats
  const totalSessions = reviews.length
  const totalHours = Math.round(reviews.reduce((sum, r) => sum + r.duration, 0) / 60 * 10) / 10
  const avgSessionLength = totalSessions > 0 ? Math.round(reviews.reduce((sum, r) => sum + r.duration, 0) / totalSessions) : 0
  const qualityDistribution = {
    A: reviews.filter(r => r.selfAssessment === 'A').length,
    B: reviews.filter(r => r.selfAssessment === 'B').length,
    C: reviews.filter(r => r.selfAssessment === 'C').length
  }
  const avgQuality = totalSessions > 0 
    ? ((qualityDistribution.A * 3 + qualityDistribution.B * 2 + qualityDistribution.C * 1) / totalSessions).toFixed(1)
    : '0'

  // Game types uniques pour le filtre
  const uniqueGameTypes = Array.from(new Set(reviews.map(r => r.gameType))).sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p>Chargement des session reviews...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/pokermind">
                <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground" />
              </Link>
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Session Reviews</h1>
                  <p className="text-sm text-muted-foreground">
                    Analysez et évaluez vos sessions de jeu
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => setIsReviewDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle review
            </Button>
          </div>
        </div>
      </header>

      {/* Stats & Filters */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{totalSessions}</p>
                  <p className="text-sm text-muted-foreground">Sessions totales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{totalHours}h</p>
                  <p className="text-sm text-muted-foreground">Temps total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{avgSessionLength}min</p>
                  <p className="text-sm text-muted-foreground">Durée moyenne</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{avgQuality}/3</p>
                  <p className="text-sm text-muted-foreground">Qualité moyenne</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution des qualités */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Distribution des auto-évaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{qualityDistribution.A}</div>
                <div className="text-sm text-muted-foreground">Excellentes (A)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{qualityDistribution.B}</div>
                <div className="text-sm text-muted-foreground">Bonnes (B)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{qualityDistribution.C}</div>
                <div className="text-sm text-muted-foreground">À améliorer (C)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type de jeu</label>
                <Select value={gameTypeFilter} onValueChange={setGameTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {uniqueGameTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Qualité</label>
                <Select value={qualityFilter} onValueChange={(value: GameQuality | 'all') => setQualityFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes qualités..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes qualités</SelectItem>
                    <SelectItem value="A">A - Excellentes</SelectItem>
                    <SelectItem value="B">B - Bonnes</SelectItem>
                    <SelectItem value="C">C - À améliorer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Période</label>
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">7 derniers jours</SelectItem>
                    <SelectItem value="month">30 derniers jours</SelectItem>
                    <SelectItem value="all">Toutes les sessions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews */}
        {filteredReviews.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredReviews.map(review => (
              <SessionReviewCard
                key={review.id}
                review={review}
                onEdit={(review) => {
                  setEditingReview(review)
                  setIsReviewDialogOpen(true)
                }}
                onDelete={handleDeleteReview}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {reviews.length === 0 ? 'Aucune session review' : 'Aucun résultat'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {reviews.length === 0 
                ? 'Commencez par créer la review de votre première session'
                : 'Essayez de modifier vos filtres de recherche'
              }
            </p>
            {reviews.length === 0 && (
              <Button onClick={() => setIsReviewDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Première review
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <SessionReviewDialog
        {...(editingReview && { review: editingReview })}
        isOpen={isReviewDialogOpen}
        onClose={() => {
          setIsReviewDialogOpen(false)
          setEditingReview(undefined)
        }}
        onSave={handleReviewSave}
      />
    </div>
  )
}