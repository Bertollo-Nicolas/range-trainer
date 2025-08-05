'use client'

import { useState, useCallback } from 'react'

// Counter for generating unique IDs (avoids hydration mismatch)
import { ScenarioService, ScenarioData } from '@/lib/services/scenario-service'
import { 
  PokerPosition, 
  PokerAction, 
  NodeState, 
  BaseNode,
  ScenarioContext,
  TableFormat,
  getPositionIndex,
  getTablePositions,
  ScenarioConfig,
  ActionHistory
} from '@/types/scenario'
import { getDefaultSizingForAction } from '@/data/action-rules'

export interface ScenarioV3State {
  nodes: BaseNode[]
  masterNodeVisible: boolean
  contexts: Map<string, ScenarioContext> // Contexte par scénario
  tableFormat: TableFormat
  stackSize: number // Stack effectif par défaut du scénario (en bb)
}

/**
 * Hook pour la logique de scénarios v3
 * Implémente la logique séquentielle selon trainer-scenario-v3.md
 */
export function useScenarioV3() {
  const [scenario, setScenario] = useState<ScenarioV3State>({
    nodes: [],
    masterNodeVisible: true,
    contexts: new Map<string, ScenarioContext>(),
    tableFormat: '6max',
    stackSize: 100 // Stack par défaut à 100bb
  })

  const [scenarioTitle, setScenarioTitle] = useState('')
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null)

  // Fonction pour obtenir le contexte d'un scénario
  const getScenarioContext = useCallback((nodeId: string): ScenarioContext => {
    const scenarioMatch = nodeId.match(/^scenario(\d+)-/)
    const scenarioKey = scenarioMatch ? `scenario${scenarioMatch[1]}` : 'single'
    
    // Récupérer ou créer le contexte pour ce scénario
    if (!scenario.contexts.has(scenarioKey)) {
      return { actionHistory: [] }
    }
    return scenario.contexts.get(scenarioKey)!
  }, [scenario.contexts])

  // Fonction pour mettre à jour le contexte d'un scénario
  const updateScenarioContext = useCallback((nodeId: string, updater: (context: ScenarioContext) => ScenarioContext) => {
    const scenarioMatch = nodeId.match(/^scenario(\d+)-/)
    const scenarioKey = scenarioMatch ? `scenario${scenarioMatch[1]}` : 'single'
    
    setScenario(prev => {
      const newContexts = new Map(prev.contexts)
      const currentContext = newContexts.get(scenarioKey) || { actionHistory: [] }
      newContexts.set(scenarioKey, updater(currentContext))
      
      return {
        ...prev,
        contexts: newContexts
      }
    })
  }, [])

  // Créer les position nodes depuis le Master Node (v3 spec)
  const createPositionNodes = useCallback(() => {
    const positions = getTablePositions(scenario.tableFormat)
    const existingScenarios = Math.floor(scenario.nodes.length / positions.length)
    
    const newNodes: BaseNode[] = positions.map((position, index) => ({
      id: `scenario${existingScenarios}-${position}-${Date.now()}-${index}`,
      position,
      state: (index === 0 ? 'Actif' : 'En attente') as NodeState,
      isHero: false,
      linkedRange: null,
      sizing: null,
      availableActions: index === 0 
        ? ['fold', 'limp', 'open'] as PokerAction[]
        : [] as PokerAction[]
    }))

    setScenario(prev => ({
      ...prev,
      nodes: [...prev.nodes, ...newNodes],
      masterNodeVisible: false
    }))
  }, [scenario.tableFormat, scenario.nodes.length])

  // Créer plusieurs scénarios en une seule fois (multi-path)
  const createMultipleScenarios = useCallback((scenarioConfigs: ScenarioConfig[]) => {
    const allNodes: BaseNode[] = []
    const positions = getTablePositions(scenario.tableFormat)
    
    scenarioConfigs.forEach((config, scenarioIndex) => {
      const heroIndex = positions.indexOf(config.heroPosition)
      
      // Créer les nodes pour ce scénario
      const scenarioNodes = positions.map((position, posIndex) => {
        const node: BaseNode = {
          id: `scenario${scenarioIndex}-${position}-${Date.now()}-${posIndex}`,
          position,
          state: (posIndex <= heroIndex ? 'Actif' : 'En attente') as NodeState,
          isHero: position === config.heroPosition,
          linkedRange: null,
          sizing: position === config.heroPosition ? config.sizing || null : null,
          availableActions: position === config.heroPosition 
            ? ['fold', 'call', 'raise'] as PokerAction[]
            : posIndex === 0 
            ? ['fold', 'limp', 'open'] as PokerAction[]
            : [] as PokerAction[]
        }
        
        // Ajouter l'action seulement si c'est le hero
        if (position === config.heroPosition && config.action) {
          node.action = config.action
        }
        
        return node
      })
      
      allNodes.push(...scenarioNodes)
    })
    
    setScenario(prev => ({
      ...prev,
      nodes: allNodes,
      masterNodeVisible: false
    }))
  }, [scenario.tableFormat])

  // Ajouter un scénario supplémentaire (un à la fois)
  const addNewScenario = useCallback(() => {
    const positions = getTablePositions(scenario.tableFormat)
    const existingScenarios = Math.floor(scenario.nodes.length / positions.length)
    
    // Créer un nouveau scénario simple avec toutes les positions
    const newScenarioNodes = positions.map((position, posIndex) => {
      const node: BaseNode = {
        id: `scenario${existingScenarios}-${position}-${Date.now()}-${posIndex}`,
        position,
        state: (posIndex === 0 ? 'Actif' : 'En attente') as NodeState,
        isHero: false,
        linkedRange: null,
        sizing: null,
        availableActions: posIndex === 0 
          ? ['fold', 'limp', 'open'] as PokerAction[]
          : [] as PokerAction[]
      }
      return node
    })
    
    setScenario(prev => ({
      ...prev,
      nodes: [...prev.nodes, ...newScenarioNodes],
      masterNodeVisible: false
    }))
  }, [scenario.tableFormat, scenario.nodes.length])

  // Fonction pour déterminer si une position est IP vs OOP
  const isInPosition = useCallback((actingPosition: PokerPosition, raisingPosition?: PokerPosition): boolean => {
    if (!raisingPosition) return true // Si pas de raise précédent, considérer IP par défaut
    
    const actingIndex = getPositionIndex(actingPosition)
    const raisingIndex = getPositionIndex(raisingPosition)
    
    // En position si on agit après le raiser (index plus élevé)
    return actingIndex > raisingIndex
  }, [])

  // Logique séquentielle v3: chaque node attend que le précédent agisse
  const updateNodeAction = useCallback((nodeId: string, action: PokerAction, sizing?: number) => {
    // Obtenir le contexte spécifique à ce scénario
    const scenarioContext = getScenarioContext(nodeId)
    
    // Cette partie sera déplacée après avoir obtenu activeNode
    
    setScenario(prev => {
      const activeNode = prev.nodes.find(n => n.id === nodeId)
      if (!activeNode) return prev

      // Déterminer le sizing à utiliser
      let finalSizing = sizing
      
      // Si pas de sizing fourni mais que l'action en nécessite un, utiliser le sizing existant ou le défaut
      if (finalSizing === undefined && ['open', '3bet', '4bet', 'raise'].includes(action)) {
        if (activeNode.sizing) {
          // Préserver le sizing existant
          finalSizing = activeNode.sizing
        } else {
          // Utiliser le sizing par défaut basé sur l'action et la position (du même scénario)
          const lastRaiser = scenarioContext.actionHistory
            .filter(h => ['open', '3bet', '4bet', 'raise'].includes(h.action))
            .pop()
          const isIP = isInPosition(activeNode.position, lastRaiser?.position)
          finalSizing = getDefaultSizingForAction(action, isIP)
        }
      }

      // Identifier les nodes du même scénario
      const scenarioMatch = nodeId.match(/^scenario(\d+)-/)
      const scenarioKey = scenarioMatch ? `scenario${scenarioMatch[1]}` : 'single'
      
      // Filtrer les nodes du même scénario
      const scenarioNodes = prev.nodes.filter(node => {
        const nodeScenarioMatch = node.id.match(/^scenario(\d+)-/)
        const nodeScenarioKey = nodeScenarioMatch ? `scenario${nodeScenarioMatch[1]}` : 'single'
        return nodeScenarioKey === scenarioKey
      })
      
      // Trier les nodes du scénario par position pour déterminer l'ordre
      const sortedScenarioNodes = scenarioNodes.sort((a, b) => 
        getPositionIndex(a.position) - getPositionIndex(b.position)
      )
      
      // Trouver l'index du node actuel dans le scénario
      const currentNodeIndex = sortedScenarioNodes.findIndex(n => n.id === nodeId)
      const nextNode = currentNodeIndex < sortedScenarioNodes.length - 1 
        ? sortedScenarioNodes[currentNodeIndex + 1] 
        : null

      // Créer le nouveau contexte d'abord
      const newHistory: ActionHistory = {
        nodeId,
        position: activeNode.position,
        action,
        ...(finalSizing !== undefined && { sizing: finalSizing }),
        timestamp: Date.now()
      }

      let updatedContext: ScenarioContext = {
        ...scenarioContext,
        actionHistory: [...scenarioContext.actionHistory, newHistory]
      }

      // Mettre à jour lastRaiser si action = relance
      if (['open', 'raise', '3bet', '4bet'].includes(action)) {
        updatedContext.lastRaiser = { 
          position: activeNode.position, 
          action, 
          ...(finalSizing !== undefined && { sizing: finalSizing }) 
        }
      }

      // Mettre à jour lastOpener si action = limp/open et pas encore d'opener
      if (['limp', 'open'].includes(action) && !updatedContext.lastOpener) {
        updatedContext.lastOpener = { 
          position: activeNode.position, 
          action, 
          ...(finalSizing !== undefined && { sizing: finalSizing }) 
        }
      }

      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId) {
          // Mettre à jour le node courant
          return {
            ...node,
            state: 'Terminé' as NodeState,
            action,
            sizing: finalSizing || null,
            availableActions: [] // Plus d'actions disponibles après avoir agi
          }
        } else if (nextNode && node.id === nextNode.id) {
          // Activer le node suivant dans la séquence avec le nouveau contexte
          return {
            ...node,
            state: 'Actif' as NodeState,
            availableActions: getAvailableActionsForPosition(node.position, updatedContext)
          }
        }
        return node
      })

      // Mettre à jour le contexte du scénario spécifique
      updateScenarioContext(nodeId, () => updatedContext)

      return {
        ...prev,
        nodes: updatedNodes
      }
    })
  }, [getScenarioContext, updateScenarioContext, isInPosition])


  // Obtenir les actions disponibles selon le contexte global
  const getAvailableActionsForPosition = (
    _position: PokerPosition, 
    context: ScenarioContext
  ): PokerAction[] => {
    // Logique corrigée: regarder le contexte global, pas juste l'action précédente
    
    // Si quelqu'un a ouvert/relancé et que d'autres ont fold après
    if (context.lastRaiser) {
      const { action: lastRaiseAction } = context.lastRaiser
      
      if (lastRaiseAction === 'open') {
        return ['fold', 'call', '3bet']
      }
      
      if (lastRaiseAction === '3bet') {
        return ['fold', 'call', '4bet']
      }
      
      if (lastRaiseAction === '4bet') {
        return ['fold', 'call']
      }
      
      if (lastRaiseAction === 'raise') {
        return ['fold', 'call', '3bet']
      }
    }
    
    // Si quelqu'un a limp et qu'il n'y a pas eu de relance
    if (context.lastOpener?.action === 'limp' && !context.lastRaiser) {
      return ['fold', 'call', 'raise']
    }
    
    // Cas de base: personne n'a encore agi ou tous ont fold
    return ['fold', 'limp', 'open']
  }


  // Lier une range à un node
  const linkRangeToNode = useCallback((nodeId: string, range: any) => {
    setScenario(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { 
          ...node, 
          linkedRange: {
            id: range.id,
            name: range.name,
            hands: range.hands || range.data?.hands || []
          }
        } : node
      )
    }))
  }, [])

  // Convertir Hero/Vilain
  const convertToHero = useCallback((nodeId: string) => {
    setScenario(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, isHero: true } : node
      )
    }))
  }, [])

  const convertToVilain = useCallback((nodeId: string) => {
    setScenario(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, isHero: false } : node
      )
    }))
  }, [])



  // Fonction pour revenir en arrière et modifier une action
  const modifyNodeAction = useCallback((nodeId: string) => {
    // Obtenir le contexte spécifique à ce scénario
    const scenarioContext = getScenarioContext(nodeId)
    
    setScenario(prev => {
      const nodeToModify = prev.nodes.find(n => n.id === nodeId)
      if (!nodeToModify) return prev

      // Pour les scénarios complexes, on doit identifier quel type de node on modifie
      const isSecondRoundNode = nodeToModify.id.includes('-2-')
      
      if (isSecondRoundNode) {
        // Node de deuxième round : supprimer seulement cette action, pas tout le reste
        const newHistory = scenarioContext.actionHistory.filter(h => h.nodeId !== nodeId)
        
        // Reconstruire le contexte
        let newContext: ScenarioContext = {
          actionHistory: newHistory
        }

        // Recalculer le contexte
        for (const historyItem of newHistory) {
          if (['open', 'raise', '3bet', '4bet'].includes(historyItem.action)) {
            newContext.lastRaiser = { 
              position: historyItem.position, 
              action: historyItem.action, 
              ...(historyItem.sizing !== undefined && { sizing: historyItem.sizing })
            }
          }
          if (['limp', 'open'].includes(historyItem.action) && !newContext.lastOpener) {
            newContext.lastOpener = { 
              position: historyItem.position, 
              action: historyItem.action, 
              ...(historyItem.sizing !== undefined && { sizing: historyItem.sizing })
            }
          }
        }

        // Réinitialiser seulement ce node
        const updatedNodes = prev.nodes.map(node => 
          node.id === nodeId ? {
            ...node,
            state: 'Actif' as NodeState,
            action: 'fold' as PokerAction,
            sizing: null,
            availableActions: getAvailableActionsForPosition(node.position, newContext)
          } : node
        )

        return {
          ...prev,
          nodes: updatedNodes
        }
      } else {
        // Node de première round : logique classique
        const nodePositionIndex = getPositionIndex(nodeToModify.position)
        const newHistory = scenarioContext.actionHistory.filter(h => {
          const historyPositionIndex = getPositionIndex(h.position)
          return historyPositionIndex < nodePositionIndex
        })

        // Reconstruire le contexte sans les actions supprimées
        let newContext: ScenarioContext = {
          actionHistory: newHistory
        }

        // Recalculer lastRaiser et lastOpener
        for (const historyItem of newHistory) {
          if (['open', 'raise', '3bet', '4bet'].includes(historyItem.action)) {
            newContext.lastRaiser = { 
              position: historyItem.position, 
              action: historyItem.action, 
              ...(historyItem.sizing !== undefined && { sizing: historyItem.sizing })
            }
          }
          if (['limp', 'open'].includes(historyItem.action) && !newContext.lastOpener) {
            newContext.lastOpener = { 
              position: historyItem.position, 
              action: historyItem.action, 
              ...(historyItem.sizing !== undefined && { sizing: historyItem.sizing })
            }
          }
        }

        // Réinitialiser les nodes à partir de la position modifiée
        const updatedNodes = prev.nodes.map(node => {
          const nodePositionIdx = getPositionIndex(node.position)
          
          if (nodePositionIdx >= nodePositionIndex) {
            // Réinitialiser ce node et tous les suivants
            // MAIS préserver le sizing si on modifie le node actuel (pour éviter de l'effacer)
            return {
              ...node,
              state: (nodePositionIdx === nodePositionIndex ? 'Actif' : 'En attente') as NodeState,
              action: 'fold' as PokerAction,
              sizing: nodePositionIdx === nodePositionIndex ? (node.sizing ?? null) : null, // Préserver le sizing du node à modifier
              availableActions: nodePositionIdx === nodePositionIndex 
                ? getAvailableActionsForPosition(node.position, newContext)
                : []
            }
          }
          return node
        })

        return {
          ...prev,
          nodes: updatedNodes
        }
      }
    })
    
    // TODO: Mettre à jour le contexte du scénario spécifique avec updateScenarioContext
  }, [getScenarioContext])

  // Sauvegarder le scénario
  const saveScenario = useCallback(async (): Promise<boolean> => {
    if (!scenarioTitle.trim()) {
      alert('Veuillez saisir un titre pour le scénario')
      return false
    }

    // Vérifier qu'au moins un node a une range liée
    const nodesWithRanges = scenario.nodes.filter(node => node.linkedRange !== null)
    if (nodesWithRanges.length === 0) {
      alert('Vous devez lier au moins une range à un joueur avant de pouvoir sauvegarder le scénario')
      return false
    }

    // S'assurer que tous les nodes ont un stackSize (soit individuel, soit par défaut)
    const nodesWithStackSize = scenario.nodes.map(node => ({
      ...node,
      stackSize: node.stackSize || scenario.stackSize
    }))

    const scenarioData: ScenarioData = {
      name: scenarioTitle,
      description: `Scénario créé avec ${scenario.nodes.length} positions`,
      graph_data: {
        nodes: nodesWithStackSize,
        context: { actionHistory: [] }, // TODO: Sauvegarder tous les contextes
        tableFormat: scenario.tableFormat
      }
    }

    try {
      let result: ScenarioData | null = null
      
      if (currentScenarioId) {
        // Mise à jour d'un scénario existant
        result = await ScenarioService.updateScenario(currentScenarioId, scenarioData)
      } else {
        // Création d'un nouveau scénario
        result = await ScenarioService.saveScenario(scenarioData)
      }

      if (result) {
        setCurrentScenarioId(result.id!)
        alert('Scénario sauvegardé avec succès!')
        return true
      } else {
        alert('Erreur lors de la sauvegarde du scénario')
        return false
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde du scénario')
      return false
    }
  }, [scenarioTitle, scenario, currentScenarioId])

  // Charger un scénario
  const loadScenario = useCallback(async (id: string): Promise<boolean> => {
    try {
      const scenarioData = await ScenarioService.loadScenario(id)
      
      if (scenarioData) {
        setScenario({
          nodes: scenarioData.graph_data.nodes,
          masterNodeVisible: scenarioData.graph_data.nodes.length === 0,
          contexts: new Map<string, ScenarioContext>(), // TODO: Charger tous les contextes
          tableFormat: scenarioData.graph_data.tableFormat || '6max',
          stackSize: 100
        })
        setScenarioTitle(scenarioData.name)
        setCurrentScenarioId(scenarioData.id!)
        return true
      } else {
        alert('Erreur lors du chargement du scénario')
        return false
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      alert('Erreur lors du chargement du scénario')
      return false
    }
  }, [])

  // Changer le format de table
  const setTableFormat = useCallback((format: TableFormat) => {
    setScenario(prev => ({
      ...prev,
      tableFormat: format
    }))
  }, [])

  // Changer le stack size par défaut du scénario
  const setStackSize = useCallback((stackSize: number) => {
    setScenario(prev => ({
      ...prev,
      stackSize
    }))
  }, [])

  // Changer le stack size d'un node spécifique
  const setNodeStackSize = useCallback((nodeId: string, stackSize: number | null) => {
    setScenario(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId 
          ? { ...node, stackSize }
          : node
      )
    }))
  }, [])

  // Reset vers Master Node
  const resetToMasterNode = useCallback(() => {
    setScenario({
      nodes: [],
      masterNodeVisible: true,
      contexts: new Map<string, ScenarioContext>(),
      tableFormat: '6max',
      stackSize: 100
    })
    setScenarioTitle('')
    setCurrentScenarioId(null)
  }, [])

  return {
    scenario,
    scenarioTitle,
    setScenarioTitle,
    currentScenarioId,
    createPositionNodes,
    createMultipleScenarios, // Nouvelle fonction multi-scénarios
    addNewScenario, // Ajouter un scénario à la fois
    updateNodeAction,
    modifyNodeAction, // Nouvelle fonction pour modifier les actions
    linkRangeToNode, // Nouvelle fonction pour lier une range
    convertToHero,
    convertToVilain,
    saveScenario, // Nouvelle fonction de sauvegarde
    loadScenario, // Nouvelle fonction de chargement
    setTableFormat, // Nouvelle fonction pour changer le format de table
    setStackSize, // Nouvelle fonction pour changer le stack du scénario
    setNodeStackSize, // Nouvelle fonction pour changer le stack d'un node
    resetToMasterNode
  }
}