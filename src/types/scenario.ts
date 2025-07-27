// Types pour le système de scénarios poker - v3 Implementation
// Basé sur trainer-scenario-v3.md

export type PokerPosition = 'UTG' | 'UTG+1' | 'UTG+2' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'

export type PokerAction = 'fold' | 'call' | 'limp' | 'open' | '3bet' | '4bet' | 'raise'

export type TableFormat = '6max' | '9max'

// États des nodes selon v3 spec
export type NodeState = 
  | 'Actif'           // Can take action
  | 'En attente'      // Waiting for previous player
  | 'Fold'            // Folded
  | 'Limp'            // Called 1BB
  | 'Raise'           // Raised
  | 'Open'            // Opened
  | '3bet'            // Re-raised
  | '4bet'            // Re-re-raised
  | 'UserPersonalState' // Custom state

// Propriétés des nodes selon v3 spec
export interface NodeProperties {
  id: string
  position: PokerPosition
  state: NodeState
  isHero: boolean
  linkedRange: RangeObject | null
  sizing: number | null
  availableActions: PokerAction[]
}

// Range object placeholder
export interface RangeObject {
  id: string
  name: string
  hands: string[]
}

// Action avec sizing
export interface ActionWithSizing {
  action: PokerAction
  sizing?: number
}

// Node de base
export interface BaseNode {
  id: string
  position: PokerPosition
  state: NodeState
  isHero: boolean
  linkedRange?: RangeObject | null
  sizing?: number | null
  stackSize?: number | null // Stack effectif spécifique à ce node (override du scénario)
  availableActions: PokerAction[]
  action?: PokerAction // Action choisie par ce node
}

// Historique des actions pour le calcul contextuel
export interface ActionHistory {
  nodeId: string
  position: PokerPosition
  action: PokerAction
  sizing?: number
  timestamp: number
}

// Contexte global du scénario
export interface ScenarioContext {
  lastRaiser?: { position: PokerPosition; action: PokerAction; sizing?: number }
  lastOpener?: { position: PokerPosition; action: PokerAction; sizing?: number }
  actionHistory: ActionHistory[]
}

// Configuration de création de nodes selon v3 spec
export interface NodeCreationConfig {
  totalNodes: number // 7 initially (1 master + 6 positions)
  masterNodeId: string
  positionNodeIds: string[]
}

// Algorithme de création dynamique selon v3 spec
export interface DynamicNodeCreation {
  shouldCreate: boolean
  newNodeIds: string[]
  parentNodes: string[]
  targetPositions: PokerPosition[]
}

// Helpers pour les positions
export const POKER_POSITIONS: PokerPosition[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
export const POKER_POSITIONS_9MAX: PokerPosition[] = ['UTG', 'UTG+1', 'UTG+2', 'HJ', 'CO', 'BTN', 'SB', 'BB']

export const getPositionIndex = (position: PokerPosition): number => {
  return POKER_POSITIONS.indexOf(position)
}

export const getNextPosition = (position: PokerPosition): PokerPosition | null => {
  const index = getPositionIndex(position)
  return index < POKER_POSITIONS.length - 1 ? POKER_POSITIONS[index + 1] : null
}

export const getPreviousPosition = (position: PokerPosition): PokerPosition | null => {
  const index = getPositionIndex(position)
  return index > 0 ? POKER_POSITIONS[index - 1] : null
}

export const getTablePositions = (tableFormat: TableFormat): PokerPosition[] => {
  if (tableFormat === '9max') {
    return POKER_POSITIONS_9MAX
  }
  return POKER_POSITIONS // 6max par défaut
}