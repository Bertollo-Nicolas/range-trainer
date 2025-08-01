// Règles de succession des actions poker
import { 
  PokerAction, 
  PokerPosition, 
  TableFormat, 
  getTablePositions 
} from '@/types/scenario'

interface ActionRule {
  fromAction: PokerAction | string
  toActions: PokerAction[]
  description?: string
  createsNewNode?: boolean
  targetPosition?: any
  skipNode?: boolean
}

// Helper pour obtenir la position suivante dans l'ordre
export const getNextPosition = (currentPos: PokerPosition, tableFormat: TableFormat): PokerPosition | null => {
  const positions = getTablePositions(tableFormat)
  const currentIndex = positions.indexOf(currentPos)
  
  if (currentIndex === -1 || currentIndex === positions.length - 1) {
    return null // Position non trouvée ou dernière position
  }
  
  return positions[currentIndex + 1]
}

// Helper pour obtenir la position précédente dans l'ordre
export const getPreviousPosition = (currentPos: PokerPosition, tableFormat: TableFormat): PokerPosition | null => {
  const positions = getTablePositions(tableFormat)
  const currentIndex = positions.indexOf(currentPos)
  
  if (currentIndex === -1 || currentIndex === 0) {
    return null // Position non trouvée ou première position
  }
  
  return positions[currentIndex - 1]
}

// Règles de succession des actions selon la logique poker
export const ACTION_SUCCESSION_RULES: ActionRule[] = [
  // === PREMIERE ACTION (OPEN ou LIMP) ===
  {
    fromAction: 'open',
    toActions: ['fold', '3bet', 'call'],
    createsNewNode: true,
    targetPosition: getNextPosition
  },
  {
    fromAction: 'limp',
    toActions: ['fold', 'call', 'open'], // Quelqu'un peut encore open après un limp
    createsNewNode: true,
    targetPosition: getNextPosition
  },
  
  // === 3BET SEQUENCES ===
  {
    fromAction: '3bet',
    toActions: ['fold', '4bet', 'call'],
    createsNewNode: true,
    targetPosition: getNextPosition
  },
  
  // === 4BET SEQUENCES ===
  {
    fromAction: '4bet',
    toActions: ['fold', 'call'], // Pas de 5bet dans notre système simplifié
    createsNewNode: true,
    targetPosition: getNextPosition
  },
  
  // === ACTIONS TERMINALES ===
  {
    fromAction: 'fold',
    toActions: [],
    createsNewNode: false,
    skipNode: true // Le node est skippé, passer au suivant
  },
  {
    fromAction: 'call',
    toActions: [],
    createsNewNode: false // Call termine le tour preflop (action terminale)
  },
  
  // === ACTIONS DEFENSIVES (vs 3bet, vs 4bet) ===
  {
    fromAction: 'vs_3bet',
    toActions: ['fold', '4bet', 'call'],
    createsNewNode: true,
    targetPosition: (currentPos: any, tableFormat: any) => {
      // Retourner à la position qui a 3bet pour sa réaction
      return getPreviousPosition(currentPos, tableFormat)
    }
  },
  {
    fromAction: 'vs_4bet',
    toActions: ['fold', 'call'], // Pas de 5bet
    createsNewNode: true,
    targetPosition: (currentPos: any, tableFormat: any) => {
      // Retourner à la position qui a 4bet pour sa réaction
      return getPreviousPosition(currentPos, tableFormat)
    }
  }
]

// Obtenir les actions possibles pour un node donné l'action précédente
export const getAvailableActionsFromPrevious = (previousAction?: PokerAction): PokerAction[] => {
  if (!previousAction) {
    // Première action possible : open, limp ou fold
    return ['fold', 'limp', 'open']
  }
  
  const rule = ACTION_SUCCESSION_RULES.find(r => r.fromAction === previousAction)
  return rule?.toActions || []
}

// Déterminer si une action crée un nouveau node
export const shouldCreateNewNode = (action: PokerAction): boolean => {
  const rule = ACTION_SUCCESSION_RULES.find(r => r.fromAction === action)
  return rule?.createsNewNode || false
}

// Déterminer si un node doit être skippé (ex: après fold)
export const shouldSkipNode = (action: PokerAction): boolean => {
  const rule = ACTION_SUCCESSION_RULES.find(r => r.fromAction === action)
  return rule?.skipNode || false
}

// Obtenir la position cible pour le prochain node
export const getTargetPosition = (
  fromAction: PokerAction, 
  currentPosition: PokerPosition, 
  tableFormat: TableFormat
): PokerPosition | null => {
  const rule = ACTION_SUCCESSION_RULES.find(r => r.fromAction === fromAction)
  
  if (!rule?.targetPosition) {
    return null
  }
  
  return rule.targetPosition(currentPosition, tableFormat)
}

// Validation : vérifier si une action est valide dans le contexte
export const isValidActionSequence = (
  previousAction: PokerAction | undefined, 
  nextAction: PokerAction
): boolean => {
  const availableActions = getAvailableActionsFromPrevious(previousAction)
  return availableActions.includes(nextAction)
}

// Cas spéciaux pour BB (Big Blind)
export const getBBAvailableActions = (hasAction: boolean): (PokerAction | string)[] => {
  if (!hasAction) {
    // BB sans action précédente = check possible
    return ['fold', 'call', 'check']
  } else {
    // BB avec action = call, fold ou raise (pas open)
    return ['fold', 'call', '3bet'] // 3bet = raise pour BB
  }
}

// Helper pour déterminer si on est dans un scénario multi-way
export const isMultiWayAction = (action: PokerAction): boolean => {
  return ['call', 'limp'].includes(action)
}

// Helper pour les sizings selon l'action
export const getDefaultSizingsForAction = (action: PokerAction | string): string[] => {
  switch (action) {
    case 'open':
      return ['2bb', '2.5bb', '3bb']
    case '3bet':
      return ['8bb', '9bb', '10bb', '12bb']
    case '4bet':
      return ['20bb', '24bb', '28bb']
    case 'call':
    case 'fold':
    case 'check':
      return []
    case 'limp':
      return ['1bb']
    default:
      return ['pot', '0.5pot', '0.75pot']
  }
}

// Fonction pour obtenir le sizing par défaut selon l'action et la position (IP/OOP)
export const getDefaultSizingForAction = (action: PokerAction, isInPosition: boolean = true): number => {
  switch (action) {
    case 'open':
      return 2 // Sizing minimum comme demandé
    case '3bet':
      return isInPosition ? 3 : 4 // 3bet IP = x3, 3bet OOP = x4
    case '4bet':
      return 20
    case 'raise':
      return isInPosition ? 3 : 4 // Même logique que 3bet
    case 'limp':
      return 1
    default:
      return 2 // Sizing minimum par défaut
  }
}