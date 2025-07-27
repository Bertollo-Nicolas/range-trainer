'use client'

import { useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow'
import 'reactflow/dist/style.css'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RotateCcw, Save, Play, List } from 'lucide-react'

import MasterNode from './nodes/MasterNode'
import PositionNode from './nodes/PositionNode'
import { useScenarioV3 } from '@/hooks/useScenarioV3'
import { POKER_POSITIONS, getPositionIndex } from '@/types/scenario'
import { TreeItem as TreeItemType } from '@/types/range'

// Types de nodes pour React Flow - v3 Implementation
const nodeTypes: NodeTypes = {
  master: MasterNode,
  position: PositionNode,
}

/**
 * Scenario Builder v3 - Implementation from scratch
 * Based on trainer-scenario-v3.md specifications
 */
function ScenarioBuilderV3Inner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const { fitView } = useReactFlow()
  
  const {
    scenario,
    scenarioTitle,
    setScenarioTitle,
    currentScenarioId,
    createPositionNodes,
    updateNodeAction,
    modifyNodeAction,
    linkRangeToNode,
    convertToHero,
    convertToVilain,
    saveScenario,
    loadScenario,
    setStackSize,
    setNodeStackSize,
    resetToMasterNode
  } = useScenarioV3()

  // Charger un scénario existant si un ID est fourni dans l'URL
  useEffect(() => {
    const scenarioId = searchParams.get('id')
    if (scenarioId && scenarioId !== currentScenarioId) {
      loadScenario(scenarioId)
    }
  }, [searchParams, loadScenario, currentScenarioId])

  // Fonction pour créer les nodes et faire un fitView
  const handleCreatePositionNodes = useCallback(() => {
    createPositionNodes()
    // FitView après un petit délai pour que les nodes soient rendus
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 })
    }, 100)
  }, [createPositionNodes, fitView])

  // Synchroniser les nodes React Flow avec le scenario state
  useEffect(() => {
    const reactFlowNodes: Node[] = []
    const reactFlowEdges: Edge[] = []

    // Toujours afficher le Master Node selon tes spécifications
    reactFlowNodes.push({
      id: 'master-node',
      type: 'master',
      position: { x: 50, y: 200 },
      draggable: false,
      data: {
        onAddScenario: handleCreatePositionNodes,
        isActive: scenario.masterNodeVisible
      }
    })

    if (!scenario.masterNodeVisible) {
      // Séparer les nodes de première et seconde ronde
      const firstRoundNodes = scenario.nodes.filter(n => !n.id.includes('-2-'))
      const secondRoundNodes = scenario.nodes.filter(n => n.id.includes('-2-'))
      
      // Afficher les nodes de première ronde
      firstRoundNodes.forEach((node, index) => {
        const positionIndex = getPositionIndex(node.position)
        
        reactFlowNodes.push({
          id: node.id,
          type: 'position',
          position: { 
            x: 50 + 260 + positionIndex * 260,
            y: 200 // Tous sur la même ligne
          },
          draggable: false,
          data: {
            position: node.position,
            state: node.state,
            isHero: node.isHero,
            linkedRange: node.linkedRange,
            sizing: node.sizing,
            stackSize: node.stackSize,
            scenarioStackSize: scenario.stackSize,
            availableActions: node.availableActions,
            currentAction: (node as any).action,
            onChange: (action, sizing) => updateNodeAction(node.id, action, sizing),
            onConvertToHero: () => convertToHero(node.id),
            onConvertToVilain: () => convertToVilain(node.id),
            onModifyAction: () => modifyNodeAction(node.id),
            onLinkRange: (range) => linkRangeToNode(node.id, range),
            onStackSizeChange: (stackSize) => setNodeStackSize(node.id, stackSize)
          }
        })
      })

      // Afficher les nodes post-BB en continuant la ligne
      secondRoundNodes.forEach((node, index) => {
        reactFlowNodes.push({
          id: node.id,
          type: 'position',
          position: { 
            x: 50 + 260 + (6 + index) * 260, // Continuer après les 6 premières positions
            y: 200 // Même ligne
          },
          draggable: false,
          data: {
            position: node.position,
            state: node.state,
            isHero: node.isHero,
            linkedRange: node.linkedRange,
            sizing: node.sizing,
            stackSize: node.stackSize,
            scenarioStackSize: scenario.stackSize,
            availableActions: node.availableActions,
            currentAction: (node as any).action,
            onChange: (action, sizing) => updateNodeAction(node.id, action, sizing),
            onConvertToHero: () => convertToHero(node.id),
            onConvertToVilain: () => convertToVilain(node.id),
            onModifyAction: () => modifyNodeAction(node.id),
            onLinkRange: (range) => linkRangeToNode(node.id, range),
            onStackSizeChange: (stackSize) => setNodeStackSize(node.id, stackSize)
          }
        })
      })
    }

    // Créer des edges selon tes spécifications
    if (!scenario.masterNodeVisible && scenario.nodes.length > 0) {
      const sortedNodes = [...scenario.nodes].sort((a, b) => 
        getPositionIndex(a.position) - getPositionIndex(b.position)
      )
      
      const firstRoundNodes = sortedNodes.filter(n => !n.id.includes('-2-'))
      const secondRoundNodes = sortedNodes.filter(n => n.id.includes('-2-'))

      // 1. Connecter Master Node à UTG (premier node)
      if (firstRoundNodes.length > 0) {
        const firstNode = firstRoundNodes[0]
        reactFlowEdges.push({
          id: `edge-master-${firstNode.id}`,
          source: 'master-node',
          target: firstNode.id,
          type: 'default',
          animated: false
        })
      }

      // 2. Connecter les nodes de première ronde séquentiellement
      for (let i = 0; i < firstRoundNodes.length - 1; i++) {
        const currentNode = firstRoundNodes[i]
        const nextNode = firstRoundNodes[i + 1]
        
        reactFlowEdges.push({
          id: `edge-${currentNode.id}-${nextNode.id}`,
          source: currentNode.id,
          target: nextNode.id,
          type: 'default',
          animated: currentNode.state === 'Actif' || nextNode.state === 'Actif'
        })
      }

      // 3. Connecter les nouveaux nodes post-BB
      if (secondRoundNodes.length > 0) {
        // Connecter BB au premier node post-BB
        const bbNode = firstRoundNodes.find(n => n.position === 'BB')
        if (bbNode) {
          reactFlowEdges.push({
            id: `edge-${bbNode.id}-${secondRoundNodes[0].id}`,
            source: bbNode.id,
            target: secondRoundNodes[0].id,
            type: 'default',
            animated: false
          })
        }

        // Connecter les nodes post-BB entre eux séquentiellement
        for (let i = 0; i < secondRoundNodes.length - 1; i++) {
          const currentNode = secondRoundNodes[i]
          const nextNode = secondRoundNodes[i + 1]
          
          reactFlowEdges.push({
            id: `edge-${currentNode.id}-${nextNode.id}`,
            source: currentNode.id,
            target: nextNode.id,
            type: 'default',
            animated: currentNode.state === 'Actif' || nextNode.state === 'Actif'
          })
        }
      }
    }

    setNodes(reactFlowNodes)
    setEdges(reactFlowEdges)

    // FitView après que les nodes soient mis à jour
    if (reactFlowNodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 800 })
      }, 100)
    }
  }, [scenario, createPositionNodes, updateNodeAction, convertToHero, convertToVilain, setNodes, setEdges, fitView])

  const handleReset = useCallback(() => {
    resetToMasterNode()
  }, [resetToMasterNode])

  const handleSave = useCallback(async () => {
    const success = await saveScenario()
    // Le bouton Play apparaîtra après sauvegarde réussie
    return success
  }, [saveScenario])

  const handlePlay = useCallback(() => {
    if (currentScenarioId) {
      router.push(`/trainer/practice?scenario=${currentScenarioId}`)
    }
  }, [currentScenarioId, router])

  const handleViewScenarios = useCallback(() => {
    router.push('/trainer/scenarios')
  }, [router])

  const getProgressStats = () => {
    const totalNodes = scenario.nodes.length
    const completedNodes = scenario.nodes.filter(n => 
      n.state !== 'Actif' && n.state !== 'En attente'
    ).length
    const activeNodes = scenario.nodes.filter(n => n.state === 'Actif').length

    return { totalNodes, completedNodes, activeNodes }
  }

  const stats = getProgressStats()

  return (
    <div className="h-screen flex">
      {/* Panel gauche - Contrôles */}
      <Card className="w-80 m-4 flex-shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">Scenario Builder v3</span>
            <Badge variant="outline" className="text-xs">
              Trainer v3 Spec
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistiques */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Statistiques</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-muted/20 rounded">
                <div className="text-lg font-bold">{stats.totalNodes}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">{stats.activeNodes}</div>
                <div className="text-xs text-muted-foreground">Actifs</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-lg font-bold text-blue-600">{stats.completedNodes}</div>
                <div className="text-xs text-muted-foreground">Terminés</div>
              </div>
            </div>
          </div>

          {/* Instructions v3 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Instructions v3</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              {scenario.masterNodeVisible ? (
                <p>• Cliquez sur "Add Scenario" pour créer les 6 positions</p>
              ) : (
                <>
                  <p>• UTG commence, les autres sont en attente</p>
                  <p>• Chaque joueur attend que le précédent agisse</p>
                  <p>• Après BB : nouveaux nodes créés automatiquement</p>
                  <p>• Convertir Hero/Vilain avec les boutons</p>
                </>
              )}
            </div>
          </div>

          {/* Titre du scénario */}
          <div className="space-y-2">
            <Label htmlFor="scenario-title" className="text-sm font-medium">
              Titre du scénario
            </Label>
            <Input
              id="scenario-title"
              value={scenarioTitle}
              onChange={(e) => setScenarioTitle(e.target.value)}
              placeholder="Ex: UTG open vs 3bet..."
              className="w-full"
            />
            {currentScenarioId && (
              <p className="text-xs text-muted-foreground">
                Scénario existant - les modifications seront sauvegardées
              </p>
            )}
          </div>

          {/* Configuration des stacks */}
          <div className="space-y-2">
            <Label htmlFor="stack-size" className="text-sm font-medium">
              Stack effectif par défaut
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="stack-size"
                type="number"
                value={scenario.stackSize}
                onChange={(e) => setStackSize(parseInt(e.target.value) || 100)}
                placeholder="100"
                className="w-20"
                min="10"
                max="500"
              />
              <span className="text-sm text-muted-foreground">bb</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Stack par défaut pour tous les joueurs (peut être modifié individuellement)
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button 
              onClick={handleSave}
              className="w-full gap-2"
              disabled={!scenarioTitle.trim()}
            >
              <Save className="h-4 w-4" />
              {currentScenarioId ? 'Mettre à jour' : 'Sauvegarder'}
            </Button>
            
            {/* Bouton Play - visible après sauvegarde */}
            {currentScenarioId && (
              <Button 
                onClick={handlePlay}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4" />
                Jouer ce scénario
              </Button>
            )}
            
            <Button 
              onClick={handleViewScenarios}
              variant="outline"
              className="w-full gap-2"
            >
              <List className="h-4 w-4" />
              Voir tous les scénarios
            </Button>
            
            <Button 
              onClick={handleReset}
              variant="outline"
              className="w-full gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Master Node
            </Button>
          </div>

          {/* Positions actives */}
          {!scenario.masterNodeVisible && scenario.nodes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Positions</h3>
              <div className="space-y-1">
                {POKER_POSITIONS.map(position => {
                  const positionNodes = scenario.nodes.filter(n => n.position === position)
                  return (
                    <div key={position} className="flex items-center justify-between text-xs">
                      <span className="font-medium">{position}:</span>
                      <div className="flex gap-1">
                        {positionNodes.map((node, index) => (
                          <Badge 
                            key={node.id} 
                            variant={
                              node.state === 'Actif' ? 'default' : 
                              node.state === 'En attente' ? 'outline' : 
                              'secondary'
                            }
                            className="text-xs px-1"
                          >
                            {node.state}
                            {positionNodes.length > 1 && ` (${index + 1})`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panel droit - React Flow */}
      <div className="flex-1 m-4 border rounded-lg bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.5,
            maxZoom: 1.5
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          className="bg-background"
          zoomOnDoubleClick={false}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  )
}

export function ScenarioBuilderV3() {
  return (
    <ReactFlowProvider>
      <ScenarioBuilderV3Inner />
    </ReactFlowProvider>
  )
}