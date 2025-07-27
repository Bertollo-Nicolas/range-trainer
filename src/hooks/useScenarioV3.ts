'use client'

import { useState, useCallback } from 'react'

// Counter for generating unique IDs (avoids hydration mismatch)
let nodeIdCounter = 0
import { ScenarioService, ScenarioData } from '@/lib/services/scenario-service'
import { 
  PokerPosition, 
  PokerAction, 
  NodeState, 
  BaseNode,
  ActionHistory,
  ScenarioContext,
  TableFormat,
  POKER_POSITIONS,
  getPositionIndex,
  getNextPosition,
  getTablePositions
} from '@/types/scenario'
import { getDefaultSizingForAction } from '@/data/action-rules'

export interface ScenarioV3State {
  nodes: BaseNode[]
  masterNodeVisible: boolean
  context: ScenarioContext
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
    context: {
      actionHistory: []
    },
    tableFormat: '6max',
    stackSize: 100 // Stack par défaut à 100bb
  })

  const [scenarioTitle, setScenarioTitle] = useState('')
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null)

  // Créer les position nodes depuis le Master Node (v3 spec)
  const createPositionNodes = useCallback(() => {
    const positions = getTablePositions(scenario.tableFormat)
    const newNodes: BaseNode[] = positions.map((position, index) => ({
      id: `node-${position}-${Date.now()}`,
      position,
      state: index === 0 ? 'Actif' : 'En attente', // UTG starts active
      isHero: false,
      linkedRange: null,
      sizing: null,
      availableActions: index === 0 ? ['fold', 'limp', 'open'] : [] // Only UTG has actions initially
    }))

    setScenario(prev => ({
      ...prev,
      nodes: newNodes,
      masterNodeVisible: false
    }))
  }, [])

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
          // Utiliser le sizing par défaut basé sur l'action et la position
          const lastRaiser = prev.context.actionHistory
            .filter(h => ['open', '3bet', '4bet', 'raise'].includes(h.action))
            .pop()
          const isIP = isInPosition(activeNode.position, lastRaiser?.position)
          finalSizing = getDefaultSizingForAction(action, isIP)
        }
      }

      // Mettre à jour le contexte avec la nouvelle action
      const updatedContext = updateContext(prev.context, nodeId, activeNode.position, action, finalSizing)

      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId) {
          // Mettre à jour le node courant
          const newState = getStateFromAction(action)
          return {
            ...node,
            state: newState,
            action,
            sizing: finalSizing || null,
            availableActions: [] // Plus d'actions disponibles après avoir agi
          }
        }
        return node
      })

      // Activer le node suivant selon la logique v3
      const nextPosition = getNextPosition(activeNode.position)
      if (nextPosition) {
        const nextNodeIndex = updatedNodes.findIndex(n => n.position === nextPosition && !n.action)
        if (nextNodeIndex !== -1) {
          updatedNodes[nextNodeIndex] = {
            ...updatedNodes[nextNodeIndex],
            state: 'Actif',
            availableActions: getAvailableActionsForPosition(nextPosition, updatedContext)
          }
        }
      }

      // Logique spéciale BB selon v3 spec
      if (activeNode.position === 'BB') {
        // Vérifier si c'est la première fois que BB agit (éviter duplication)
        const existingBBActions = prev.nodes.filter(n => n.position === 'BB' && n.action).length
        const isFirstBBAction = existingBBActions === 1 // On vient de modifier BB pour la première fois
        
        if (isFirstBBAction) {
          // Après que BB agisse pour la première fois, créer nouveaux nodes si nécessaire
          const newNodes = createPostBBNodes(updatedNodes, updatedContext)
          if (newNodes.length > 0) {
            return {
              ...prev,
              nodes: [...updatedNodes, ...newNodes],
              context: updatedContext
            }
          }
        }
      }

      return {
        ...prev,
        nodes: updatedNodes,
        context: updatedContext
      }
    })
  }, [])

  // Convertir action vers état node
  const getStateFromAction = (action: PokerAction): NodeState => {
    switch (action) {
      case 'fold': return 'Fold'
      case 'limp': return 'Limp'
      case 'open': return 'Open'
      case '3bet': return '3bet'
      case '4bet': return '4bet'
      case 'call': return 'Limp' // Call = Limp in this context
      case 'raise': return 'Raise'
      default: return 'Actif'
    }
  }

  // Obtenir les actions disponibles selon le contexte global
  const getAvailableActionsForPosition = (
    position: PokerPosition, 
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

  // Mettre à jour le contexte avec une nouvelle action
  const updateContext = (
    context: ScenarioContext, 
    nodeId: string, 
    position: PokerPosition, 
    action: PokerAction, 
    sizing?: number
  ): ScenarioContext => {
    const newHistory: ActionHistory = {
      nodeId,
      position,
      action,
      sizing,
      timestamp: Date.now()
    }

    let newContext: ScenarioContext = {
      ...context,
      actionHistory: [...context.actionHistory, newHistory]
    }

    // Mettre à jour lastRaiser si action = relance
    if (['open', 'raise', '3bet', '4bet'].includes(action)) {
      newContext.lastRaiser = { position, action, sizing }
    }

    // Mettre à jour lastOpener si action = limp/open et pas encore d'opener
    if (['limp', 'open'].includes(action) && !newContext.lastOpener) {
      newContext.lastOpener = { position, action, sizing }
    }

    return newContext
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

  // Création dynamique de nodes après BB selon v3 spec
  const createPostBBNodes = (nodes: BaseNode[], context: ScenarioContext): BaseNode[] => {
    const newNodes: BaseNode[] = []
    
    // Trouver le dernier joueur ayant relancé
    const lastRaiser = findLastRaiser(nodes)
    if (!lastRaiser) return []
    
    // Identifier les joueurs qui ont call/open avant la dernière relance
    const playersBeforeLastRaise = findPlayersBeforeLastRaise(nodes, lastRaiser)
    
    // Créer nouveaux nodes pour chaque joueur qui peut réagir
    playersBeforeLastRaise.forEach((player, index) => {
      const newNode: BaseNode = {
        id: `${player.position}-2-${Date.now()}-${index}`,
        position: player.position,
        state: 'Actif', // Ils peuvent maintenant agir
        isHero: player.isHero,
        linkedRange: player.linkedRange,
        sizing: null,
        availableActions: ['fold', 'call', 'raise'] // Actions de réaction
      }
      newNodes.push(newNode)
    })
    
    return newNodes
  }

  // Helper: Trouver le dernier joueur ayant relancé
  const findLastRaiser = (nodes: BaseNode[]) => {
    const raisingStates = ['Open', 'Raise', '3bet', '4bet']
    
    // Parcourir en ordre inverse pour trouver la dernière relance
    for (let i = POKER_POSITIONS.length - 1; i >= 0; i--) {
      const position = POKER_POSITIONS[i]
      const node = nodes.find(n => n.position === position)
      if (node && raisingStates.includes(node.state)) {
        return node
      }
    }
    return null
  }

  // Helper: Trouver les joueurs ayant call/open avant la dernière relance
  const findPlayersBeforeLastRaise = (nodes: BaseNode[], lastRaiser: BaseNode) => {
    const lastRaiserIndex = getPositionIndex(lastRaiser.position)
    const reactiveStates = ['Limp', 'Open'] // États qui permettent de réagir
    const playersToReact: BaseNode[] = []
    
    // Vérifier tous les joueurs avant le dernier relanceur
    for (let i = 0; i < lastRaiserIndex; i++) {
      const position = POKER_POSITIONS[i]
      const node = nodes.find(n => n.position === position)
      if (node && reactiveStates.includes(node.state)) {
        playersToReact.push(node)
      }
    }
    
    return playersToReact
  }

  // Fonction pour revenir en arrière et modifier une action
  const modifyNodeAction = useCallback((nodeId: string) => {
    setScenario(prev => {
      const nodeToModify = prev.nodes.find(n => n.id === nodeId)
      if (!nodeToModify) return prev

      // Pour les scénarios complexes, on doit identifier quel type de node on modifie
      const isSecondRoundNode = nodeToModify.id.includes('-2-')
      
      if (isSecondRoundNode) {
        // Node de deuxième round : supprimer seulement cette action, pas tout le reste
        const newHistory = prev.context.actionHistory.filter(h => h.nodeId !== nodeId)
        
        // Reconstruire le contexte
        let newContext: ScenarioContext = {
          actionHistory: newHistory,
          lastRaiser: undefined,
          lastOpener: undefined
        }

        // Recalculer le contexte
        for (const historyItem of newHistory) {
          if (['open', 'raise', '3bet', '4bet'].includes(historyItem.action)) {
            newContext.lastRaiser = { 
              position: historyItem.position, 
              action: historyItem.action, 
              sizing: historyItem.sizing 
            }
          }
          if (['limp', 'open'].includes(historyItem.action) && !newContext.lastOpener) {
            newContext.lastOpener = { 
              position: historyItem.position, 
              action: historyItem.action, 
              sizing: historyItem.sizing 
            }
          }
        }

        // Réinitialiser seulement ce node
        const updatedNodes = prev.nodes.map(node => 
          node.id === nodeId ? {
            ...node,
            state: 'Actif' as NodeState,
            action: undefined,
            availableActions: getAvailableActionsForPosition(node.position, newContext)
          } : node
        )

        return {
          ...prev,
          nodes: updatedNodes,
          context: newContext
        }
      } else {
        // Node de première round : logique classique
        const nodePositionIndex = getPositionIndex(nodeToModify.position)
        const newHistory = prev.context.actionHistory.filter(h => {
          const historyPositionIndex = getPositionIndex(h.position)
          return historyPositionIndex < nodePositionIndex
        })

        // Reconstruire le contexte sans les actions supprimées
        let newContext: ScenarioContext = {
          actionHistory: newHistory,
          lastRaiser: undefined,
          lastOpener: undefined
        }

        // Recalculer lastRaiser et lastOpener
        for (const historyItem of newHistory) {
          if (['open', 'raise', '3bet', '4bet'].includes(historyItem.action)) {
            newContext.lastRaiser = { 
              position: historyItem.position, 
              action: historyItem.action, 
              sizing: historyItem.sizing 
            }
          }
          if (['limp', 'open'].includes(historyItem.action) && !newContext.lastOpener) {
            newContext.lastOpener = { 
              position: historyItem.position, 
              action: historyItem.action, 
              sizing: historyItem.sizing 
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
              action: undefined,
              sizing: nodePositionIdx === nodePositionIndex ? node.sizing : null, // Préserver le sizing du node à modifier
              availableActions: nodePositionIdx === nodePositionIndex 
                ? getAvailableActionsForPosition(node.position, newContext)
                : []
            }
          }
          return node
        })

        return {
          ...prev,
          nodes: updatedNodes,
          context: newContext
        }
      }
    })
  }, [])

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
        context: scenario.context,
        tableFormat: scenario.tableFormat,
        stackSize: scenario.stackSize
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
          context: scenarioData.graph_data.context,
          tableFormat: scenarioData.graph_data.tableFormat || '6max',
          stackSize: scenarioData.graph_data.stackSize || 100
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
      context: {
        actionHistory: []
      },
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