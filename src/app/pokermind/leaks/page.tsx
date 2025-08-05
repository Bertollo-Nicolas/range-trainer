'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Plus, ArrowLeft, AlertTriangle, CheckCircle, 
  Brain, Search, Edit, Trash2, Link as LinkIcon 
} from 'lucide-react'
import { PokerMindService } from '@/lib/services/pokermind-service'
import { MentalLeak, LeakStatus, JournalEntry } from '@/types/pokermind'
import Link from 'next/link'

// Composant MentalLeakCard
function MentalLeakCard({ 
  leak, 
  linkedEntries, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: { 
  leak: MentalLeak
  linkedEntries: JournalEntry[]
  onEdit: (leak: MentalLeak) => void
  onDelete: (leakId: string) => void
  onStatusChange: (leakId: string, status: LeakStatus) => void
}) {
  const getStatusColor = (status: LeakStatus) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: LeakStatus) => {
    switch (status) {
      case 'active': return <AlertTriangle className="h-4 w-4" />
      case 'resolved': return <CheckCircle className="h-4 w-4" />
      default: return <Brain className="h-4 w-4" />
    }
  }

  const daysSinceCreated = Math.floor((new Date().getTime() - new Date(leak.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const daysSinceResolved = leak.resolvedAt 
    ? Math.floor((new Date().getTime() - new Date(leak.resolvedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{leak.title}</CardTitle>
              <Badge className={getStatusColor(leak.status)}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(leak.status)}
                  {leak.status === 'active' ? 'Actif' : 'Résolu'}
                </div>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Identifié il y a {daysSinceCreated} jour{daysSinceCreated > 1 ? 's' : ''}
              {daysSinceResolved !== null && (
                <span> • Résolu il y a {daysSinceResolved} jour{daysSinceResolved > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(leak)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(leak.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Déclencheur */}
        <div>
          <h4 className="font-medium text-sm mb-1">🎯 Déclencheur</h4>
          <p className="text-sm text-muted-foreground">{leak.trigger}</p>
        </div>
        
        {/* Pensée automatique */}
        <div>
          <h4 className="font-medium text-sm mb-1">💭 Pensée automatique</h4>
          <p className="text-sm text-muted-foreground italic">"{leak.automaticThought}"</p>
        </div>
        
        {/* Réflexe mental */}
        <div>
          <h4 className="font-medium text-sm mb-1">🧠 Réflexe mental cible</h4>
          <p className="text-sm text-muted-foreground font-medium">{leak.mentalReflex}</p>
        </div>
        
        {/* Entrées de journal liées */}
        {linkedEntries.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-sm font-medium mb-2">
              <LinkIcon className="h-4 w-4" />
              Entrées de journal liées ({linkedEntries.length})
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {linkedEntries.map(entry => (
                <div key={entry.id} className="text-xs p-2 bg-gray-50 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {new Date(entry.date).toLocaleDateString('fr-FR')}
                    </span>
                    <div className="flex gap-1">
                      {entry.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs h-4">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2">{entry.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Actions de statut */}
        <div className="flex gap-2 pt-2 border-t">
          {leak.status === 'active' ? (
            <Button 
              size="sm" 
              onClick={() => onStatusChange(leak.id, 'resolved')}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Marquer comme résolu
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onStatusChange(leak.id, 'active')}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Réactiver
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Dialog pour créer/éditer un mental leak
function MentalLeakDialog({ 
  leak, 
  isOpen, 
  onClose, 
  onSave,
  availableEntries
}: { 
  leak?: MentalLeak
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  availableEntries: JournalEntry[]
}) {
  const [title, setTitle] = useState(leak?.title || '')
  const [trigger, setTrigger] = useState(leak?.trigger || '')
  const [automaticThought, setAutomaticThought] = useState(leak?.automaticThought || '')
  const [mentalReflex, setMentalReflex] = useState(leak?.mentalReflex || '')
  const [linkedEntryIds, setLinkedEntryIds] = useState<string[]>(leak?.linkedJournalEntries || [])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (leak) {
      setTitle(leak.title)
      setTrigger(leak.trigger)
      setAutomaticThought(leak.automaticThought)
      setMentalReflex(leak.mentalReflex)
      setLinkedEntryIds(leak.linkedJournalEntries)
    } else {
      setTitle('')
      setTrigger('')
      setAutomaticThought('')
      setMentalReflex('')
      setLinkedEntryIds([])
    }
  }, [leak])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !trigger.trim() || !automaticThought.trim() || !mentalReflex.trim()) return

    setIsSaving(true)
    try {
      if (leak) {
        await PokerMindService.updateMentalLeak(leak.id, {
          title: title.trim(),
          trigger: trigger.trim(),
          automaticThought: automaticThought.trim(),
          mentalReflex: mentalReflex.trim(),
          linkedJournalEntries: linkedEntryIds
        })
      } else {
        await PokerMindService.createMentalLeak({
          title: title.trim(),
          trigger: trigger.trim(),
          automaticThought: automaticThought.trim(),
          mentalReflex: mentalReflex.trim(),
          status: 'active',
          linkedJournalEntries: linkedEntryIds
        })
      }
      onSave()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const toggleEntryLink = (entryId: string) => {
    setLinkedEntryIds(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {leak ? 'Modifier le mental leak' : 'Nouveau mental leak'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Titre / Nom du leak
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Tilt après bad beat"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              🎯 Déclencheur (situation qui active le leak)
            </label>
            <Textarea
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="ex: Recevoir un bad beat sur une grosse main"
              rows={2}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              💭 Pensée automatique (ce que je me dis)
            </label>
            <Textarea
              value={automaticThought}
              onChange={(e) => setAutomaticThought(e.target.value)}
              placeholder="ex: Ce jeu est truqué, je n'ai aucune chance"
              rows={2}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              🧠 Réflexe mental cible (nouvelle réaction à adopter)
            </label>
            <Textarea
              value={mentalReflex}
              onChange={(e) => setMentalReflex(e.target.value)}
              placeholder="ex: Respirer profondément, analyser la situation objectivement, continuer avec ma stratégie"
              rows={2}
              required
            />
          </div>
          
          {/* Liaison avec les entrées de journal */}
          {availableEntries.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Entrées de journal liées (optionnel)
              </label>
              <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                {availableEntries.map(entry => (
                  <label key={entry.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={linkedEntryIds.includes(entry.id)}
                      onChange={() => toggleEntryLink(entry.id)}
                      className="rounded mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {new Date(entry.date).toLocaleDateString('fr-FR')}
                        </span>
                        <div className="flex gap-1">
                          {entry.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {entry.content}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!title.trim() || !trigger.trim() || !automaticThought.trim() || !mentalReflex.trim() || isSaving}>
              {isSaving ? 'Sauvegarde...' : leak ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function MentalLeaksPage() {
  const [leaks, setLeaks] = useState<MentalLeak[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [filteredLeaks, setFilteredLeaks] = useState<MentalLeak[]>([])
  const [loading, setLoading] = useState(true)
  const [isLeakDialogOpen, setIsLeakDialogOpen] = useState(false)
  const [editingLeak, setEditingLeak] = useState<MentalLeak | undefined>()
  
  // Filtres
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all')

  const loadData = async () => {
    try {
      const [allLeaks, allEntries] = await Promise.all([
        PokerMindService.getMentalLeaks(),
        PokerMindService.getJournalEntries()
      ])
      const sortedLeaks = allLeaks.sort((a, b) => {
        // Actifs en premier, puis par date de création décroissante
        if (a.status !== b.status) {
          return a.status === 'active' ? -1 : 1
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      setLeaks(sortedLeaks)
      setFilteredLeaks(sortedLeaks)
      setJournalEntries(allEntries)
    } catch (error) {
      console.error('Error loading mental leaks data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Appliquer les filtres
  useEffect(() => {
    let filtered = leaks

    // Filtre par recherche
    if (searchQuery) {
      filtered = filtered.filter(leak => 
        leak.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leak.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leak.automaticThought.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leak.mentalReflex.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(leak => leak.status === statusFilter)
    }

    setFilteredLeaks(filtered)
  }, [leaks, searchQuery, statusFilter])

  const handleLeakSave = () => {
    loadData()
    setEditingLeak(undefined)
  }

  const handleDeleteLeak = async (leakId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce mental leak ?')) {
      await PokerMindService.deleteMentalLeak(leakId)
      await loadData()
    }
  }

  const handleStatusChange = async (leakId: string, status: LeakStatus) => {
    await PokerMindService.updateMentalLeak(leakId, { status })
    await loadData()
  }

  const getLinkedEntries = (leak: MentalLeak) => {
    return journalEntries.filter(e => leak.linkedJournalEntries.includes(e.id))
  }

  // Stats
  const activeLeaks = leaks.filter(l => l.status === 'active').length
  const resolvedLeaks = leaks.filter(l => l.status === 'resolved').length
  const totalLinkedEntries = leaks.reduce((sum, l) => sum + l.linkedJournalEntries.length, 0)
  const avgTimeToResolve = resolvedLeaks > 0 
    ? Math.round(leaks
        .filter(l => l.status === 'resolved' && l.resolvedAt)
        .reduce((sum, l) => {
          const days = Math.floor((new Date(l.resolvedAt!).getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0) / resolvedLeaks)
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p>Chargement des mental leaks...</p>
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
                <Brain className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Mental Leak Tracker</h1>
                  <p className="text-sm text-muted-foreground">
                    Identifiez et corrigez vos fuites mentales
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => setIsLeakDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau leak
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
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{activeLeaks}</p>
                  <p className="text-sm text-muted-foreground">Leaks actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{resolvedLeaks}</p>
                  <p className="text-sm text-muted-foreground">Leaks résolus</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <LinkIcon className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{totalLinkedEntries}</p>
                  <p className="text-sm text-muted-foreground">Entrées liées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{avgTimeToResolve}</p>
                  <p className="text-sm text-muted-foreground">Jours moy. résolution</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les leaks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Tous ({leaks.length})
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  className="text-red-600"
                >
                  Actifs ({activeLeaks})
                </Button>
                <Button
                  variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('resolved')}
                  className="text-green-600"
                >
                  Résolus ({resolvedLeaks})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaks */}
        {filteredLeaks.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredLeaks.map(leak => (
              <MentalLeakCard
                key={leak.id}
                leak={leak}
                linkedEntries={getLinkedEntries(leak)}
                onEdit={(leak) => {
                  setEditingLeak(leak)
                  setIsLeakDialogOpen(true)
                }}
                onDelete={handleDeleteLeak}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {leaks.length === 0 ? 'Aucun mental leak' : 'Aucun résultat'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {leaks.length === 0 
                ? 'Commencez par identifier votre premier mental leak'
                : 'Essayez de modifier vos filtres de recherche'
              }
            </p>
            {leaks.length === 0 && (
              <Button onClick={() => setIsLeakDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Premier leak
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Leak Dialog */}
      <MentalLeakDialog
        {...(editingLeak && { leak: editingLeak })}
        isOpen={isLeakDialogOpen}
        onClose={() => {
          setIsLeakDialogOpen(false)
          setEditingLeak(undefined)
        }}
        onSave={handleLeakSave}
        availableEntries={journalEntries}
      />
    </div>
  )
}