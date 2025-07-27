'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Crown } from 'lucide-react'
import { ScenarioService } from '@/lib/services/scenario-service'
import { BaseNode } from '@/types/scenario'
import { TreeService } from '@/lib/services/tree-service'
import { SessionService } from '@/lib/services/session-service'
import { logger } from '@/utils/logger'

// Types pour les stats
interface PracticeStats {
  totalHands: number
  correctAnswers: number
  incorrectAnswers: number
}

// Types pour l'historique des mains
interface HandHistory {
  id: string
  hand: string
  position: string
  playerAction: string
  correctAction: string
  isCorrect: boolean
  timestamp: number
}

// Types pour l'animation
interface AnimationState {
  isPlaying: boolean
  currentStep: number
  currentPot: number
  playedActions: Set<string>
  activePosition: string | null
  waitingForHero: boolean
}

// Types pour les cartes et mains
type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'

interface Card {
  rank: Rank
  suit: Suit
  color: 'red' | 'black'
}

interface Hand {
  card1: Card
  card2: Card
  notation: string // Ex: "AKs", "74o", "AA"
  isPair: boolean
  isSuited: boolean
}

interface RandomHandState {
  currentHand: Hand | null
  showHand: boolean
}

interface RangeDisplayState {
  isVisible: boolean
  currentRange: string[] | null
  highlightedHand: string | null
}

// Composant pour une position de joueur avec animation
function PlayerPosition({ 
  node, 
  className,
  isActive = false,
  hasPlayedAction = false,
  showActionAnimation = false,
  heroHand = null
}: { 
  node?: BaseNode
  className: string
  isActive?: boolean
  hasPlayedAction?: boolean
  showActionAnimation?: boolean
  heroHand?: Hand | null
}) {
  const isHero = node?.isHero
  const hasAction = node?.action && node.action !== 'fold'
  const isFolded = node?.action === 'fold'
  
  return (
    <div className={`absolute w-[70px] h-[70px] rounded-full shadow-lg transition-all duration-500 ${
      isActive
        ? 'bg-card border-4 border-yellow-400 ring-4 ring-yellow-400/50 animate-pulse scale-110'
        : isHero 
        ? 'bg-card border-4 border-primary ring-2 ring-primary/50' 
        : hasPlayedAction && hasAction
        ? 'bg-card border-4 border-green-500 ring-2 ring-green-500/30'
        : 'bg-card border-4 border-border'
    } ${className}`}>
      <div className="infos flex flex-col items-center justify-center h-full text-xs">
        <span className={`uppercase font-bold transition-colors duration-300 ${
          isActive ? 'text-yellow-600' :
          isFolded && hasPlayedAction ? 'text-gray-500' :
          isHero ? 'text-primary' : 
          hasPlayedAction && hasAction ? 'text-green-600' : 'text-foreground'
        }`}>
          {node?.position || 'Empty'}
        </span>
        <span className={`text-[10px] transition-colors duration-300 ${
          isFolded && hasPlayedAction ? 'text-gray-500' : 'text-muted-foreground'
        }`}>100</span>
        {hasPlayedAction && node?.action && (
          <div className="text-center">
            <span className={`text-[9px] font-bold uppercase transition-all duration-500 ${
              showActionAnimation ? 'animate-bounce' : ''
            } ${
              isFolded ? 'text-gray-500' :
              isHero ? 'text-primary' : 'text-green-600'
            }`}>
              {node.action}
            </span>
            {node.sizing && ['open', '3bet', '4bet', 'raise'].includes(node.action) && (
              <div className={`text-[8px] font-medium transition-all duration-500 ${
                isFolded ? 'text-gray-400' :
                isHero ? 'text-primary/80' : 'text-green-500'
              }`}>
                {node.sizing}bb
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Icône couronne pour Hero */}
      {isHero && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-black border border-primary rounded-full flex items-center justify-center shadow-md">
          <Crown className="h-3 w-3 text-primary" />
        </div>
      )}
      
      {/* Chips pour les sizings */}
      {hasPlayedAction && node?.sizing && ['open', '3bet', '4bet', 'raise'].includes(node.action || '') && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-1">
            {/* Stack de chips */}
            <div className="relative">
              <div className="w-4 h-4 bg-yellow-500 border border-yellow-600 rounded-full shadow-sm"></div>
              <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded-full shadow-sm absolute -top-0.5 left-0"></div>
              <div className="w-4 h-4 bg-yellow-300 border border-yellow-400 rounded-full shadow-sm absolute -top-1 left-0"></div>
            </div>
            <span className="text-[8px] font-bold text-yellow-700 bg-yellow-100 px-1 rounded">
              {node.sizing}bb
            </span>
          </div>
        </div>
      )}
      
      {/* Cartes Hero à côté de la position */}
      {isHero && heroHand && (
        <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 flex space-x-1">
          <div className={`w-10 h-14 bg-white rounded border-2 shadow-lg flex flex-col items-center justify-center ${
            heroHand.card1.color === 'red' ? 'border-red-500' : 'border-gray-700'
          }`}>
            <div className={`text-base font-bold leading-none ${
              heroHand.card1.color === 'red' ? 'text-red-500' : 'text-gray-800'
            }`}>
              {heroHand.card1.rank}
            </div>
            <div className={`text-sm leading-none ${
              heroHand.card1.color === 'red' ? 'text-red-500' : 'text-gray-800'
            }`}>
              {heroHand.card1.suit}
            </div>
          </div>
          <div className={`w-10 h-14 bg-white rounded border-2 shadow-lg flex flex-col items-center justify-center ${
            heroHand.card2.color === 'red' ? 'border-red-500' : 'border-gray-700'
          }`}>
            <div className={`text-base font-bold leading-none ${
              heroHand.card2.color === 'red' ? 'text-red-500' : 'text-gray-800'
            }`}>
              {heroHand.card2.rank}
            </div>
            <div className={`text-sm leading-none ${
              heroHand.card2.color === 'red' ? 'text-red-500' : 'text-gray-800'
            }`}>
              {heroHand.card2.suit}
            </div>
          </div>
        </div>
      )}
      
      {/* Animation des jetons vers le pot */}
      {showActionAnimation && hasAction && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
        </div>
      )}
    </div>
  )
}

// Fonction pour calculer le pot
function calculatePot(nodes: BaseNode[]): number {
  let pot = 1.5 // SB (0.5) + BB (1)
  
  // Trier les nodes par ordre de jeu pour calculer le pot correctement
  const sortedNodes = [...nodes].sort((a, b) => {
    const positions = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
    return positions.indexOf(a.position) - positions.indexOf(b.position)
  })
  
  let currentBet = 1 // BB est la mise de base
  
  sortedNodes.forEach(node => {
    if (node.action === 'open') {
      const openSize = node.sizing || 2 // Use node sizing or 2bb default
      pot += openSize
      currentBet = openSize
    }
    else if (node.action === '3bet') {
      const betSize = node.sizing || (currentBet * 3) // Use node sizing or 3x previous bet
      pot += betSize
      currentBet = betSize
    }
    else if (node.action === '4bet') {
      const betSize = node.sizing || (currentBet * 2.5) // Use node sizing or 2.5x previous bet
      pot += betSize
      currentBet = betSize
    }
    else if (node.action === 'call') {
      pot += currentBet // Call la mise actuelle
    }
    else if (node.action === 'limp') {
      pot += 1 // Limp = 1bb
    }
    // fold adds nothing to pot
  })
  
  return pot
}

// Constantes pour les cartes
const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
const SUITS: Suit[] = ['♠', '♥', '♦', '♣']

// Function to create a card
function createCard(rank: Rank, suit: Suit): Card {
  return {
    rank,
    suit,
    color: suit === '♥' || suit === '♦' ? 'red' : 'black'
  }
}

// Function to generate a random hand
function generateRandomHand(): Hand {
  // Select two ranks randomly
  const rank1Index = Math.floor(Math.random() * RANKS.length)
  const rank2Index = Math.floor(Math.random() * RANKS.length)
  
  const rank1 = RANKS[rank1Index]
  const rank2 = RANKS[rank2Index]
  
  // Determine if it's a pair
  const isPair = rank1 === rank2
  
  // If it's a pair, use different suits
  if (isPair) {
    const suit1Index = Math.floor(Math.random() * SUITS.length)
    let suit2Index = Math.floor(Math.random() * SUITS.length)
    // Ensure suits are different for a pair
    while (suit2Index === suit1Index) {
      suit2Index = Math.floor(Math.random() * SUITS.length)
    }
    
    const card1 = createCard(rank1, SUITS[suit1Index])
    const card2 = createCard(rank2, SUITS[suit2Index])
    
    return {
      card1,
      card2,
      notation: rank1 + rank1, // AA, KK, etc.
      isPair: true,
      isSuited: false
    }
  }
  
  // For non-pairs, determine suited or offsuited
  const isSuited = Math.random() < 0.5
  
  let suit1: Suit, suit2: Suit
  if (isSuited) {
    const suitIndex = Math.floor(Math.random() * SUITS.length)
    suit1 = SUITS[suitIndex]
    suit2 = SUITS[suitIndex]
  } else {
    const suit1Index = Math.floor(Math.random() * SUITS.length)
    let suit2Index = Math.floor(Math.random() * SUITS.length)
    while (suit2Index === suit1Index) {
      suit2Index = Math.floor(Math.random() * SUITS.length)
    }
    suit1 = SUITS[suit1Index]
    suit2 = SUITS[suit2Index]
  }
  
  const card1 = createCard(rank1, suit1)
  const card2 = createCard(rank2, suit2)
  
  // Create notation (always with highest card first)
  let notation: string
  if (rank1Index < rank2Index) {
    notation = rank1 + rank2 + (isSuited ? 's' : 'o')
  } else {
    notation = rank2 + rank1 + (isSuited ? 's' : 'o')
  }
  
  return {
    card1,
    card2,
    notation,
    isPair: false,
    isSuited
  }
}

// Function to check if a hand is in a range
function isHandInRange(hand: Hand, rangeHands: string[]): boolean {
  return rangeHands.includes(hand.notation)
}

// Fonction pour obtenir les actions possibles d'une main avec mixed colors
function getHandActions(hand: Hand, rangeData: any): {
  actions: Array<{ action: string, percentage: number }>
  isMixed: boolean
} {
  if (!rangeData?.editorData) {
    return { actions: [], isMixed: false }
  }

  // Trouver l'action de cette main
  const handAction = rangeData.editorData.handActions?.find((ha: any) => ha.handId === hand.notation)
  
  if (!handAction) {
    return { actions: [], isMixed: false }
  }

  if (handAction.mixedColorId) {
    // C'est une mixed color
    const mixedColor = rangeData.editorData.mixedColors?.find((mc: any) => mc.id === handAction.mixedColorId)
    if (!mixedColor) {
      return { actions: [], isMixed: false }
    }

    // Get actions with their percentages
    const actions = mixedColor.actions.map((action: any) => {
      const actionDef = rangeData.editorData.actions?.find((a: any) => a.id === action.actionId)
      return {
        action: actionDef?.name || 'unknown',
        percentage: action.percentage
      }
    })

    return { actions, isMixed: true }
  } else if (handAction.actionId) {
    // Action simple
    const actionDef = rangeData.editorData.actions?.find((a: any) => a.id === handAction.actionId)
    return {
      actions: [{ action: actionDef?.name || 'unknown', percentage: 100 }],
      isMixed: false
    }
  }

  return { actions: [], isMixed: false }
}

// Fonction pour valider une action avec support des mixed colors
function validateActionWithMixedColors(playerAction: string, hand: Hand, node: BaseNode, rangeData?: any): boolean {
  if (!node.linkedRange?.hands) {
    return false
  }

  const handInRange = isHandInRange(hand, node.linkedRange.hands)
  
  if (!handInRange) {
    // Main pas dans la range, seul fold est correct
    logger.debug('Hand not in range, fold expected', {
      hand: hand.notation,
      playerAction,
      isCorrect: playerAction === 'fold'
    }, 'Practice')
    return playerAction === 'fold'
  }

  // Hand in range, check mixed colors if available
  if (rangeData?.editorData) {
    const handActions = getHandActions(hand, rangeData)
    
    if (handActions.isMixed && handActions.actions.length > 0) {
      // Cette main a des actions mixtes avec pourcentages
      const validActions = handActions.actions.map(a => normalizeAction(a.action))
      const normalizedPlayerAction = normalizeAction(playerAction)
      
      // Calculate total percentage of defined actions
      const totalDefinedPercentage = handActions.actions.reduce((sum, a) => sum + a.percentage, 0)
      const remainingPercentage = 100 - totalDefinedPercentage
      
      // Si il reste du pourcentage et que le joueur fold, c'est valide
      const isFoldValid = remainingPercentage > 0 && normalizedPlayerAction === 'fold'
      const isActionValid = validActions.includes(normalizedPlayerAction)
      const isValid = isActionValid || isFoldValid
      
      logger.debug('Mixed colors validation', {
        hand: hand.notation,
        playerAction,
        normalizedPlayerAction,
        validActions: handActions.actions,
        totalDefinedPercentage,
        remainingPercentage,
        isFoldValid,
        isActionValid,
        isValid
      }, 'Practice')
      
      return isValid
    } else if (handActions.actions.length === 1) {
      // Action simple (pas mixte)
      const normalizedPlayerAction = normalizeAction(playerAction)
      const normalizedValidAction = normalizeAction(handActions.actions[0].action)
      
      logger.debug('Simple action validation', {
        hand: hand.notation,
        playerAction,
        normalizedPlayerAction,
        validAction: handActions.actions[0].action,
        normalizedValidAction,
        isCorrect: normalizedPlayerAction === normalizedValidAction
      }, 'Practice')
      
      return normalizedPlayerAction === normalizedValidAction
    }
  }

  // Fallback: classic validation against scenario action
  const normalizedPlayerAction = normalizeAction(playerAction)
  const normalizedScenarioAction = normalizeAction(node.action || '')
  
  logger.debug('Fallback validation', {
    hand: hand.notation,
    playerAction,
    scenarioAction: node.action,
    isCorrect: normalizedPlayerAction === normalizedScenarioAction
  }, 'Practice')
  
  return normalizedPlayerAction === normalizedScenarioAction
}

// Function to normalize actions (map equivalences)
function normalizeAction(action: string): string {
  const actionMap: { [key: string]: string } = {
    'open': 'raise',
    '3bet': 'raise', 
    '4bet': 'raise',
    'raise': 'raise',
    'call': 'call',
    'fold': 'fold',
    'check': 'call', // check can be equivalent to call in some cases
    'bet': 'raise'
  }
  
  return actionMap[action.toLowerCase()] || action.toLowerCase()
}

// Composant pour afficher une carte
function CardDisplay({ card }: { card: Card }) {
  return (
    <div className={`inline-flex items-center justify-center w-12 h-16 rounded-lg border-2 bg-white shadow-lg ${
      card.color === 'red' ? 'border-red-500' : 'border-gray-800'
    }`}>
      <div className={`text-lg font-bold ${
        card.color === 'red' ? 'text-red-500' : 'text-gray-800'
      }`}>
        {card.rank}
      </div>
      <div className={`text-sm ${
        card.color === 'red' ? 'text-red-500' : 'text-gray-800'
      }`}>
        {card.suit}
      </div>
    </div>
  )
}

// Composant pour afficher une main
function HandDisplay({ hand }: { hand: Hand }) {
  if (!hand) return null
  
  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex space-x-2">
        <CardDisplay card={hand.card1} />
        <CardDisplay card={hand.card2} />
      </div>
      <div className="text-lg font-bold text-primary">
        {hand.notation}
      </div>
      <div className="text-xs text-muted-foreground">
        {hand.isPair ? 'Paire' : hand.isSuited ? 'Suited' : 'Offsuited'}
      </div>
    </div>
  )
}

// Generate 13x13 grid of poker hands
function generatePokerGrid(): string[] {
  const grid: string[] = []
  
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      const rank1 = RANKS[i]
      const rank2 = RANKS[j]
      
      if (i === j) {
        // Paire
        grid.push(rank1 + rank1)
      } else if (i < j) {
        // Suited (haute carte en premier)
        grid.push(rank1 + rank2 + 's')
      } else {
        // Offsuited (haute carte en premier)
        grid.push(rank2 + rank1 + 'o')
      }
    }
  }
  
  return grid
}

// Composant pour afficher une cellule de la grille
function RangeCell({ 
  hand, 
  isInRange, 
  isHighlighted 
}: { 
  hand: string
  isInRange: boolean
  isHighlighted: boolean
}) {
  return (
    <div className={`
      w-6 h-6 text-[8px] font-semibold flex items-center justify-center transition-all duration-200 cursor-default
      ${isHighlighted 
        ? 'bg-yellow-200 text-yellow-800 ring-2 ring-yellow-400' 
        : isInRange 
        ? 'bg-green-100 text-green-700' 
        : 'bg-gray-50 text-gray-500'
      }
    `}>
      {hand}
    </div>
  )
}

// Component to display complete range
function RangeDisplay({ 
  range, 
  highlightedHand, 
  isVisible, 
  onToggle 
}: { 
  range: string[] | null
  highlightedHand: string | null
  isVisible: boolean
  onToggle: () => void
}) {
  const pokerGrid = generatePokerGrid()
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="w-full"
        >
          {isVisible ? 'Masquer la Range' : 'Afficher la Range'}
        </Button>
      </div>
      
      {isVisible && (
        <div className="space-y-3">
          {range && (
            <div className="text-sm text-muted-foreground">
              {range.length} combos dans la range
            </div>
          )}
          
          <div className="grid grid-cols-13 gap-1 w-full">
            {pokerGrid.map((hand, index) => (
              <RangeCell
                key={index}
                hand={hand}
                isInRange={range ? range.includes(hand) : false}
                isHighlighted={hand === highlightedHand}
              />
            ))}
          </div>

          
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-muted-foreground">Dans la range</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-200 border border-yellow-500 rounded"></div>
              <span className="text-muted-foreground">Main actuelle</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


/**
 * Composant pour afficher l'historique des mains
 */
function HandHistoryPanel({ 
  history 
}: { 
  history: HandHistory[]
}) {
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">📝 Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground text-center py-4">
            Aucune main jouée encore
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">📝 Historique</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
        {history.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between px-2 py-1 rounded text-xs border ${
              entry.isCorrect 
                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                entry.isCorrect 
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {entry.isCorrect ? '✓' : '✗'}
              </div>
              <div className="font-bold">{entry.hand}</div>
              <div className="text-muted-foreground">{entry.position}</div>
            </div>
            <div className="text-right">
              <div className={entry.isCorrect ? 'text-green-600' : 'text-red-600'}>
                {entry.playerAction}
              </div>
              {!entry.isCorrect && (
                <div className="text-[10px] text-muted-foreground">
                  ({entry.correctAction})
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Composant pour afficher les stats
 */
function StatsPanel({ 
  stats, 
  autoNext, 
  setAutoNext, 
  onNextHand, 
  showNextButton,
  handHistory 
}: { 
  stats: PracticeStats
  autoNext: boolean
  setAutoNext: (value: boolean) => void
  onNextHand: () => void
  showNextButton: boolean
}) {
  const totalAnswers = stats.correctAnswers + stats.incorrectAnswers
  const correctPercentage = totalAnswers > 0 ? (stats.correctAnswers / totalAnswers) * 100 : 0
  const incorrectPercentage = totalAnswers > 0 ? (stats.incorrectAnswers / totalAnswers) * 100 : 0

  return (
    <aside className="w-80 border-r border-border p-6 space-y-6 bg-background">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Compteurs */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-primary/10 p-3 rounded-lg border">
              <div className="text-2xl font-bold text-primary">{stats.totalHands}</div>
              <div className="text-sm text-muted-foreground">Mains jouées</div>
            </div>
            
            <div className="bg-green-500/10 p-3 rounded-lg border">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Bonnes réponses</div>
            </div>
            
            <div className="bg-red-500/10 p-3 rounded-lg border">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.incorrectAnswers}</div>
              <div className="text-sm text-muted-foreground">Mauvaises réponses</div>
            </div>
          </div>

          {/* Barres de progression */}
          <div className="space-y-3 pt-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Bonnes réponses</span>
                <span className="text-green-600 dark:text-green-400">{correctPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={correctPercentage} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Mauvaises réponses</span>
                <span className="text-red-600 dark:text-red-400">{incorrectPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={incorrectPercentage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options */}      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">⚙️ Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Switch auto-next */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Passage automatique</div>
              <div className="text-xs text-muted-foreground">Main suivante après décision</div>
            </div>
            <button
              onClick={() => setAutoNext(!autoNext)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                autoNext ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoNext ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Bouton main suivante si auto-next désactivé */}
          {!autoNext && showNextButton && (
            <Button 
              onClick={onNextHand}
              className="w-full"
              size="sm"
            >
              Main suivante
            </Button>
          )}
        </CardContent>
      </Card>

    </aside>
  )
}


/**
 * Page Practice - Interface de training avec stats et table
 */
function PracticeContent() {
  const searchParams = useSearchParams()
  const scenarioId = searchParams.get('scenario')
  
  const [nodes, setNodes] = useState<BaseNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scenarioName, setScenarioName] = useState('')
  const [tableFormat, setTableFormat] = useState('6max')
  const [stats, setStats] = useState<PracticeStats>({
    totalHands: 0,
    correctAnswers: 0,
    incorrectAnswers: 0
  })
  const [animation, setAnimation] = useState<AnimationState>({
    isPlaying: true, // Start automatically
    currentStep: -1,
    currentPot: 1.5, // SB + BB
    playedActions: new Set(),
    activePosition: null,
    waitingForHero: false
  })
  const [autoNext, setAutoNext] = useState(true) // Option to automatically go to next hand
  const [randomHand, setRandomHand] = useState<RandomHandState>({
    currentHand: null,
    showHand: false
  })
  const [rangeDisplay, setRangeDisplay] = useState<RangeDisplayState>({
    isVisible: false,
    currentRange: null,
    highlightedHand: null
  })
  const [availableActions, setAvailableActions] = useState<string[]>(['fold'])
  
  // States for complex scenario logic
  const [firstHeroAction, setFirstHeroAction] = useState<{
    node: BaseNode
    range: string[]
    action: string
    rangeData: any // Complete range data with editorData
  } | null>(null)
  const [scenarioShouldStop, setScenarioShouldStop] = useState(false)
  const [currentScenarioHand, setCurrentScenarioHand] = useState<Hand | null>(null)
  const [scenarioInProgress, setScenarioInProgress] = useState(false)
  const [currentNodeRangeData, setCurrentNodeRangeData] = useState<any>(null)
  
  // États pour le suivi de session
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null)
  const [bestStreak, setBestStreak] = useState(0)
  const [handHistory, setHandHistory] = useState<HandHistory[]>([])

  useEffect(() => {
    if (scenarioId) {
      loadScenario(scenarioId)
    } else {
      setError('Aucun ID de scénario fourni')
      setLoading(false)
    }
  }, [scenarioId])

  // Analyze scenario to identify first Hero action
  const analyzeScenario = async (nodes: BaseNode[]) => {
    const firstHero = nodes.find(node => node.isHero)
    
    if (firstHero && firstHero.linkedRange?.hands && firstHero.action) {
      try {
        // Load complete range data to access mixed colors
        const fullRangeData = firstHero.linkedRange.id 
          ? await TreeService.getById(firstHero.linkedRange.id)
          : null

        setFirstHeroAction({
          node: firstHero,
          range: firstHero.linkedRange.hands,
          action: firstHero.action,
          rangeData: fullRangeData?.data || null
        })
        
        logger.info('First Hero identified', {
          position: firstHero.position,
          action: firstHero.action,
          rangeSize: firstHero.linkedRange.hands.length,
          hasMixedColors: fullRangeData?.data?.editorData?.mixedColors?.length > 0
        }, 'Practice')
      } catch (error) {
        logger.error('Error loading range data', { error }, 'Practice')
        setFirstHeroAction({
          node: firstHero,
          range: firstHero.linkedRange.hands,
          action: firstHero.action,
          rangeData: null
        })
      }
    } else {
      setFirstHeroAction(null)
    }
  }

  // Validate hand against first Hero action (complex logic)
  const validateHandForComplexScenario = (hand: Hand): { 
    shouldContinue: boolean, 
    shouldStop: boolean, 
    isValidForFirstAction: boolean 
  } => {
    if (!firstHeroAction) {
      // Fallback vers la logique normale
      return { shouldContinue: true, shouldStop: false, isValidForFirstAction: true }
    }

    const isInFirstRange = firstHeroAction.range.includes(hand.notation)
    
    if (isInFirstRange) {
      // Valid hand for first action → continue scenario
      logger.debug('Valid hand for first action, continuing scenario', { hand: hand.notation }, 'Practice')
      return { shouldContinue: true, shouldStop: false, isValidForFirstAction: true }
    } else {
      // Hand not in first range → stop scenario, new hand
      logger.debug('Hand not in first range, stopping scenario', { hand: hand.notation }, 'Practice')
      return { shouldContinue: false, shouldStop: true, isValidForFirstAction: false }
    }
  }

  // Animation effect
  useEffect(() => {
    if (!animation.isPlaying || nodes.length === 0) return

    const timer = setTimeout(() => {
      const nextStep = animation.currentStep + 1
      
      if (nextStep >= nodes.length) {
        // Animation finished
        setAnimation(prev => ({ ...prev, isPlaying: false, activePosition: null }))
        return
      }

      const currentNode = nodes[nextStep]

      // If it's a Hero, stop for interaction
      if (currentNode.isHero) {
        let newHand: Hand
        
        // If we already have a scenario hand in progress, reuse it
        if (scenarioInProgress && currentScenarioHand) {
          newHand = currentScenarioHand
          logger.debug('Reusing scenario hand', { hand: newHand.notation }, 'Practice')
        } else {
          // Generate new hand and validate according to complex logic
          newHand = generateRandomHand()
          let validation = validateHandForComplexScenario(newHand)
          
          // If scenario should stop due to hand, generate new hand
          if (validation.shouldStop) {
            logger.debug('Invalid hand, generating new hand', {}, 'Practice')
            newHand = generateRandomHand()
            validation = validateHandForComplexScenario(newHand)
            
            // Safety: try maximum 10 times to avoid infinite loop
            let attempts = 0
            while (validation.shouldStop && attempts < 10) {
              newHand = generateRandomHand()
              validation = validateHandForComplexScenario(newHand)
              attempts++
            }
            
            if (attempts >= 10) {
              logger.warn('Unable to generate valid hand after 10 attempts', { attempts }, 'Practice')
            }
          }
          
          // Save hand for entire scenario
          setCurrentScenarioHand(newHand)
          setScenarioInProgress(true)
          logger.debug('New scenario hand saved', { hand: newHand.notation }, 'Practice')
        }
        
        setRandomHand({
          currentHand: newHand,
          showHand: true
        })
        
        // Start timer for this question
        setQuestionStartTime(new Date())
        
        // Load available actions from linked range
        loadAvailableActions(currentNode)
        
        // Update range display
        setRangeDisplay(prev => ({
          ...prev,
          currentRange: currentNode.linkedRange?.hands || null,
          highlightedHand: newHand.notation
        }))
        
        setAnimation(prev => ({
          ...prev,
          activePosition: currentNode.position,
          waitingForHero: true,
          isPlaying: false
        }))
        return
      }

      // Play action automatically for villains
      playNodeAction(nextStep, currentNode)

    }, 500) // 0.5 secondes par action vilain

    return () => clearTimeout(timer)
  }, [animation.isPlaying, animation.currentStep, nodes])

  const playNodeAction = (stepIndex: number, node: BaseNode) => {
    const nodeId = node.id

    // Calculate new pot according to action and actual sizing
    let potIncrease = 0
    if (node.action === 'open') {
      potIncrease = node.sizing || 2 // Utiliser le sizing du node ou 2bb par défaut
    }
    else if (node.action === '3bet') {
      potIncrease = node.sizing || 9 // Utiliser le sizing du node ou 9bb par défaut
    }
    else if (node.action === '4bet') {
      potIncrease = node.sizing || 20 // Utiliser le sizing du node ou 20bb par défaut
    }
    else if (node.action === 'call') {
      // Pour call, trouver la dernière mise active
      const playedNodes = nodes.slice(0, stepIndex + 1)
      const lastRaiser = playedNodes
        .filter(n => ['open', '3bet', '4bet', 'raise'].includes(n.action || ''))
        .pop()
      potIncrease = lastRaiser?.sizing || 1 // Call la dernière mise ou BB par défaut
    }
    else if (node.action === 'limp') {
      potIncrease = 1 // Limp = 1bb
    }
    else if (node.action === 'raise') {
      potIncrease = node.sizing || 3 // Utiliser le sizing du node ou 3bb par défaut
    }
    // fold adds nothing to pot

    logger.debug('Node action played', {
      position: node.position,
      action: node.action,
      sizing: node.sizing || 'default',
      potIncrease
    }, 'Practice')

    setAnimation(prev => {
      const newPot = prev.currentPot + potIncrease
      logger.debug('Pot updated', {
        previousPot: prev.currentPot.toFixed(1),
        increase: potIncrease,
        newPot: newPot.toFixed(1)
      }, 'Practice')
      return {
        ...prev,
        currentStep: stepIndex,
        currentPot: newPot,
        playedActions: new Set([...prev.playedActions, nodeId]),
        activePosition: node.position
      }
    })

    // After 1 second, move to next
    setTimeout(() => {
      setAnimation(prev => ({
        ...prev,
        activePosition: null
      }))
    }, 1000)
  }

  const startAnimation = () => {
    setAnimation({
      isPlaying: true,
      currentStep: -1,
      currentPot: 1.5, // Reset du pot aux blinds
      playedActions: new Set(),
      activePosition: null,
      waitingForHero: false
    })
    logger.debug('Animation started, pot reset to blinds', { pot: 1.5 }, 'Practice')
  }

  const stopAnimation = () => {
    setAnimation(prev => ({
      ...prev,
      isPlaying: false,
      activePosition: null,
      waitingForHero: false
    }))
  }

  // Function to check if we should go to next hand
  const checkIfShouldStartNewHand = (heroStepIndex: number) => {
    // After hero decision, check following positions
    const remainingNodes = nodes.slice(heroStepIndex + 1)
    
    // If no more positions after hero OR all following positions folded
    return remainingNodes.length === 0 || remainingNodes.every(node => 
      node.action === 'fold' || !node.action
    )
  }

  // Function to start a new hand
  const startNewHand = () => {
    setAnimation({
      isPlaying: true,
      currentStep: -1,
      currentPot: 1.5, // Reset du pot aux blinds
      playedActions: new Set(),
      activePosition: null,
      waitingForHero: false
    })
    setRandomHand({
      currentHand: null,
      showHand: false
    })
    setRangeDisplay(prev => ({
      ...prev,
      currentRange: null,
      highlightedHand: null
    }))
    
    // Reset scenario
    setCurrentScenarioHand(null)
    setScenarioInProgress(false)
    logger.debug('New scenario started, pot reset to blinds', { pot: 1.5 }, 'Practice')
  }

  const resetAnimation = () => {
    startNewHand()
  }

  // Function to load available actions from a range
  const loadAvailableActions = async (node: BaseNode) => {
    try {
      if (node.linkedRange?.id) {
        const fullRange = await TreeService.getById(node.linkedRange.id)
        const editorData = fullRange?.data?.editorData
        
        // Save range data for mixed colors validation
        setCurrentNodeRangeData(fullRange?.data || null)
        
        if (editorData?.actions && Array.isArray(editorData.actions)) {
          const actionNames = editorData.actions.map((action: any) => action.name)
          // Always include 'fold' as first option
          setAvailableActions(['fold', ...actionNames.filter((name: string) => name.toLowerCase() !== 'fold')])
        } else {
          // Default actions if no editor_data or actions
          setAvailableActions(['fold', 'call', 'raise'])
        }
      } else {
        // Default actions if no linked range
        setCurrentNodeRangeData(null)
        setAvailableActions(['fold', 'call', 'raise'])
      }
    } catch (error) {
      logger.error('Error loading available actions', { error }, 'Practice')
      // Default actions in case of error
      setCurrentNodeRangeData(null)
      setAvailableActions(['fold', 'call', 'raise'])
    }
  }

  // Record a played hand
  const recordHandPlayed = async (action: string, currentNode: BaseNode, isCorrect: boolean) => {
    if (!currentSessionId || !randomHand.currentHand || !questionStartTime) return
    
    try {
      const responseTime = Date.now() - questionStartTime.getTime()
      const correctAction = currentNode.linkedRange && randomHand.currentHand 
        ? (isHandInRange(randomHand.currentHand, currentNode.linkedRange.hands) 
           ? (currentNode.action || 'fold') 
           : 'fold')
        : (currentNode.action || 'fold')
      
      // Convertir les cartes en format string
      const card1 = `${randomHand.currentHand.card1.rank}${randomHand.currentHand.card1.suit === '♠' ? 's' : 
                                                         randomHand.currentHand.card1.suit === '♥' ? 'h' : 
                                                         randomHand.currentHand.card1.suit === '♦' ? 'd' : 'c'}`
      const card2 = `${randomHand.currentHand.card2.rank}${randomHand.currentHand.card2.suit === '♠' ? 's' : 
                                                         randomHand.currentHand.card2.suit === '♥' ? 'h' : 
                                                         randomHand.currentHand.card2.suit === '♦' ? 'd' : 'c'}`
      
      await SessionService.recordSessionHand(currentSessionId, {
        hand: randomHand.currentHand.notation,
        card1: card1,
        card2: card2,
        position: currentNode.position || null,
        playerAction: action,
        correctAction: correctAction,
        isCorrect,
        responseTime,
        questionContext: {
          nodeId: currentNode.id,
          pot: animation.currentPot,
          rangeId: currentNode.linkedRange?.id,
          rangeName: currentNode.linkedRange?.name,
          scenarioStep: animation.currentStep
        }
      })
      
      // Mettre à jour la session avec les nouvelles stats
      const newStats = {
        ...stats,
        totalHands: stats.totalHands + 1,
        correctAnswers: stats.correctAnswers + (isCorrect ? 1 : 0),
        incorrectAnswers: stats.incorrectAnswers + (isCorrect ? 0 : 1)
      }
      
      const accuracy = newStats.totalHands > 0 ? Math.round((newStats.correctAnswers / newStats.totalHands) * 100) : 0
      
      await SessionService.updateSession(currentSessionId, {
        totalQuestions: newStats.totalHands,
        correctAnswers: newStats.correctAnswers,
        incorrectAnswers: newStats.incorrectAnswers,
        accuracy,
        streak: bestStreak
      })
      
    } catch (error) {
      logger.error('Error recording hand played', { error }, 'Practice')
    }
  }

  const playHeroAction = (action: string) => {
    if (!animation.waitingForHero || !randomHand.currentHand) return

    const currentNode = nodes[animation.currentStep + 1]
    
    // Nouvelle logique pour scénarios complexes
    let isCorrect = false
    let shouldContinueScenario = true
    
    if (firstHeroAction && randomHand.currentHand) {
      // Logique complexe : vérifier la première action Hero SEULEMENT pour la première action
      const isFirstHeroAction = currentNode.id === firstHeroAction.node.id
      
      if (isFirstHeroAction) {
        // C'est la première action Hero : vérifier si la main est dans la première range
        const isInFirstRange = firstHeroAction.range.includes(randomHand.currentHand.notation)
        
        if (!isInFirstRange) {
          // Main pas dans la première range → arrêt du scénario, nouvelle main
          logger.debug('Hand not in first range, immediate scenario stop', {}, 'Practice')
          shouldContinueScenario = false
          isCorrect = false // On compte comme erreur pour les stats
        } else {
          logger.debug('Valid hand for first action, scenario continues', {}, 'Practice')
          // Main valide, validation avec mixed colors
          isCorrect = validateActionWithMixedColors(action, randomHand.currentHand, currentNode, currentNodeRangeData)
        }
      } else {
        // Actions Hero suivantes : validation avec mixed colors
        isCorrect = validateActionWithMixedColors(action, randomHand.currentHand, currentNode, currentNodeRangeData)
      }
    } else {
      // Logique classique pour scénarios simples avec mixed colors
      isCorrect = validateActionWithMixedColors(action, randomHand.currentHand, currentNode, currentNodeRangeData)
    }
    
    // Ajouter à l'historique local
    if (randomHand.currentHand) {
      const historyEntry: HandHistory = {
        id: `hand-${Date.now()}`,
        hand: randomHand.currentHand.notation,
        position: currentNode.position || 'Unknown',
        playerAction: action,
        correctAction: currentNode.linkedRange && randomHand.currentHand 
          ? (isHandInRange(randomHand.currentHand, currentNode.linkedRange.hands) 
             ? (currentNode.action || 'fold') 
             : 'fold')
          : (currentNode.action || 'fold'),
        isCorrect,
        timestamp: Date.now()
      }
      
      setHandHistory(prev => [historyEntry, ...prev].slice(0, 20)) // Garder les 20 dernières mains
    }
    
    // Enregistrer la main jouée
    if (currentSessionId) {
      recordHandPlayed(action, currentNode, isCorrect)
    }
    
    // Mettre à jour les stats selon la réponse
    if (isCorrect) {
      handleCorrectAnswer()
    } else {
      handleIncorrectAnswer()
    }

    // Ne plus cacher la main - elle doit rester visible pendant tout le scénario
    // setRandomHand({
    //   currentHand: null,
    //   showHand: false
    // })
    
    // Masquer le highlight de la range
    setRangeDisplay(prev => ({
      ...prev,
      highlightedHand: null
    }))

    // Gestion de la suite selon la logique complexe
    if (!shouldContinueScenario) {
      // Arrêt immédiat du scénario, nouvelle main
      logger.debug('Scenario stopped, generating new hand', {}, 'Practice')
      if (autoNext) {
        startNewHand()
      } else {
        setAnimation(prev => ({
          ...prev,
          waitingForHero: false,
          isPlaying: false
        }))
      }
    } else {
      // Continuer selon la logique normale
      const shouldStartNewHand = checkIfShouldStartNewHand(animation.currentStep + 1)
      
      if (shouldStartNewHand) {
        if (autoNext) {
          // Passer automatiquement à la main suivante
          startNewHand()
        } else {
          // Attendre que l'utilisateur clique sur "Main suivante"
          setAnimation(prev => ({
            ...prev,
            waitingForHero: false,
            isPlaying: false
          }))
        }
      } else {
        // Continuer l'animation
        playNodeAction(animation.currentStep + 1, currentNode)
        setAnimation(prev => ({
          ...prev,
          waitingForHero: false,
          isPlaying: true
        }))
      }
    }
  }

  const loadScenario = async (id: string) => {
    try {
      setLoading(true)
      const scenarioData = await ScenarioService.loadScenario(id)
      
      if (scenarioData) {
        setNodes(scenarioData.graph_data.nodes)
        setScenarioName(scenarioData.name)
        setTableFormat(scenarioData.graph_data.tableFormat || '6max')
        
        // Analyser le scénario pour la logique complexe
        await analyzeScenario(scenarioData.graph_data.nodes)
      } else {
        setError('Scénario non trouvé')
      }
    } catch (err) {
      setError('Erreur lors du chargement du scénario')
      logger.error('Error loading scenario', { error: err }, 'Practice')
    } finally {
      setLoading(false)
    }
  }

  // Fonctions pour mettre à jour les stats
  const handleCorrectAnswer = () => {
    setStats(prev => {
      const newCorrectStreak = prev.correctAnswers + 1 - prev.incorrectAnswers
      const newBestStreak = Math.max(bestStreak, newCorrectStreak)
      setBestStreak(newBestStreak)
      
      return {
        ...prev,
        correctAnswers: prev.correctAnswers + 1,
        totalHands: prev.totalHands + 1
      }
    })
  }

  const handleIncorrectAnswer = () => {
    setStats(prev => ({
      ...prev,
      incorrectAnswers: prev.incorrectAnswers + 1,
      totalHands: prev.totalHands + 1
    }))
  }

  // Finaliser la session
  const saveSession = async () => {
    if (!sessionStartTime || !currentSessionId || stats.totalHands === 0) return

    try {
      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - sessionStartTime.getTime()) / (1000 * 60)) // en minutes
      const accuracy = Math.round((stats.correctAnswers / stats.totalHands) * 100)

      // Finaliser la session existante
      await SessionService.updateSession(currentSessionId, {
        endTime,
        duration,
        totalQuestions: stats.totalHands,
        correctAnswers: stats.correctAnswers,
        incorrectAnswers: stats.incorrectAnswers,
        accuracy,
        streak: bestStreak
      })

      logger.info('Session finalized successfully', {}, 'Practice')
    } catch (error) {
      logger.error('Error finalizing session', { error }, 'Practice')
    }
  }

  // Créer la session en DB quand le scénario est chargé
  useEffect(() => {
    const createSession = async () => {
      if (scenarioName && scenarioId && !sessionStartTime) {
        const sessionStart = new Date()
        setSessionStartTime(sessionStart)
        
        try {
          const session = await SessionService.createSession({
            type: 'scenario',
            scenarioId: scenarioId,
            scenarioName: scenarioName,
            startTime: sessionStart,
            endTime: sessionStart, // Sera mis à jour à la fin
            duration: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            accuracy: 0,
            streak: 0
          })
          
          setCurrentSessionId(session.id)
        } catch (error) {
          logger.error('Error creating session', { error }, 'Practice')
        }
      }
    }
    
    createSession()
  }, [scenarioName, scenarioId, sessionStartTime])

  // Sauvegarder la session quand l'utilisateur quitte la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStartTime && stats.totalHands > 0) {
        saveSession()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Sauvegarder aussi au démontage du composant
      if (sessionStartTime && stats.totalHands > 0) {
        saveSession()
      }
    }
  }, [sessionStartTime, stats.totalHands])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="w-[600px]">
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">⏳</div>
            <p>Chargement du scénario...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="w-[600px]">
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const toggleRangeDisplay = () => {
    setRangeDisplay(prev => ({
      ...prev,
      isVisible: !prev.isVisible
    }))
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Panel de stats à gauche - masqué en mobile */}
      <div className="hidden lg:block">
        <StatsPanel 
          stats={stats} 
          autoNext={autoNext}
          setAutoNext={setAutoNext}
          onNextHand={startNewHand}
          showNextButton={!animation.isPlaying && !animation.waitingForHero}
        />
      </div>
      
      {/* Zone principale avec la table */}
      <div className="flex-1 flex flex-col">
        {/* Header compact */}
        <header className="bg-background border-b border-border px-2 lg:px-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm lg:text-lg font-bold text-foreground">{scenarioName}</h1>
              <p className="text-xs text-muted-foreground hidden lg:block">{tableFormat.toUpperCase()} • Practice</p>
            </div>
            
            {/* Stats mobiles compactes */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="text-xs">
                <span className="text-green-600 font-bold">{stats.correctAnswers}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-red-600 font-bold">{stats.incorrectAnswers}</span>
              </div>
              <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-6" onClick={startNewHand}>
                Next
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                await saveSession()
                setStats({ totalHands: 0, correctAnswers: 0, incorrectAnswers: 0 })
                setBestStreak(0)
                setHandHistory([])
                setSessionStartTime(new Date())
              }}
              className="text-xs px-2 py-1 h-7 hidden lg:block"
            >
              Reset Stats
            </Button>
          </div>
        </header>

        {/* Zone principale - Table de poker */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 lg:p-4 space-y-2 lg:space-y-6">
          
          <div className="poker-table-container relative">
              {/* Table principale - responsive */}
              <div className="poker-table w-[90vw] h-[40vh] lg:w-[700px] lg:h-[350px] bg-green-800 dark:bg-green-900 border-green-700 dark:border-green-800 border-2 lg:border-4 rounded-full shadow-2xl">
              
              {/* Pot au centre - responsive */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className={`bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-500 dark:border-yellow-600 rounded-lg px-2 py-1 lg:px-4 lg:py-2 shadow-lg transition-all duration-300 ${
                  animation.isPlaying ? 'scale-110' : ''
                }`}>
                  <div className="text-center">
                    <div className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Pot</div>
                    <div className="text-sm lg:text-lg font-bold text-yellow-800 dark:text-yellow-200">
                      {animation.currentPot.toFixed(1)}bb
                    </div>
                  </div>
                </div>
              </div>

              {/* Bouton dealer sur la table */}
              <div className="absolute top-[70px] right-[20%] transform -translate-x-4 -translate-y-4">
                <div className="w-6 h-6 bg-white dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-100 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100">D</span>
                </div>
              </div>

              {/* Small Blind sur la table */}
              <div className="absolute right-[20px] top-1/2 transform -translate-x-6 translate-y-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">0.5</span>
                </div>
              </div>

              {/* Big Blind sur la table */}
              <div className="absolute bottom-[70px] right-[20%] transform -translate-x-4 translate-y-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
                  <span className="text-[10px] font-medium text-red-600 dark:text-red-400">1</span>
                </div>
              </div>

              <div className="players relative w-full h-full">
                {/* UTG - En bas à gauche */}
                <PlayerPosition 
                  node={nodes.find(n => n.position === 'UTG')}
                  className="bottom-[calc(70px/-2)] left-[20%]"
                  isActive={animation.activePosition === 'UTG'}
                  hasPlayedAction={animation.playedActions.has(nodes.find(n => n.position === 'UTG')?.id || '')}
                  showActionAnimation={animation.activePosition === 'UTG'}
                  heroHand={currentScenarioHand || randomHand.currentHand}
                />

                {/* HJ - Côté gauche */}
                <PlayerPosition 
                  node={nodes.find(n => n.position === 'HJ')}
                  className="left-[calc(70px/-2)] top-1/2 -translate-y-1/2"
                  isActive={animation.activePosition === 'HJ'}
                  hasPlayedAction={animation.playedActions.has(nodes.find(n => n.position === 'HJ')?.id || '')}
                  showActionAnimation={animation.activePosition === 'HJ'}
                  heroHand={currentScenarioHand || randomHand.currentHand}
                />

                {/* CO - En haut à gauche */}
                <PlayerPosition 
                  node={nodes.find(n => n.position === 'CO')}
                  className="top-[calc(70px/-2)] left-[20%]"
                  isActive={animation.activePosition === 'CO'}
                  hasPlayedAction={animation.playedActions.has(nodes.find(n => n.position === 'CO')?.id || '')}
                  showActionAnimation={animation.activePosition === 'CO'}
                  heroHand={currentScenarioHand || randomHand.currentHand}
                />

                {/* BTN - En haut à droite */}
                <PlayerPosition 
                  node={nodes.find(n => n.position === 'BTN')}
                  className="top-[calc(70px/-2)] right-[20%]"
                  isActive={animation.activePosition === 'BTN'}
                  hasPlayedAction={animation.playedActions.has(nodes.find(n => n.position === 'BTN')?.id || '')}
                  showActionAnimation={animation.activePosition === 'BTN'}
                  heroHand={currentScenarioHand || randomHand.currentHand}
                />

                {/* SB - Côté droit */}
                <PlayerPosition 
                  node={nodes.find(n => n.position === 'SB')}
                  className="right-[calc(70px/-2)] top-1/2 -translate-y-1/2"
                  isActive={animation.activePosition === 'SB'}
                  hasPlayedAction={animation.playedActions.has(nodes.find(n => n.position === 'SB')?.id || '')}
                  showActionAnimation={animation.activePosition === 'SB'}
                  heroHand={currentScenarioHand || randomHand.currentHand}
                />

                {/* BB - En bas à droite */}
                <PlayerPosition 
                  node={nodes.find(n => n.position === 'BB')}
                  className="bottom-[calc(70px/-2)] right-[20%]"
                  isActive={animation.activePosition === 'BB'}
                  hasPlayedAction={animation.playedActions.has(nodes.find(n => n.position === 'BB')?.id || '')}
                  showActionAnimation={animation.activePosition === 'BB'}
                  heroHand={currentScenarioHand || randomHand.currentHand}
                />
              </div>
            </div>
          </div>
          {/* Contrôles d'animation - responsive */}
        <div className="bg-background border-t border-border px-2 lg:px-4 py-2 lg:py-3">
          {animation.waitingForHero ? (
            // Contrôles pour Hero
            <div className="text-center space-y-2 lg:space-y-3">
              <div className="text-xs lg:text-sm font-semibold text-primary">
                🎯 C'est à vous de jouer !
              </div>
              <div className="flex justify-center space-x-2 lg:space-x-3 flex-wrap gap-2 lg:gap-3">
                {availableActions.map(action => (
                  <Button 
                    key={action}
                    onClick={() => playHeroAction(action)} 
                    variant={action === 'fold' ? 'destructive' : 'default'}
                    size="sm"
                    className={`min-w-16 lg:min-w-24 h-8 lg:h-12 text-xs lg:text-base font-bold px-3 lg:px-6 ${
                      action === 'fold' 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : action === 'call'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            // Informations de progression
            <div className="text-center">
              <div className="text-xs text-muted-foreground">
                Étape {animation.currentStep + 1} / {nodes.length}
              </div>
              {animation.isPlaying && (
                <div className="text-xs text-primary">
                  Animation en cours...
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        
      </div>

      {/* Panel de range à droite - masqué en mobile */}
      <aside className="hidden lg:block w-[320px] border-l border-border p-3 space-y-3 bg-background">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🎯 Range Viewer</CardTitle>
          </CardHeader>
          <CardContent>
            <RangeDisplay
              range={rangeDisplay.currentRange}
              highlightedHand={rangeDisplay.highlightedHand}
              isVisible={rangeDisplay.isVisible}
              onToggle={toggleRangeDisplay}
            />
          </CardContent>
        </Card>

        {/* Historique des mains */}
        <HandHistoryPanel history={handHistory} />
      </aside>
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Chargement...</div>}>
      <PracticeContent />
    </Suspense>
  )
}