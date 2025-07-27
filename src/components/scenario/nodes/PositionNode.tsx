'use client'

import { useState, useEffect } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Crown, Clock, CheckCircle, Circle, Link, RotateCcw } from 'lucide-react'
import { type PokerAction, type PokerPosition, type NodeState } from '@/types/scenario'
import { TreeItem as TreeItemType } from '@/types/range'
import { SimpleRangeLinkingModal } from '../SimpleRangeLinkingModal'

interface PositionNodeData {
  position: PokerPosition
  state: NodeState
  isHero: boolean
  linkedRange?: string | null
  sizing?: number | null
  stackSize?: number | null // Stack spécifique à ce node
  scenarioStackSize?: number // Stack par défaut du scénario
  availableActions: PokerAction[]
  currentAction?: PokerAction | null // Action actuellement sélectionnée
  onChange?: (action: PokerAction, sizing?: number) => void
  onConvertToHero?: () => void
  onConvertToVilain?: () => void
  onLinkRange?: (range: TreeItemType) => void
  onModifyAction?: () => void // Nouveau: modifier l'action
  onStackSizeChange?: (stackSize: number | null) => void // Changer le stack de ce node
}

/**
 * Position Node - v3 Implementation
 * Represents a poker position (UTG, HJ, CO, BTN, SB, BB)
 * According to trainer-scenario-v3.md specifications
 */
function PositionNode({ data, selected }: NodeProps<PositionNodeData>) {
  const { 
    position, 
    state, 
    isHero, 
    linkedRange,
    sizing,
    stackSize,
    scenarioStackSize, 
    availableActions,
    currentAction,
    onChange, 
    onConvertToHero, 
    onConvertToVilain,
    onLinkRange,
    onModifyAction,
    onStackSizeChange
  } = data

  const [showRangeLinkModal, setShowRangeLinkModal] = useState(false)
  const [selectedAction, setSelectedAction] = useState<PokerAction | null>(currentAction || null)
  const [localSizing, setLocalSizing] = useState<string>(sizing?.toString() || '')

  // Synchroniser selectedAction avec currentAction quand elle change
  useEffect(() => {
    setSelectedAction(currentAction || null)
  }, [currentAction])

  // Synchroniser localSizing avec sizing
  useEffect(() => {
    setLocalSizing(sizing?.toString() || '')
  }, [sizing])

  const handleActionChange = (newAction: PokerAction) => {
    setSelectedAction(newAction)
    // Préserver le sizing existant si l'action nécessite un sizing
    if (['open', '3bet', '4bet', 'raise'].includes(newAction)) {
      onChange?.(newAction, sizing || undefined)
    } else {
      onChange?.(newAction)
    }
  }

  const handleRangeSelect = (range: TreeItemType) => {
    onLinkRange?.(range)
    setShowRangeLinkModal(false)
  }


  const isActive = state === 'Actif'
  const isWaiting = state === 'En attente'
  const isCompleted = !isActive && !isWaiting

  // Fonction pour obtenir l'icône de statut
  const getStatusIcon = () => {
    if (state === 'Fold') {
      return <Circle className="h-4 w-4 text-gray-500" />
    } else if (isActive) {
      return <Circle className="h-4 w-4 text-green-500" />
    } else if (isCompleted) {
      return <CheckCircle className="h-4 w-4 text-blue-500" />
    } else {
      return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Fonction pour obtenir la couleur de la bordure
  const getBorderColor = () => {
    if (state === 'Fold') {
      return 'border-gray-400 bg-gray-100 dark:bg-gray-800 opacity-60'
    } else if (isActive) {
      return isHero 
        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' 
        : 'border-green-500 bg-green-50 dark:bg-green-950'
    } else if (isCompleted) {
      return isHero 
        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950' 
        : 'border-blue-500 bg-blue-50 dark:bg-blue-950'
    } else {
      return isHero 
        ? 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/50 opacity-80'
        : 'border-muted bg-muted/10 opacity-80'
    }
  }

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = () => {
    let variant: "default" | "secondary" | "outline" | "destructive" = "outline"
    let className = "text-xs"
    
    if (state === 'Fold') {
      variant = "secondary"
      className = "text-xs bg-gray-500 text-white"
    } else if (isActive) {
      variant = "default"
    } else if (isCompleted) {
      variant = "secondary"
    }
    
    return (
      <Badge variant={variant} className={className}>
        {state}
      </Badge>
    )
  }

  return (
    <>
      <Handle type="target" position={Position.Left} />
      
      <Card className={`w-[240px] border-2 ${getBorderColor()} transition-all duration-200 ${
        selected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-center flex items-center justify-between">
            <div className="flex items-center gap-1">
              {isHero ? (
                <Crown className="h-4 w-4 text-primary" />
              ) : (
                <Users className="h-4 w-4 text-muted-foreground" />
              )}
              {isHero ? 'HERO' : 'VILAIN'} ({position})
            </div>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              {getStatusBadge()}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Informations de l'état actuel */}
          <div className="text-center text-xs text-muted-foreground leading-tight">
            {isHero ? 'Position d\'entraînement' : 'Position adverse'}
            <div className="flex items-center justify-center space-x-2 mt-1">
              {sizing && (
                <span className="text-xs text-gray-500">Sizing: {sizing}bb</span>
              )}
              <span className="text-xs text-blue-600 font-medium">
                Stack: {stackSize || scenarioStackSize || 100}bb
              </span>
            </div>
          </div>

          {/* Actions disponibles */}
          {availableActions.length > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
              <div className="flex items-center gap-1 mb-1">
                Actions disponibles:
              </div>
              <div className="flex flex-wrap gap-1">
                {availableActions.map(action => (
                  <Badge key={action} variant="outline" className="text-xs">
                    {action}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Sélection d'action */}
          <div>
            <Label htmlFor={`action-${position}`} className="text-xs">Action</Label>
            <Select 
              value={selectedAction || ""} 
              onValueChange={handleActionChange}
              disabled={!isActive || availableActions.length === 0}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={
                  isActive ? "Choisir action" : 
                  isWaiting ? "En attente..." : 
                  `État: ${state}`
                } />
              </SelectTrigger>
              <SelectContent>
                {availableActions.map((action) => (
                  <SelectItem key={action} value={action} className="text-xs">
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Sizing - COPIÉ COLLÉ DES STACKS */}
          <div>
            <Label htmlFor={`sizing-${position}`} className="text-xs">Sizing (bb)</Label>
            <Input
              id={`sizing-${position}`}
              value={localSizing}
              onChange={(e) => {
                const value = e.target.value
                setLocalSizing(value)
                
                if (value === '') {
                  // Si on efface, on trouve une action qui nécessite un sizing
                  const actionToUse = availableActions.find(action => 
                    ['open', '3bet', '4bet', 'raise'].includes(action)
                  )
                  if (actionToUse) {
                    onChange?.(actionToUse, undefined)
                  }
                } else {
                  const sizingValue = parseFloat(value)
                  if (!isNaN(sizingValue)) {
                    const actionToUse = selectedAction || availableActions.find(action => 
                      ['open', '3bet', '4bet', 'raise'].includes(action)
                    )
                    if (actionToUse) {
                      onChange?.(actionToUse, sizingValue)
                    }
                  }
                }
              }}
              placeholder="2, 2.5, 3..."
              className="h-8 text-xs"
              type="text"
            />
          </div>

          {/* Configuration du stack individuel */}
          {onStackSizeChange && (
            <div className="space-y-1">
              <Label htmlFor={`stack-${position}`} className="text-xs">Stack individuel (bb)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id={`stack-${position}`}
                  value={stackSize || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    onStackSizeChange(value ? parseInt(value) || null : null)
                  }}
                  placeholder={`${scenarioStackSize || 100}`}
                  className="h-7 text-xs flex-1"
                  type="number"
                  min="10"
                  max="500"
                />
                {stackSize && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => onStackSizeChange(null)}
                    title="Utiliser le stack par défaut"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Vide = utilise le stack du scénario ({scenarioStackSize || 100}bb)
              </p>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="space-y-2">
            {/* Bouton modifier action (si action déjà choisie) */}
            {isCompleted && (
              <Button 
                size="sm" 
                variant="outline"
                className="w-full cursor-pointer text-xs"
                onClick={onModifyAction}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Modifier action
              </Button>
            )}
            
            {isHero ? (
              <>
                {/* Hero: Lier range + Convertir en Vilain */}
                <Button 
                  size="sm" 
                  variant={linkedRange ? "default" : "outline"}
                  className="w-full cursor-pointer text-xs"
                  onClick={() => setShowRangeLinkModal(true)}
                >
                  <Link className="h-3 w-3 mr-1" />
                  {linkedRange ? "Range liée" : "Lier une range"}
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full cursor-pointer text-xs"
                  onClick={onConvertToVilain}
                >
                  <Users className="h-3 w-3 mr-1" />
                  Convertir en Vilain
                </Button>
              </>
            ) : (
              <>
                {/* Vilain: Convertir en Hero */}
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full cursor-pointer text-xs"
                  onClick={onConvertToHero}
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Convertir en HERO
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Handle type="source" position={Position.Right} />

      {/* Range Linking Modal */}
      <SimpleRangeLinkingModal
        open={showRangeLinkModal}
        onOpenChange={setShowRangeLinkModal}
        onSelectRange={handleRangeSelect}
      />
    </>
  )
}

export default PositionNode