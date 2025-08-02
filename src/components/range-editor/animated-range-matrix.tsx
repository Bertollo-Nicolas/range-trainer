'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { POKER_HANDS } from '@/types/poker'
import { HandAction, EditorAction, MixedColor } from '@/types/editor'
import { useRangeCalculation } from '@/hooks/useRangeCalculation'
import { cn } from '@/lib/utils'

interface AnimatedRangeMatrixProps {
  handActions: HandAction[]
  actions: EditorAction[]
  mixedColors: MixedColor[]
  onHandClick: (handId: string) => void
  onDragSelect: (handIds: string[]) => void
  className?: string
  animationDuration?: number
  staggerDelay?: number
  enableHoverEffects?: boolean
  enableClickAnimations?: boolean
}

interface AnimatedCellProps {
  hand: string
  row: number
  col: number
  isSelected: boolean
  color: string | null
  onHandClick: (handId: string) => void
  delay: number
  animationDuration: number
  enableHoverEffects: boolean
  enableClickAnimations: boolean
  isDraggedOver: boolean
}

function AnimatedCell({
  hand,
  row,
  col,
  isSelected,
  color,
  onHandClick,
  delay,
  animationDuration,
  enableHoverEffects,
  enableClickAnimations,
  isDraggedOver
}: AnimatedCellProps) {
  const [isClicked, setIsClicked] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const controls = useAnimation()

  // Handle click animation
  const handleClick = useCallback(async () => {
    if (enableClickAnimations) {
      setIsClicked(true)
      
      // Pulse animation
      await controls.start({
        scale: [1, 1.2, 1],
        transition: { duration: 0.3, ease: "easeOut" }
      })
      
      setIsClicked(false)
    }
    
    onHandClick(hand)
  }, [hand, onHandClick, controls, enableClickAnimations])

  // Selection change animation
  useEffect(() => {
    if (isSelected) {
      controls.start({
        scale: 1.05,
        boxShadow: "0 0 0 2px currentColor",
        transition: { duration: 0.2, ease: "easeOut" }
      })
    } else {
      controls.start({
        scale: 1,
        boxShadow: "0 0 0 0px transparent",
        transition: { duration: 0.2, ease: "easeOut" }
      })
    }
  }, [isSelected, controls])

  const cellVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      rotateY: -180
    },
    visible: {
      opacity: 1,
      scale: 1,
      rotateY: 0,
      transition: {
        duration: animationDuration,
        delay,
        ease: "easeOut"
      }
    },
    hover: enableHoverEffects ? {
      scale: 1.1,
      zIndex: 10,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      transition: { duration: 0.2 }
    } : {},
    tap: enableClickAnimations ? {
      scale: 0.95,
      transition: { duration: 0.1 }
    } : {}
  }

  const backgroundStyle = color ? { backgroundColor: color } : {}

  return (
    <motion.div
      className={cn(
        "relative aspect-square rounded cursor-pointer",
        "flex items-center justify-center text-xs font-medium",
        "select-none border transition-colors",
        isSelected && "ring-2 ring-primary ring-offset-1",
        isDraggedOver && "ring-2 ring-blue-400 ring-offset-1",
        !color && "bg-gray-700 text-gray-400",
        color && "text-white"
      )}
      style={backgroundStyle}
      variants={cellVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      animate={controls}
    >
      <motion.span
        className="relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.3 }}
      >
        {hand}
      </motion.span>

      {/* Hover glow effect */}
      <AnimatePresence>
        {isHovered && enableHoverEffects && (
          <motion.div
            className="absolute inset-0 bg-white rounded pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Click ripple effect */}
      <AnimatePresence>
        {isClicked && enableClickAnimations && (
          <motion.div
            className="absolute inset-0 bg-white rounded-full pointer-events-none"
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Selection indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function AnimatedRangeMatrix({
  handActions,
  actions,
  mixedColors,
  onHandClick,
  onDragSelect,
  className,
  animationDuration = 0.05,
  staggerDelay = 0.01,
  enableHoverEffects = true,
  enableClickAnimations = true
}: AnimatedRangeMatrixProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedHands, setDraggedHands] = useState<Set<string>>(new Set())
  const [mouseDownHand, setMouseDownHand] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { getHandColor, isHandSelected } = useRangeCalculation({
    handActions,
    actions,
    mixedColors
  })

  // Drag selection logic
  const handleMouseDown = useCallback((handId: string, event: React.MouseEvent) => {
    event.preventDefault()
    setMouseDownHand(handId)
  }, [])

  const handleMouseEnter = useCallback((handId: string) => {
    if (mouseDownHand && mouseDownHand !== handId && !isDragging) {
      setIsDragging(true)
      setDraggedHands(new Set([mouseDownHand, handId]))
    } else if (isDragging) {
      setDraggedHands(prev => new Set([...prev, handId]))
    }
  }, [mouseDownHand, isDragging])

  const handleMouseUp = useCallback(() => {
    if (isDragging && draggedHands.size > 1) {
      onDragSelect(Array.from(draggedHands))
    } else if (mouseDownHand && !isDragging) {
      onHandClick(mouseDownHand)
    }

    setIsDragging(false)
    setDraggedHands(new Set())
    setMouseDownHand(null)
  }, [isDragging, draggedHands, mouseDownHand, onDragSelect, onHandClick])

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleMouseUp()
    }
  }, [isDragging, handleMouseUp])

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  }

  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <motion.div
        ref={containerRef}
        className="grid grid-cols-13 gap-2 select-none"
        style={{
          width: 'min(calc(100vh - 200px), calc(100vw - 400px))',
          height: 'min(calc(100vh - 200px), calc(100vw - 400px))'
        }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {POKER_HANDS.map((row, rowIndex) =>
          row.map((hand, colIndex) => {
            const cellIndex = rowIndex * 13 + colIndex
            const delay = cellIndex * staggerDelay
            
            return (
              <AnimatedCell
                key={`${rowIndex}-${colIndex}`}
                hand={hand}
                row={rowIndex}
                col={colIndex}
                isSelected={isHandSelected(hand)}
                color={getHandColor(hand)}
                onHandClick={onHandClick}
                delay={delay}
                animationDuration={animationDuration}
                enableHoverEffects={enableHoverEffects}
                enableClickAnimations={enableClickAnimations}
                isDraggedOver={draggedHands.has(hand)}
              />
            )
          })
        )}
      </motion.div>

      {/* Drag selection overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-blue-500/10" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Higher-order component for adding loading animations
export function withLoadingAnimation<P extends object>(
  Component: React.ComponentType<P>
) {
  return function LoadingAnimatedComponent(props: P & { isLoading?: boolean }) {
    const { isLoading, ...componentProps } = props

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <motion.div
            className="grid grid-cols-13 gap-2"
            style={{
              width: 'min(calc(100vh - 200px), calc(100vw - 400px))',
              height: 'min(calc(100vh - 200px), calc(100vw - 400px))'
            }}
          >
            {Array.from({ length: 169 }, (_, index) => (
              <motion.div
                key={index}
                className="aspect-square bg-gray-200 rounded animate-pulse"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: (index % 13) * 0.1
                }}
              />
            ))}
          </motion.div>
        </div>
      )
    }

    return <Component {...(componentProps as P)} />
  }
}

// Animated version with loading state
export const AnimatedRangeMatrixWithLoading = withLoadingAnimation(AnimatedRangeMatrix)

// Preset animation configurations
export const ANIMATION_PRESETS = {
  fast: {
    animationDuration: 0.03,
    staggerDelay: 0.005,
    enableHoverEffects: true,
    enableClickAnimations: true
  },
  normal: {
    animationDuration: 0.05,
    staggerDelay: 0.01,
    enableHoverEffects: true,
    enableClickAnimations: true
  },
  slow: {
    animationDuration: 0.1,
    staggerDelay: 0.02,
    enableHoverEffects: true,
    enableClickAnimations: true
  },
  minimal: {
    animationDuration: 0.02,
    staggerDelay: 0.001,
    enableHoverEffects: false,
    enableClickAnimations: false
  },
  dramatic: {
    animationDuration: 0.15,
    staggerDelay: 0.05,
    enableHoverEffects: true,
    enableClickAnimations: true
  }
}

// Hook for managing animation preferences
export function useAnimationPreferences() {
  const [preset, setPreset] = useState<keyof typeof ANIMATION_PRESETS>('normal')
  const [customSettings, setCustomSettings] = useState(ANIMATION_PRESETS.normal)
  
  const updatePreset = useCallback((newPreset: keyof typeof ANIMATION_PRESETS) => {
    setPreset(newPreset)
    setCustomSettings(ANIMATION_PRESETS[newPreset])
  }, [])

  const updateCustomSetting = useCallback((
    key: keyof typeof ANIMATION_PRESETS.normal,
    value: any
  ) => {
    setCustomSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  return {
    preset,
    settings: customSettings,
    updatePreset,
    updateCustomSetting,
    availablePresets: Object.keys(ANIMATION_PRESETS) as Array<keyof typeof ANIMATION_PRESETS>
  }
}