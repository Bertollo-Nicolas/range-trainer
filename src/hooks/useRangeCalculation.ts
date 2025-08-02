'use client'

import { useMemo, useCallback } from 'react'
import { 
  PokerHand, 
  RangeStats, 
  calculateRangeStats, 
  getHandCombinations,
  ALL_POKER_HANDS 
} from '@/types/poker'
import { HandAction, EditorAction, MixedColor } from '@/types/editor'

interface UseRangeCalculationOptions {
  handActions: HandAction[]
  actions: EditorAction[]
  mixedColors: MixedColor[]
}

interface ActionStats extends RangeStats {
  action: EditorAction
  hands: PokerHand[]
  color: string
}

interface MixedColorStats extends RangeStats {
  mixedColor: MixedColor
  hands: PokerHand[]
  weightedPercentage: number
}

interface DetailedRangeStats {
  overall: RangeStats
  byAction: ActionStats[]
  byMixedColor: MixedColorStats[]
  pairStats: {
    pairs: PokerHand[]
    count: number
    combinations: number
    percentage: number
  }
  suitedStats: {
    suited: PokerHand[]
    count: number
    combinations: number
    percentage: number
  }
  offsuitStats: {
    offsuit: PokerHand[]
    count: number
    combinations: number
    percentage: number
  }
}

export const useRangeCalculation = ({
  handActions,
  actions,
  mixedColors
}: UseRangeCalculationOptions) => {
  
  // Get all selected hands
  const selectedHands = useMemo(() => {
    return handActions.map(ha => ha.handId)
  }, [handActions])

  // Calculate overall range stats
  const overallStats = useMemo(() => {
    return calculateRangeStats(selectedHands)
  }, [selectedHands])

  // Calculate stats by action
  const actionStats = useMemo((): ActionStats[] => {
    return actions.map(action => {
      const handsForAction = handActions
        .filter(ha => ha.actionId === action.id)
        .map(ha => ha.handId)
      
      return {
        action,
        hands: handsForAction,
        color: action.color,
        ...calculateRangeStats(handsForAction)
      }
    })
  }, [handActions, actions])

  // Calculate stats by mixed color
  const mixedColorStats = useMemo((): MixedColorStats[] => {
    return mixedColors.map(mixedColor => {
      const handsForMixedColor = handActions
        .filter(ha => ha.mixedColorId === mixedColor.id)
        .map(ha => ha.handId)
      
      // Calculate weighted percentage for mixed colors
      const weightedPercentage = mixedColor.actions.reduce((sum, actionRef) => {
        return sum + (actionRef.percentage / 100)
      }, 0) * 100

      return {
        mixedColor,
        hands: handsForMixedColor,
        weightedPercentage,
        ...calculateRangeStats(handsForMixedColor)
      }
    })
  }, [handActions, mixedColors])

  // Detailed breakdown by hand types
  const detailedStats = useMemo((): DetailedRangeStats => {
    const pairs = selectedHands.filter(hand => hand.length === 2 && hand[0] === hand[1])
    const suited = selectedHands.filter(hand => hand.includes('s'))
    const offsuit = selectedHands.filter(hand => hand.includes('o'))

    return {
      overall: overallStats,
      byAction: actionStats,
      byMixedColor: mixedColorStats,
      pairStats: {
        pairs,
        count: pairs.length,
        combinations: pairs.reduce((sum, hand) => sum + getHandCombinations(hand), 0),
        percentage: (pairs.reduce((sum, hand) => sum + getHandCombinations(hand), 0) / 1326) * 100
      },
      suitedStats: {
        suited,
        count: suited.length,
        combinations: suited.reduce((sum, hand) => sum + getHandCombinations(hand), 0),
        percentage: (suited.reduce((sum, hand) => sum + getHandCombinations(hand), 0) / 1326) * 100
      },
      offsuitStats: {
        offsuit,
        count: offsuit.length,
        combinations: offsuit.reduce((sum, hand) => sum + getHandCombinations(hand), 0),
        percentage: (offsuit.reduce((sum, hand) => sum + getHandCombinations(hand), 0) / 1326) * 100
      }
    }
  }, [overallStats, actionStats, mixedColorStats, selectedHands])

  // Get color for a specific hand
  const getHandColor = useCallback((hand: PokerHand): string | null => {
    const handAction = handActions.find(ha => ha.handId === hand)
    
    if (!handAction) return null
    
    if (handAction.mixedColorId) {
      // For mixed colors, return a gradient or the first action's color
      const mixedColor = mixedColors.find(mc => mc.id === handAction.mixedColorId)
      if (mixedColor && mixedColor.actions.length > 0) {
        const firstActionId = mixedColor.actions[0].actionId
        const firstAction = actions.find(a => a.id === firstActionId)
        return firstAction?.color || null
      }
    }
    
    if (handAction.actionId) {
      const action = actions.find(a => a.id === handAction.actionId)
      return action?.color || null
    }
    
    return null
  }, [handActions, actions, mixedColors])

  // Check if a hand is selected
  const isHandSelected = useCallback((hand: PokerHand): boolean => {
    return handActions.some(ha => ha.handId === hand)
  }, [handActions])

  // Get action for a specific hand
  const getHandAction = useCallback((hand: PokerHand): EditorAction | null => {
    const handAction = handActions.find(ha => ha.handId === hand)
    if (!handAction?.actionId) return null
    
    return actions.find(a => a.id === handAction.actionId) || null
  }, [handActions, actions])

  // Get mixed color for a specific hand
  const getHandMixedColor = useCallback((hand: PokerHand): MixedColor | null => {
    const handAction = handActions.find(ha => ha.handId === hand)
    if (!handAction?.mixedColorId) return null
    
    return mixedColors.find(mc => mc.id === handAction.mixedColorId) || null
  }, [handActions, mixedColors])

  // Calculate range comparison (useful for analyzing multiple ranges)
  const compareRanges = useCallback((otherHandActions: HandAction[]): {
    overlap: PokerHand[]
    onlyInFirst: PokerHand[]
    onlyInSecond: PokerHand[]
    overlapPercentage: number
  } => {
    const firstHands = new Set(selectedHands)
    const secondHands = new Set(otherHandActions.map(ha => ha.handId))
    
    const overlap = Array.from(firstHands).filter(hand => secondHands.has(hand))
    const onlyInFirst = Array.from(firstHands).filter(hand => !secondHands.has(hand))
    const onlyInSecond = Array.from(secondHands).filter(hand => !firstHands.has(hand))
    
    const overlapCombinations = overlap.reduce((sum, hand) => sum + getHandCombinations(hand), 0)
    const overlapPercentage = (overlapCombinations / 1326) * 100
    
    return {
      overlap,
      onlyInFirst,
      onlyInSecond,
      overlapPercentage
    }
  }, [selectedHands])

  // Get hands in a rectangular selection (for drag selection)
  const getHandsInRectangle = useCallback((
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): PokerHand[] => {
    const minRow = Math.min(startRow, endRow)
    const maxRow = Math.max(startRow, endRow)
    const minCol = Math.min(startCol, endCol)
    const maxCol = Math.max(startCol, endCol)
    
    const handsInRect: PokerHand[] = []
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (row < 13 && col < 13) {
          // Import POKER_HANDS from poker types
          const hand = ALL_POKER_HANDS[row * 13 + col]
          if (hand) {
            handsInRect.push(hand)
          }
        }
      }
    }
    
    return handsInRect
  }, [])

  // Generate range text representation (like "22+, A2s+, KTo+")
  const generateRangeText = useCallback((): string => {
    // This is a complex algorithm to convert hand selection to poker notation
    // For now, return a simple comma-separated list
    return selectedHands.sort().join(', ')
  }, [selectedHands])

  // Export range in various formats
  const exportRange = useCallback((format: 'pokerstove' | 'equilab' | 'pio' | 'simple') => {
    switch (format) {
      case 'simple':
        return selectedHands.join(',')
      case 'pokerstove':
        return generateRangeText()
      default:
        return selectedHands.join(',')
    }
  }, [selectedHands, generateRangeText])

  return {
    // Basic stats
    selectedHands,
    overallStats,
    detailedStats,
    actionStats,
    mixedColorStats,
    
    // Hand utilities
    getHandColor,
    isHandSelected,
    getHandAction,
    getHandMixedColor,
    
    // Range operations
    compareRanges,
    getHandsInRectangle,
    generateRangeText,
    exportRange,
    
    // Computed values
    isEmpty: selectedHands.length === 0,
    isFull: selectedHands.length === ALL_POKER_HANDS.length,
    selectedPercentage: overallStats.percentage,
    selectedCombinations: overallStats.totalCombinations,
  }
}