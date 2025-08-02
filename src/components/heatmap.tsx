'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HeatmapService, HeatmapData, HandStats } from '@/lib/services/heatmap-service'
import { SessionService, SessionStats } from '@/lib/services/session-service'

interface HeatmapCellProps {
  hand: string
  stats: HandStats | null
  onClick?: (hand: string) => void
}

function HeatmapCell({ hand, stats, onClick }: HeatmapCellProps) {
  const colorClass = HeatmapService.getHeatmapColor(
    stats?.errorRate || 0, 
    stats?.totalPlayed || 0
  )
  
  const tooltipContent = stats ? (
    <div className="text-sm">
      <div className="font-semibold">{hand}</div>
      <div>Jouées: {stats.totalPlayed}</div>
      <div>Précision: {stats.accuracy}%</div>
      <div>Erreurs: {stats.errorRate}%</div>
    </div>
  ) : (
    <div className="text-sm">
      <div className="font-semibold">{hand}</div>
      <div>Aucune donnée</div>
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              w-8 h-8 flex items-center justify-center text-xs font-mono font-bold cursor-pointer
              hover:scale-110 transition-transform border border-gray-300
              ${colorClass}
            `}
            onClick={() => onClick?.(hand)}
          >
            {hand}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function HeatmapLegend() {
  const legendItems = [
    { label: 'Aucune donnée', color: 'bg-gray-100 text-gray-400', range: '-' },
    { label: 'Parfait (0%)', color: 'bg-green-600 text-white', range: '0%' },
    { label: 'Excellent (1-10%)', color: 'bg-green-400 text-white', range: '1-10%' },
    { label: 'Bon (11-25%)', color: 'bg-green-200 text-green-800', range: '11-25%' },
    { label: 'Moyen (26-40%)', color: 'bg-yellow-300 text-yellow-800', range: '26-40%' },
    { label: 'Faible (41-60%)', color: 'bg-orange-400 text-white', range: '41-60%' },
    { label: 'Mauvais (61-80%)', color: 'bg-red-400 text-white', range: '61-80%' },
    { label: 'Critique (81-100%)', color: 'bg-red-600 text-white', range: '81-100%' }
  ]

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-2">Légende (Taux d'erreur)</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className={`w-4 h-4 ${item.color} border border-gray-300`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface RangeHeatmapProps {
  onHandClick?: (hand: string) => void
}

export function RangeHeatmap({ onHandClick }: RangeHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({})
  const [loading, setLoading] = useState(true)
  const [selectedHand, setSelectedHand] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionStats[]>([])
  const [selectedRange, setSelectedRange] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadHeatmapData()
  }, [selectedRange])

  const loadData = async () => {
    try {
      const sessionsData = await SessionService.getAllSessions()
      setSessions(sessionsData)
    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error)
    }
  }

  const loadHeatmapData = async () => {
    try {
      setLoading(true)
      let data: HeatmapData
      
      if (selectedRange === 'all') {
        data = await HeatmapService.generateHeatmapData()
      } else {
        data = await HeatmapService.generateHeatmapDataByRange(selectedRange)
      }
      
      setHeatmapData(data)
    } catch (error) {
      console.error('Erreur lors du chargement de la heatmap:', error)
    } finally {
      setLoading(false)
    }
  }

  // Obtenir les ranges uniques des sessions
  const uniqueRanges = Array.from(new Set(
    sessions
      .filter(s => s.type === 'range_training' && s.rangeName)
      .map(s => s.rangeName!)
  ))

  const handleCellClick = (hand: string) => {
    setSelectedHand(hand)
    onHandClick?.(hand)
  }

  const grid = HeatmapService.generatePokerGrid()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Heatmap des Erreurs par Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement de la heatmap...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Heatmap des Erreurs par Range</CardTitle>
          <Button 
            onClick={loadHeatmapData} 
            variant="outline" 
            size="sm"
          >
            Actualiser
          </Button>
        </div>
        <div className="flex items-center space-x-4 mt-4">
          <label className="text-sm font-medium">Filtrer par range:</label>
          <Select value={selectedRange} onValueChange={setSelectedRange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sélectionner une range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les ranges</SelectItem>
              {uniqueRanges.map((rangeName) => (
                <SelectItem key={rangeName} value={rangeName}>
                  {rangeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Grille principale */}
          <div className="inline-block p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-13 gap-0">
              {grid.map((row, i) =>
                row.map((hand, j) => (
                  <HeatmapCell
                    key={`${i}-${j}`}
                    hand={hand}
                    stats={HeatmapService.getHandStats(hand, heatmapData)}
                    onClick={handleCellClick}
                  />
                ))
              )}
            </div>
          </div>

          {/* Informations sur la main sélectionnée */}
          {selectedHand && heatmapData[selectedHand] && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">
                Détails pour {selectedHand}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Fois jouées:</span>
                  <div className="font-semibold">{heatmapData[selectedHand].totalPlayed}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Bonnes réponses:</span>
                  <div className="font-semibold text-green-600">{heatmapData[selectedHand].totalCorrect}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Mauvaises réponses:</span>
                  <div className="font-semibold text-red-600">{heatmapData[selectedHand].totalIncorrect}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Précision:</span>
                  <div className="font-semibold">{heatmapData[selectedHand].accuracy}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Légende */}
          <HeatmapLegend />

          {/* Statistiques globales */}
          <div className="text-sm text-muted-foreground">
            <p>
              Mains analysées: {Object.keys(heatmapData).length} / 169 possibles
            </p>
            <p>
              Total de mains jouées: {Object.values(heatmapData).reduce((sum, stats) => sum + stats.totalPlayed, 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}