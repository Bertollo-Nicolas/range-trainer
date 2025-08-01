'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Play, ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { ScenarioService, ScenarioData } from '@/lib/services/scenario-service'

/**
 * Page de transition avec la liste des scénarios
 * Entre l'éditeur et la page trainer
 */
export default function ScenariosListPage() {
  const [scenarios, setScenarios] = useState<ScenarioData[]>([])
  const [filteredScenarios, setFilteredScenarios] = useState<ScenarioData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadScenarios()
  }, [])

  const loadScenarios = async () => {
    setLoading(true)
    const data = await ScenarioService.listScenarios()
    setScenarios(data)
    setFilteredScenarios(data)
    setLoading(false)
  }

  // Filtrer les scénarios selon la recherche
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredScenarios(scenarios)
    } else {
      const filtered = scenarios.filter(scenario =>
        scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (scenario.description && scenario.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredScenarios(filtered)
    }
  }, [searchQuery, scenarios])

  const handleCreateNew = () => {
    router.push('/trainer/scenario')
  }

  const handleEdit = (scenario: ScenarioData) => {
    // TODO: Passer l'ID du scénario à l'éditeur pour le charger
    router.push(`/trainer/scenario?id=${scenario.id}`)
  }

  const handlePlay = (scenario: ScenarioData) => {
    // TODO: Rediriger vers la page practice avec le scénario
    router.push(`/trainer/practice?scenario=${scenario.id}`)
  }

  const handleDelete = async (scenario: ScenarioData) => {
    if (confirm(`Supprimer le scénario "${scenario.name}" ?`)) {
      const success = await ScenarioService.deleteScenario(scenario.id!)
      if (success) {
        await loadScenarios()
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getScenarioStats = (scenario: ScenarioData) => {
    const nodes = scenario.graph_data?.nodes || []
    const totalPositions = nodes.length
    const completedActions = nodes.filter(n => n.action).length
    return { totalPositions, completedActions }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des scénarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/trainer">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Scénarios</h1>
          </div>
          <Button onClick={handleCreateNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="border-b bg-background/95 backdrop-blur p-4">
        <div className="w-[80%] mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un scénario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-7rem)] overflow-y-auto">
        {scenarios.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-muted-foreground mb-4">
                <Plus className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium mb-2">Aucun scénario</h3>
              <p className="text-muted-foreground mb-6">
                Créez votre premier scénario d'entraînement
              </p>
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Créer un scénario
              </Button>
            </div>
          </div>
        ) : filteredScenarios.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-muted-foreground mb-4">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium mb-2">Aucun résultat</h3>
              <p className="text-muted-foreground mb-6">
                Aucun scénario ne correspond à votre recherche
              </p>
            </div>
          </div>
        ) : (
          <div className="w-[80%] mx-auto p-6">
            {/* Header de la grille */}
            <div className="grid grid-cols-12 gap-4 p-2 border-b font-medium text-sm text-muted-foreground bg-muted/30">
              <div className="col-span-4">Nom</div>
              <div className="col-span-2">Positions</div>
              <div className="col-span-2">Progression</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>
            
            {/* Contenu de la grille */}
            <div className="divide-y divide-border">
              {filteredScenarios.map((scenario) => {
                const stats = getScenarioStats(scenario)
                return (
                  <div key={scenario.id} className="grid grid-cols-12 gap-4 p-2 hover:bg-muted/30 transition-colors bg-card">
                    {/* Nom */}
                    <div className="col-span-4 flex items-center">
                      <h3 className="font-medium truncate text-sm">{scenario.name}</h3>
                    </div>
                    
                    {/* Positions */}
                    <div className="col-span-2 flex items-center">
                      <Badge variant="secondary" className="text-xs">
                        {stats.totalPositions} pos
                      </Badge>
                    </div>
                    
                    {/* Progression */}
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm">
                        {stats.completedActions}/{stats.totalPositions}
                      </span>
                    </div>
                    
                    {/* Date */}
                    <div className="col-span-2 flex items-center">
                      {scenario.created_at && (
                        <span className="text-sm text-muted-foreground">
                          {formatDate(scenario.created_at)}
                        </span>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(scenario)}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-7 w-7 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => handlePlay(scenario)}
                        disabled={stats.totalPositions === 0}
                        className="bg-green-600 hover:bg-green-700 text-white h-7 w-7 p-0 disabled:bg-gray-400"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => handleDelete(scenario)}
                        className="bg-red-600 hover:bg-red-700 text-white h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}