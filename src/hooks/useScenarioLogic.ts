'use client'

import { useState, useCallback } from 'react'
import { ScenarioNode, PokerPosition, PokerAction, TableFormat, getTablePositions, shouldAutoFold } from '@/types/scenario'
import { logger } from '@/utils/logger'

export interface ScenarioState {
  nodes: (ScenarioNode & { isAutomatic?: boolean })[]
  tableFormat: TableFormat
}

export function useScenarioLogic(initialState?: ScenarioState) {
  const [scenario, setScenario] = useState<ScenarioState>(
    initialState || { nodes: [], tableFormat: '6max' }
  )

  // Met à jour une action et déclenche la logique auto-update
  const updateNodeAction = useCallback((nodeId: string, action: PokerAction, sizing?: string) => {
    setScenario(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, action, sizing }
        }
        return node
      })

      // Appliquer la logique auto-update
      const nodesWithAutoLogic = applyAutoLogic(updatedNodes, prev.tableFormat)
      
      // Ajouter la continuation logique si nécessaire
      const finalNodes = addContinuation(nodesWithAutoLogic, prev.tableFormat, nodeId, action)
      
      return { ...prev, nodes: finalNodes }
    })
  }, [])

  // Charge un nouveau scénario
  const loadScenario = useCallback((newScenario: ScenarioState) => {
    setScenario(newScenario)
  }, [])

  // Ajoute un noeud hero après une action
  const addHeroNode = useCallback((afterNodeId: string, position: PokerPosition, rangeId?: string) => {
    setScenario(prev => {
      const heroNode: ScenarioNode & { isAutomatic?: boolean } = {
        id: `hero-${position}-${Date.now()}`,
        type: 'hero',
        position,
        action: 'call', // Action par défaut
        rangeId
      }

      // Insérer le noeud hero après le noeud spécifié
      const nodeIndex = prev.nodes.findIndex(n => n.id === afterNodeId)
      const newNodes = [...prev.nodes]
      newNodes.splice(nodeIndex + 1, 0, heroNode)

      return { ...prev, nodes: newNodes }
    })
  }, [])

  // Met à jour la range liée à un node hero
  const updateHeroRange = useCallback((nodeId: string, rangeId: string) => {
    setScenario(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId && node.type === 'hero') {
          return { ...node, rangeId }
        }
        return node
      })
      return { ...prev, nodes: updatedNodes }
    })
  }, [])

  // Convertit un node vilain en hero
  const convertToHero = useCallback((nodeId: string) => {
    setScenario(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId && node.type === 'vilain') {
          // Supprimer l'action quand on convertit en hero
          const { action, sizing, ...nodeWithoutAction } = node
          return { ...nodeWithoutAction, type: 'hero' as const }
        }
        return node
      })
      return { ...prev, nodes: updatedNodes }
    })
  }, [])

  // Convertit un node hero en vilain
  const convertToVilain = useCallback((nodeId: string) => {
    setScenario(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId && node.type === 'hero') {
          const { rangeId, ...nodeWithoutRange } = node
          return { ...nodeWithoutRange, type: 'vilain' as const }
        }
        return node
      })
      return { ...prev, nodes: updatedNodes }
    })
  }, [])

  return {
    scenario,
    updateNodeAction,
    loadScenario,
    addHeroNode,
    updateHeroRange,
    convertToHero,
    convertToVilain
  }
}

// Logique pour l'auto-update des positions
function applyAutoLogic(nodes: (ScenarioNode & { isAutomatic?: boolean })[], tableFormat: TableFormat): (ScenarioNode & { isAutomatic?: boolean })[] {
  const tablePositions = getTablePositions(tableFormat)
  const actionSequence = nodes
    .filter(n => n.action && n.action !== 'fold')
    .sort((a, b) => tablePositions.indexOf(a.position) - tablePositions.indexOf(b.position))
  
  let updatedNodes = [...nodes]
  
  // Règle 1: Si une position late a une action, toutes les positions early sans action doivent folder
  const latestAction = actionSequence[actionSequence.length - 1]
  if (latestAction) {
    const latestIndex = tablePositions.indexOf(latestAction.position)
    
    updatedNodes = updatedNodes.map(node => {
      const nodeIndex = tablePositions.indexOf(node.position)
      if (node.type !== 'hero' && nodeIndex < latestIndex && !node.action) {
        return { ...node, action: 'fold' as PokerAction, isAutomatic: true }
      }
      return node
    })
  }
  
  // Règle 2: Continuation après une action hero
  const heroNodes = updatedNodes.filter(n => n.type === 'hero')
  heroNodes.forEach(heroNode => {
    const heroIndex = tablePositions.indexOf(heroNode.position)
    
    if (heroNode.action === 'fold') {
      // Si hero fold, toutes les positions suivantes foldent automatiquement
      updatedNodes = updatedNodes.map(node => {
        const nodeIndex = tablePositions.indexOf(node.position)
        if (node.type !== 'hero' && nodeIndex > heroIndex && !node.action) {
          return { ...node, action: 'fold' as PokerAction, isAutomatic: true }
        }
        return node
      })
    }
  })
  
  return updatedNodes
}

// Ajoute automatiquement la continuation logique après une action
function addContinuation(
  nodes: (ScenarioNode & { isAutomatic?: boolean })[], 
  tableFormat: TableFormat, 
  changedNodeId: string, 
  newAction: PokerAction
): (ScenarioNode & { isAutomatic?: boolean })[] {
  const tablePositions = getTablePositions(tableFormat)
  const changedNode = nodes.find(n => n.id === changedNodeId)
  
  logger.debug('Adding continuation nodes', {
    changedNodeId,
    newAction,
    changedNode: changedNode?.position
  }, 'ScenarioLogic')
  
  if (!changedNode || newAction === 'fold') {
    logger.debug('No continuation needed: node not found or fold action', {}, 'ScenarioLogic')
    return nodes
  }

  // Actions qui créent un besoin de réponse
  const needsResponse = ['open', '3bet', '4bet', 'raise', 'bet']
  if (!needsResponse.includes(newAction)) {
    logger.debug('No continuation needed: action does not require response', { action: newAction }, 'ScenarioLogic')
    return nodes
  }

  const nodePosition = tablePositions.indexOf(changedNode.position)
  logger.debug('Position analysis', {
    position: changedNode.position,
    positionIndex: nodePosition
  }, 'ScenarioLogic')
  
  // Trouver la prochaine position dans l'ordre qui n'a pas encore de node
  let nextResponder: PokerPosition | null = null
  
  // Chercher la prochaine position après celle qui a agi
  for (let i = nodePosition + 1; i < tablePositions.length; i++) {
    const pos = tablePositions[i]
    const existingNode = nodes.find(n => n.position === pos)
    
    logger.debug(`Position check: ${pos}`, { 
      position: pos, 
      exists: !!existingNode 
    }, 'ScenarioLogic')
    
    if (!existingNode) {
      nextResponder = pos
      break
    }
  }

  // Si pas trouvé, chercher depuis le début (pour les blindes)
  if (!nextResponder) {
    for (let i = 0; i <= nodePosition; i++) {
      const pos = tablePositions[i]
      const existingNode = nodes.find(n => n.position === pos)
      
      if (!existingNode && pos !== changedNode.position) {
        nextResponder = pos
        break
      }
    }
  }

  logger.debug('Next responder found', { nextResponder }, 'ScenarioLogic')

  // Ajouter le node de continuation
  if (nextResponder) {
    const continuationNode: ScenarioNode & { isAutomatic?: boolean } = {
      id: `continuation-${nextResponder}-${Date.now()}`,
      type: 'vilain',
      position: nextResponder
      // Pas d'action par défaut - l'utilisateur choisira
    }
    
    logger.debug('Adding continuation node', { 
      position: continuationNode.position,
      action: continuationNode.action 
    }, 'ScenarioLogic')
    return [...nodes, continuationNode]
  }

  logger.debug('No continuation added', {}, 'ScenarioLogic')
  return nodes
}

// Helper pour automatiquement continuer le flow après une action hero
export function createContinuationNodes(
  heroNode: ScenarioNode, 
  tableFormat: TableFormat
): ScenarioNode[] {
  const tablePositions = getTablePositions(tableFormat)
  const heroIndex = tablePositions.indexOf(heroNode.position)
  const continuationNodes: ScenarioNode[] = []

  // Si le hero fold, toutes les positions suivantes fold automatiquement
  if (heroNode.action === 'fold') {
    for (let i = heroIndex + 1; i < tablePositions.length; i++) {
      const position = tablePositions[i]
      continuationNodes.push({
        id: `auto-${position}-${Date.now()}`,
        type: 'vilain',
        position,
        action: 'fold'
      })
    }
  }

  return continuationNodes
}