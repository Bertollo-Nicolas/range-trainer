'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
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
  Edit3,
  Calendar,
  Hash,
  Smile,
  Frown,
  Meh,
  Trophy
} from 'lucide-react'
import { JournalEntry, MoodValue, MENTAL_TAGS } from '@/types/mind'

const mockEntries: JournalEntry[] = [
  {
    id: '1',
    content: 'Excellente session aujourd\'hui. J\'ai réussi à rester calme même après une bad beat importante. La méditation du matin a vraiment aidé.',
    mood: 3,
    game_quality: 'A',
    tags: ['motivation', 'patience'],
    date: '2024-01-10',
    created_at: '2024-01-10T14:30:00Z',
    updated_at: '2024-01-10T14:30:00Z'
  },
  {
    id: '2',
    content: 'Difficile de me concentrer aujourd\'hui. Trop de distractions et j\'ai fait quelques erreurs basiques. À améliorer demain.',
    mood: -2,
    game_quality: 'C',
    tags: ['concentration', 'discipline'],
    date: '2024-01-09',
    created_at: '2024-01-09T18:45:00Z',
    updated_at: '2024-01-09T18:45:00Z'
  },
  {
    id: '3',
    content: 'Session moyenne, quelques bons spots mais aussi des leaks mentaux à travailler. Le tilt léger m\'a fait perdre 2-3 pots.',
    mood: 0,
    game_quality: 'B',
    tags: ['tilt', 'auto_controle'],
    date: '2024-01-08',
    created_at: '2024-01-08T16:20:00Z',
    updated_at: '2024-01-08T16:20:00Z'
  }
]

export function MentalJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>(mockEntries)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMood, setFilterMood] = useState<string>('all')
  const [filterRating, setFilterRating] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string>('all')

  // Form state pour nouvelle entrée
  const [newEntry, setNewEntry] = useState({
    content: '',
    mood: 0 as MoodValue,
    game_quality: 'B' as 'A' | 'B' | 'C' | null,
    tags: [] as string[]
  })

  const getMoodIcon = (mood: number) => {
    if (mood >= 2) return <Smile className="h-4 w-4 text-green-500" />
    if (mood <= -2) return <Frown className="h-4 w-4 text-red-500" />
    return <Meh className="h-4 w-4 text-yellow-500" />
  }

  const getMoodColor = (mood: number) => {
    if (mood >= 2) return 'text-green-600'
    if (mood <= -2) return 'text-red-600'
    return 'text-yellow-600'
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'A': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'B': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'C': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTagColor = (tagKey: string) => {
    const tag = MENTAL_TAGS.find(t => t.key === tagKey)
    return tag?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const getTagLabel = (tagKey: string) => {
    const tag = MENTAL_TAGS.find(t => t.key === tagKey)
    return tag?.label || tagKey
  }

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMood = filterMood === 'all' || 
      (filterMood === 'positive' && entry.mood > 0) ||
      (filterMood === 'neutral' && entry.mood === 0) ||
      (filterMood === 'negative' && entry.mood < 0)
    const matchesRating = filterRating === 'all' || entry.game_quality === filterRating
    const matchesTag = filterTag === 'all' || entry.tags.includes(filterTag)

    return matchesSearch && matchesMood && matchesRating && matchesTag
  })

  const toggleTag = (tagKey: string) => {
    setNewEntry(prev => ({
      ...prev,
      tags: prev.tags.includes(tagKey)
        ? prev.tags.filter(t => t !== tagKey)
        : [...prev.tags, tagKey]
    }))
  }

  const addEntry = () => {
    if (!newEntry.content.trim()) return

    const entry: JournalEntry = {
      id: Date.now().toString(),
      content: newEntry.content,
      mood: newEntry.mood,
      game_quality: newEntry.game_quality,
      tags: newEntry.tags,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setEntries([entry, ...entries])
    setNewEntry({
      content: '',
      mood: 0,
      game_quality: 'B',
      tags: []
    })
    setIsAddDialogOpen(false)
  }

  const tagsByCategory = MENTAL_TAGS.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = []
    acc[tag.category].push(tag)
    return acc
  }, {} as Record<string, typeof MENTAL_TAGS>)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Journal Mental</h1>
          <p className="text-muted-foreground">Documentez vos sessions et votre état mental</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle entrée
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle entrée journal</DialogTitle>
              <DialogDescription>
                Documentez votre session et votre état mental
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Contenu */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Contenu</label>
                <Textarea
                  placeholder="Décrivez votre session, vos pensées, vos émotions..."
                  value={newEntry.content}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Humeur */}
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    {getMoodIcon(newEntry.mood)}
                    Humeur
                  </label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>-5</span>
                      <span className={`font-medium ${getMoodColor(newEntry.mood)}`}>
                        {newEntry.mood > 0 ? '+' : ''}{newEntry.mood}
                      </span>
                      <span>+5</span>
                    </div>
                    <Slider
                      value={[newEntry.mood + 5]}
                      onValueChange={([value]) => setNewEntry(prev => ({ 
                        ...prev, 
                        mood: (value - 5) as MoodValue 
                      }))}
                      max={10}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Qualité du jeu */}
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Qualité du jeu
                  </label>
                  <Select 
                    value={newEntry.game_quality || 'B'} 
                    onValueChange={(value: 'A' | 'B' | 'C') => 
                      setNewEntry(prev => ({ ...prev, game_quality: value }))
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

              {/* Tags mentaux */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Tags mentaux
                </label>
                <div className="space-y-4">
                  {Object.entries(tagsByCategory).map(([category, tags]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase">
                        {category}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Badge
                            key={tag.key}
                            variant={newEntry.tags.includes(tag.key) ? "default" : "outline"}
                            className={`cursor-pointer transition-all ${
                              newEntry.tags.includes(tag.key) ? tag.color : ''
                            }`}
                            onClick={() => toggleTag(tag.key)}
                          >
                            {tag.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={addEntry} disabled={!newEntry.content.trim()}>
                  Ajouter l'entrée
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les entrées..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterMood} onValueChange={setFilterMood}>
              <SelectTrigger>
                <SelectValue placeholder="Humeur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes humeurs</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutre</SelectItem>
                <SelectItem value="negative">Négative</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger>
                <SelectValue placeholder="Qualité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes qualités</SelectItem>
                <SelectItem value="A">A - Excellent</SelectItem>
                <SelectItem value="B">B - Correct</SelectItem>
                <SelectItem value="C">C - Décevant</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger>
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les tags</SelectItem>
                {MENTAL_TAGS.map(tag => (
                  <SelectItem key={tag.key} value={tag.key}>
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Historique des entrées */}
      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <Card key={entry.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getMoodIcon(entry.mood)}
                  <span className={`text-sm font-medium ${getMoodColor(entry.mood)}`}>
                    {entry.mood > 0 ? '+' : ''}{entry.mood}
                  </span>
                  <Badge variant="outline" className={getRatingColor(entry.game_quality || 'B')}>
                    {entry.game_quality || 'B'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{entry.content}</p>
              
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tagKey) => (
                    <Badge
                      key={tagKey}
                      variant="secondary"
                      className={getTagColor(tagKey)}
                    >
                      {getTagLabel(tagKey)}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredEntries.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Edit3 className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium">Aucune entrée trouvée</h3>
                <p className="text-muted-foreground">
                  Modifiez vos filtres ou ajoutez votre première entrée
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}