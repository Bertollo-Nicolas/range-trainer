'use client'

import { useState, useRef } from 'react'
import { POKER_HANDS, Action, MixedColor, HandAction, FOLD_ACTION } from '@/types/range-editor'
import { cn } from '@/lib/utils'

interface RangeTableProps {
  handActions?: HandAction[]
  actions: Action[]
  mixedColors: MixedColor[]
  onHandClick: (handId: string) => void
  onDragSelect: (handIds: string[]) => void
}

export function RangeTable({ 
  handActions, 
  actions, 
  mixedColors, 
  onHandClick, 
  onDragSelect 
}: RangeTableProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedHands, setDraggedHands] = useState<Set<string>>(new Set())
  const [mouseDownHand, setMouseDownHand] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const getHandStyle = (handId: string) => {
    const handAction = handActions?.find(ha => ha.handId === handId)
    
    if (!handAction) {
      return {
        backgroundColor: FOLD_ACTION.color,
        color: 'white'
      }
    }

    if (handAction.mixedColorId) {
      const mixedColor = mixedColors.find(mc => mc.id === handAction.mixedColorId)
      if (mixedColor && mixedColor.actions.length >= 2) {
        const action1 = actions.find(a => a.id === mixedColor.actions[0].actionId)
        const action2 = actions.find(a => a.id === mixedColor.actions[1].actionId)
        const percentage1 = mixedColor.actions[0].percentage
        
        if (action1 && action2) {
          return {
            background: `linear-gradient(90deg, ${action1.color} ${percentage1}%, ${action2.color} ${percentage1}%)`,
            color: 'white'
          }
        }
      } else if (mixedColor && mixedColor.actions.length === 1) {
        const action = actions.find(a => a.id === mixedColor.actions[0].actionId)
        const percentage = mixedColor.actions[0].percentage
        if (action) {
          return {
            background: `linear-gradient(90deg, ${action.color} ${percentage}%, ${FOLD_ACTION.color} ${percentage}%)`,
            color: 'white'
          }
        }
      }
    }

    if (handAction.actionId) {
      const action = actions.find(a => a.id === handAction.actionId)
      if (action) {
        return {
          backgroundColor: action.color,
          color: 'white'
        }
      }
    }

    return {
      backgroundColor: FOLD_ACTION.color,
      color: '#666666'
    }
  }

  const handleMouseDown = (handId: string, event: React.MouseEvent) => {
    event.preventDefault()
    
    // Marquer quelle main a été pressée - PAS de handleHandClick ici
    setMouseDownHand(handId)
  }

  const handleMouseEnter = (handId: string) => {
    // Démarrer le drag seulement si on a une main pressée ET qu'on entre sur une main différente
    if (mouseDownHand && mouseDownHand !== handId && !isDragging) {
      setIsDragging(true)
      setDraggedHands(new Set([mouseDownHand, handId]))
    } else if (isDragging) {
      setDraggedHands(prev => new Set([...prev, handId]))
    }
  }

  const handleMouseUp = () => {
    if (isDragging && draggedHands.size > 1) {
      // VRAI DRAG : utiliser seulement handleDragSelect
      onDragSelect(Array.from(draggedHands))
    } else if (mouseDownHand && !isDragging) {
      // CLIC SIMPLE : utiliser seulement handleHandClick
      onHandClick(mouseDownHand)
    }
    
    // Reset de tous les états
    setIsDragging(false)
    setDraggedHands(new Set())
    setMouseDownHand(null)
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp()
    }
  }

  return (
    <div 
      ref={tableRef}
      className="select-none h-full flex items-center justify-center p-4"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="grid grid-cols-13"
        style={{ 
          gap: '0px',
          width: 'min(calc(100vh - 200px), calc(100vw - 400px))',
          height: 'min(calc(100vh - 200px), calc(100vw - 400px))'
        }}
      >
        {POKER_HANDS.map((row, rowIndex) => 
          row.map((hand, colIndex) => {
            const style = getHandStyle(hand)
            const isDraggedHand = draggedHands.has(hand)
            
            const handAction = handActions?.find(ha => ha.handId === hand)
            const action = handAction?.actionId ? actions.find(a => a.id === handAction.actionId) : null
            const mixedColor = handAction?.mixedColorId ? mixedColors.find(mc => mc.id === handAction.mixedColorId) : null
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cn(
                  "aspect-square border-1 border-neutral-950",
                  "flex flex-col items-center justify-center text-xs font-medium",
                  "cursor-pointer transition-all duration-150",
                  "hover:scale-105 hover:shadow-md",
                  isDraggedHand && "ring-2 ring-primary ring-offset-1"
                )}
                style={style}
                onMouseDown={(e) => handleMouseDown(hand, e)}
                onMouseEnter={() => handleMouseEnter(hand)}
                title={`${hand}${action ? ` - ${action.name}` : ''}${mixedColor ? ` - Mixed` : ''}`}
              >
                <div className="text-xs font-bold">{hand}</div>
                {/* Pas d'indicateurs visuels - juste la couleur de fond et le tooltip */}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}