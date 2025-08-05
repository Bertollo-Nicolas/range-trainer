'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Plus, ArrowLeft, BookOpen, Search, Filter, 
  Heart, TrendingUp, Edit, Trash2 
} from 'lucide-react'
import { PokerMindService } from '@/lib/services/pokermind-service'
import { JournalEntry, MentalTag, GameQuality } from '@/types/pokermind'
import Link from 'next/link'

// Composant MoodSlider pour le journal
function MoodSlider({ 
  value, 
  onChange 
}: { 
  value: number
  onChange: (value: number) => void
}) {
  const getMoodColor = (mood: number) => {
    if (mood >= 3) return 'text-green-500'
    if (mood >= 1) return 'text-blue-500'
    if (mood >= -1) return 'text-gray-500'
    if (mood >= -3) return 'text-orange-500'
    return 'text-red-500'
  }

  const getMoodEmoji = (mood: number) => {
    if (mood >= 4) return '😄'
    if (mood >= 2) return '😊'
    if (mood >= 0) return '😐'
    if (mood >= -2) return '😔'
    return '😞'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Humeur</span>
        <span className={`text-2xl ${getMoodColor(value)}`}>
          {getMoodEmoji(value)} {value > 0 ? '+' : ''}{value}
        </span>
      </div>
      <input
        type="range"
        min="-5"
        max="5"
        step="1"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>-5</span>
        <span>0</span>
        <span>+5</span>
      </div>
    </div>
  )
}

// Composant TagSelector
function TagSelector({ 
  selectedTags, 
  onTagsChange 
}: { 
  selectedTags: MentalTag[]
  onTagsChange: (tags: MentalTag[]) => void
}) {
  const allTags: MentalTag[] = ['Tilt', 'Motivation', 'Patience', 'Focus', 'Stress', 'Confidence']
  
  const toggleTag = (tag: MentalTag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const getTagColor = (tag: MentalTag) => {
    switch (tag) {
      case 'Tilt': return 'bg-red-100 text-red-800 hover:bg-red-200'
      case 'Motivation': return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'Patience': return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      case 'Focus': return 'bg-purple-100 text-purple-800 hover:bg-purple-200'
      case 'Stress': return 'bg-orange-100 text-orange-800 hover:bg-orange-200'
      case 'Confidence': return 'bg-pink-100 text-pink-800 hover:bg-pink-200'
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Tags mentaux</label>
      <div className="flex flex-wrap gap-2">
        {allTags.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`
              px-3 py-1 rounded-full text-sm font-medium transition-colors
              ${selectedTags.includes(tag) 
                ? getTagColor(tag) + ' ring-2 ring-offset-1 ring-current' 
                : getTagColor(tag) + ' opacity-60'
              }
            `}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}

// Composant JournalEntryCard
function JournalEntryCard({ 
  entry, 
  onEdit, 
  onDelete 
}: { 
  entry: JournalEntry
  onEdit: (entry: JournalEntry) => void
  onDelete: (entryId: string) => void
}) {
  const getMoodColor = (mood: number) => {
    if (mood >= 3) return 'text-green-500'
    if (mood >= 1) return 'text-blue-500'
    if (mood >= -1) return 'text-gray-500'
    if (mood >= -3) return 'text-orange-500'
    return 'text-red-500'
  }

  const getMoodEmoji = (mood: number) => {
    if (mood >= 4) return '😄'
    if (mood >= 2) return '😊'
    if (mood >= 0) return '😐'
    if (mood >= -2) return '😔'
    return '😞'
  }

  const getTagColor = (tag: MentalTag) => {
    switch (tag) {
      case 'Tilt': return 'bg-red-100 text-red-800'
      case 'Motivation': return 'bg-green-100 text-green-800'
      case 'Patience': return 'bg-blue-100 text-blue-800'
      case 'Focus': return 'bg-purple-100 text-purple-800'
      case 'Stress': return 'bg-orange-100 text-orange-800'
      case 'Confidence': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getQualityColor = (quality?: GameQuality) => {
    switch (quality) {
      case 'A': return 'bg-green-500 text-white'
      case 'B': return 'bg-blue-500 text-white'
      case 'C': return 'bg-orange-500 text-white'
      default: return 'bg-gray-300 text-gray-700'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {new Date(entry.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
              <div className={`text-xl ${getMoodColor(entry.mood)}`}>
                {getMoodEmoji(entry.mood)} {entry.mood > 0 ? '+' : ''}{entry.mood}
              </div>
              {entry.gameQuality && (
                <Badge className={getQualityColor(entry.gameQuality)}>
                  Jeu: {entry.gameQuality}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {entry.tags.map(tag => (
                <Badge key={tag} className={getTagColor(tag) + ' text-xs'}>
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(entry.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
      </CardContent>
    </Card>
  )
}

// Dialog pour créer/éditer une entrée
function JournalDialog({ 
  entry, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  entry?: JournalEntry
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}) {
  const [date, setDate] = useState(
    entry?.date ? new Date(entry.date).toISOString().split('T')[0] : 
    new Date().toISOString().split('T')[0]
  )
  const [content, setContent] = useState(entry?.content || '')
  const [mood, setMood] = useState(entry?.mood || 0)
  const [gameQuality, setGameQuality] = useState<GameQuality | 'none'>( entry?.gameQuality || 'none')
  const [tags, setTags] = useState<MentalTag[]>(entry?.tags || [])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (entry) {
      setDate(new Date(entry.date).toISOString().split('T')[0])
      setContent(entry.content)
      setMood(entry.mood)
      setGameQuality(entry.gameQuality || 'none')
      setTags(entry.tags)
    } else {
      setDate(new Date().toISOString().split('T')[0])
      setContent('')
      setMood(0)
      setGameQuality('none')
      setTags([])
    }
  }, [entry])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsSaving(true)
    try {
      if (entry) {
        await PokerMindService.updateJournalEntry(entry.id, {
          date: new Date(date),
          content: content.trim(),
          mood,
          ...(gameQuality !== 'none' && { gameQuality: gameQuality as GameQuality }),
          tags
        })
      } else {
        await PokerMindService.createJournalEntry({
          date: new Date(date),
          content: content.trim(),
          mood,
          ...(gameQuality !== 'none' && { gameQuality: gameQuality as GameQuality }),
          tags
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
            {entry ? 'Modifier l\'entrée' : 'Nouvelle entrée de journal'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-4">
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
            <label className="block text-sm font-medium mb-2">Contenu</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Décrivez votre journée, vos pensées, vos expériences de jeu..."
              rows={6}
              required
            />
          </div>
          
          <MoodSlider value={mood} onChange={setMood} />
          
          <div>
            <label className="block text-sm font-medium mb-2">Qualité du jeu (optionnel)</label>
            <Select value={gameQuality} onValueChange={(value: GameQuality | 'none') => setGameQuality(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune évaluation</SelectItem>
                <SelectItem value="A">A - Excellent jeu</SelectItem>
                <SelectItem value="B">B - Bon jeu</SelectItem>
                <SelectItem value="C">C - Jeu à améliorer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <TagSelector selectedTags={tags} onTagsChange={setTags} />
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!content.trim() || isSaving}>
              {isSaving ? 'Sauvegarde...' : entry ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | undefined>()
  
  // Filtres
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<MentalTag | 'all'>('all')
  const [selectedMoodRange, setSelectedMoodRange] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all')

  const loadEntries = async () => {
    try {
      const allEntries = await PokerMindService.getJournalEntries()
      const sortedEntries = allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEntries(sortedEntries)
      setFilteredEntries(sortedEntries)
    } catch (error) {
      console.error('Error loading journal entries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  // Appliquer les filtres
  useEffect(() => {
    let filtered = entries

    // Filtre par recherche
    if (searchQuery) {
      filtered = filtered.filter(entry => 
        entry.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filtre par tag
    if (selectedTag !== 'all') {
      filtered = filtered.filter(entry => entry.tags.includes(selectedTag as MentalTag))
    }

    // Filtre par humeur
    if (selectedMoodRange !== 'all') {
      filtered = filtered.filter(entry => {
        switch (selectedMoodRange) {
          case 'positive': return entry.mood > 0
          case 'neutral': return entry.mood === 0
          case 'negative': return entry.mood < 0
          default: return true
        }
      })
    }

    setFilteredEntries(filtered)
  }, [entries, searchQuery, selectedTag, selectedMoodRange])

  const handleEntrySave = () => {
    loadEntries()
    setEditingEntry(undefined)
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
      await PokerMindService.deleteJournalEntry(entryId)
      await loadEntries()
    }
  }

  // Stats
  const avgMood = entries.length > 0 ? (entries.reduce((sum, e) => sum + e.mood, 0) / entries.length).toPrecision(2) : '0'
  const positiveEntries = entries.filter(e => e.mood > 0).length
  const allTags: MentalTag[] = ['Tilt', 'Motivation', 'Patience', 'Focus', 'Stress', 'Confidence']
  const mostUsedTag = allTags.reduce((most, tag) => {
    const count = entries.filter(e => e.tags.includes(tag)).length
    const mostCount = entries.filter(e => e.tags.includes(most)).length
    return count > mostCount ? tag : most
  }, allTags[0])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p>Chargement du journal...</p>
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
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Journal Mental</h1>
                  <p className="text-sm text-muted-foreground">
                    Suivez votre état mental et vos progrès
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => setIsEntryDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle entrée
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
                <BookOpen className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{entries.length}</p>
                  <p className="text-sm text-muted-foreground">Entrées totales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{avgMood}</p>
                  <p className="text-sm text-muted-foreground">Humeur moyenne</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{positiveEntries}</p>
                  <p className="text-sm text-muted-foreground">Entrées positives</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-lg font-bold">{mostUsedTag}</p>
                  <p className="text-sm text-muted-foreground">Tag principal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans le contenu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedTag} onValueChange={(value: MentalTag | 'all') => setSelectedTag(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par tag..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedMoodRange} onValueChange={(value: any) => setSelectedMoodRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les humeurs</SelectItem>
                  <SelectItem value="positive">Positives (+1 à +5)</SelectItem>
                  <SelectItem value="neutral">Neutres (0)</SelectItem>
                  <SelectItem value="negative">Négatives (-1 à -5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Entries */}
        {filteredEntries.length > 0 ? (
          <div className="space-y-4">
            {filteredEntries.map(entry => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onEdit={(entry) => {
                  setEditingEntry(entry)
                  setIsEntryDialogOpen(true)
                }}
                onDelete={handleDeleteEntry}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {entries.length === 0 ? 'Aucune entrée' : 'Aucun résultat'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {entries.length === 0 
                ? 'Commencez par écrire votre première entrée de journal'
                : 'Essayez de modifier vos filtres de recherche'
              }
            </p>
            {entries.length === 0 && (
              <Button onClick={() => setIsEntryDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Première entrée
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Entry Dialog */}
      <JournalDialog
        {...(editingEntry && { entry: editingEntry })}
        isOpen={isEntryDialogOpen}
        onClose={() => {
          setIsEntryDialogOpen(false)
          setEditingEntry(undefined)
        }}
        onSave={handleEntrySave}
      />
    </div>
  )
}