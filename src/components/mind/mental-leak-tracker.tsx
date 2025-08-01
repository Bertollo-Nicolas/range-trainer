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
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Calendar,
  Target
} from 'lucide-react'
import { MentalLeak } from '@/types/mind'

const mockLeaks: MentalLeak[] = [
  {
    id: '1',
    title: 'Tilt après bad beat',
    description: 'Quand je prends une bad beat importante, j\'ai tendance à jouer plus agressivement les mains suivantes',
    trigger: 'Bad beat > 50bb',
    automatic_thought: 'Je dois récupérer rapidement mes pertes',
    mental_reflex: 'Élargir ma range de 3bet et value bet plus thin',
    status: 'active',
    severity: 'high',
    created_at: '2024-01-05',
    updated_at: '2024-01-10'
  },
  {
    id: '2',
    title: 'Impatience en début de session',
    description: 'Difficulté à attendre les bonnes mains en début de session, envie de jouer rapidement',
    trigger: 'Moins de 10 mains jouées dans les 30 premières minutes',
    automatic_thought: 'Je perds du temps, il faut que je joue plus de mains',
    mental_reflex: 'Jouer des mains marginales en position défavorable',
    status: 'resolved',
    severity: 'medium',
    created_at: '2024-01-01',
    updated_at: '2024-01-08',
    resolved_at: '2024-01-08'
  },
  {
    id: '3',
    title: 'Doute après série de folds',
    description: 'Après plusieurs folds consécutifs, je commence à douter de ma stratégie',
    trigger: '8+ folds consécutifs preflop',
    automatic_thought: 'Je suis trop tight, je rate des spots profitables',
    mental_reflex: 'Commencer à call des raises avec des mains plus faibles',
    status: 'active',
    severity: 'medium',
    created_at: '2024-01-03',
    updated_at: '2024-01-10'
  }
]

export function MentalLeakTracker() {
  const [leaks, setLeaks] = useState<MentalLeak[]>(mockLeaks)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedLeak, setSelectedLeak] = useState<MentalLeak | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  // Form state pour nouveau leak
  const [newLeak, setNewLeak] = useState({
    title: '',
    description: '',
    trigger: '',
    automatic_thought: '',
    mental_reflex: '',
    severity: 'medium' as 'low' | 'medium' | 'high'
  })

  const resetNewLeak = () => {
    setNewLeak({
      title: '',
      description: '',
      trigger: '',
      automatic_thought: '',
      mental_reflex: '',
      severity: 'medium'
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredLeaks = leaks.filter(leak => {
    const matchesSearch = leak.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (leak.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesStatus = filterStatus === 'all' || leak.status === filterStatus
    const matchesSeverity = filterSeverity === 'all' || leak.severity === filterSeverity

    return matchesSearch && matchesStatus && matchesSeverity
  })

  const addLeak = () => {
    if (!newLeak.title.trim() || !newLeak.trigger.trim()) return

    const leak: MentalLeak = {
      id: Date.now().toString(),
      title: newLeak.title,
      description: newLeak.description,
      trigger: newLeak.trigger,
      automatic_thought: newLeak.automatic_thought,
      mental_reflex: newLeak.mental_reflex,
      status: 'active',
      severity: newLeak.severity,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    }

    setLeaks([leak, ...leaks])
    resetNewLeak()
    setIsAddDialogOpen(false)
  }

  const toggleLeakStatus = (leakId: string) => {
    setLeaks(leaks.map(leak => {
      if (leak.id === leakId) {
        const newStatus = leak.status === 'active' ? 'resolved' : 'active'
        return {
          ...leak,
          status: newStatus,
          updated_at: new Date().toISOString().split('T')[0],
          ...(newStatus === 'resolved' && { resolved_at: new Date().toISOString().split('T')[0] })
        }
      }
      return leak
    }))
  }

  const viewLeak = (leak: MentalLeak) => {
    setSelectedLeak(leak)
    setIsViewDialogOpen(true)
  }

  const activeLeaks = leaks.filter(l => l.status === 'active')
  const resolvedLeaks = leaks.filter(l => l.status === 'resolved')
  const highSeverityLeaks = leaks.filter(l => l.severity === 'high' && l.status === 'active')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Mental Leak Tracker</h1>
          <p className="text-muted-foreground">Identifiez et résolvez vos fuites mentales</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouveau leak
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau mental leak</DialogTitle>
              <DialogDescription>
                Identifiez un pattern mental qui nuit à votre jeu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Titre</label>
                  <Input
                    placeholder="Ex: Tilt après bad beat"
                    value={newLeak.title}
                    onChange={(e) => setNewLeak(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sévérité</label>
                  <Select 
                    value={newLeak.severity} 
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      setNewLeak(prev => ({ ...prev, severity: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Faible</SelectItem>
                      <SelectItem value="medium">Modérée</SelectItem>
                      <SelectItem value="high">Élevée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Décrivez le problème mental en détail..."
                  value={newLeak.description}
                  onChange={(e) => setNewLeak(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Déclencheur</label>
                <Input
                  placeholder="Qu'est-ce qui déclenche ce leak? Ex: Bad beat > 50bb"
                  value={newLeak.trigger}
                  onChange={(e) => setNewLeak(prev => ({ ...prev, trigger: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pensée automatique</label>
                <Textarea
                  placeholder="Quelle pensée vous traverse l'esprit? Ex: Je dois récupérer rapidement..."
                  value={newLeak.automatic_thought}
                  onChange={(e) => setNewLeak(prev => ({ ...prev, automatic_thought: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Réflexe mental/Action</label>
                <Textarea
                  placeholder="Que faites-vous ensuite? Ex: J'élargis ma range de 3bet..."
                  value={newLeak.mental_reflex}
                  onChange={(e) => setNewLeak(prev => ({ ...prev, mental_reflex: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={addLeak} disabled={!newLeak.title.trim() || !newLeak.trigger.trim()}>
                  Ajouter le leak
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leaks actifs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLeaks.length}</div>
            <p className="text-xs text-muted-foreground">
              {highSeverityLeaks.length} haute sévérité
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leaks résolus</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedLeaks.length}</div>
            <p className="text-xs text-muted-foreground">
              Ce mois-ci
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux résolution</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaks.length > 0 ? Math.round((resolvedLeaks.length / leaks.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {resolvedLeaks.length}/{leaks.length} résolus
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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="resolved">Résolus</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Sévérité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sévérités</SelectItem>
                <SelectItem value="high">Élevée</SelectItem>
                <SelectItem value="medium">Modérée</SelectItem>
                <SelectItem value="low">Faible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des leaks */}
      <div className="space-y-4">
        {filteredLeaks.map((leak) => (
          <Card key={leak.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(leak.status)}
                    <CardTitle className="text-lg">{leak.title}</CardTitle>
                  </div>
                  <p className="text-muted-foreground text-sm">{leak.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <Badge variant="outline" className={getSeverityColor(leak.severity)}>
                    {leak.severity === 'high' ? 'Élevée' : leak.severity === 'medium' ? 'Modérée' : 'Faible'}
                  </Badge>
                  <Badge variant="secondary" className={getStatusColor(leak.status)}>
                    {leak.status === 'active' ? 'Actif' : 'Résolu'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="font-medium text-muted-foreground">Déclencheur</div>
                  <div>{leak.trigger}</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-muted-foreground">Pensée automatique</div>
                  <div>{leak.automatic_thought}</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-muted-foreground">Réflexe mental</div>
                  <div>{leak.mental_reflex}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Créé le {new Date(leak.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  {leak.resolved_at && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Résolu le {new Date(leak.resolved_at).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => viewLeak(leak)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </Button>
                  <Button 
                    variant={leak.status === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleLeakStatus(leak.id)}
                  >
                    {leak.status === 'active' ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Marquer résolu
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Réactiver
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredLeaks.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium">Aucun leak trouvé</h3>
                <p className="text-muted-foreground">
                  Modifiez vos filtres ou ajoutez votre premier leak mental
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de détail */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedLeak && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getStatusIcon(selectedLeak.status)}
                  {selectedLeak.title}
                </DialogTitle>
                <DialogDescription>
                  Détails du mental leak
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge variant="outline" className={getSeverityColor(selectedLeak.severity)}>
                    {selectedLeak.severity === 'high' ? 'Sévérité élevée' : 
                     selectedLeak.severity === 'medium' ? 'Sévérité modérée' : 'Sévérité faible'}
                  </Badge>
                  <Badge variant="secondary" className={getStatusColor(selectedLeak.status)}>
                    {selectedLeak.status === 'active' ? 'Actif' : 'Résolu'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedLeak.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">Déclencheur</h4>
                    <p className="text-sm">{selectedLeak.trigger}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">Pensée automatique</h4>
                    <p className="text-sm">{selectedLeak.automatic_thought}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">Réflexe mental</h4>
                    <p className="text-sm">{selectedLeak.mental_reflex}</p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Créé le:</span>
                      <div>{new Date(selectedLeak.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    {selectedLeak.resolved_at && (
                      <div>
                        <span className="font-medium">Résolu le:</span>
                        <div>{new Date(selectedLeak.resolved_at).toLocaleDateString('fr-FR')}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}