'use client'

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { POKER_HANDS } from '@/types/poker'
import { HandAction, EditorAction, MixedColor, CanvasRenderOptions } from '@/types/editor'
import { useRangeCalculation } from '@/hooks/useRangeCalculation'

interface RangeMatrixCanvasProps {
  handActions: HandAction[]
  actions: EditorAction[]
  mixedColors: MixedColor[]
  onHandClick: (handId: string) => void
  onDragSelect: (handIds: string[]) => void
  width?: number
  height?: number
  className?: string
}

const DEFAULT_RENDER_OPTIONS: CanvasRenderOptions = {
  cellSize: 40,
  padding: 2,
  fontSize: 12,
  showBorders: true,
  antialiasing: true,
  devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
}

export function RangeMatrixCanvas({
  handActions,
  actions,
  mixedColors,
  onHandClick,
  onDragSelect,
  width = 520,
  height = 520,
  className = ''
}: RangeMatrixCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  // Use range calculation hook for performance
  const { getHandColor } = useRangeCalculation({ handActions, actions, mixedColors })

  // Memoize render options
  const renderOptions = useMemo(() => ({
    ...DEFAULT_RENDER_OPTIONS,
    cellSize: Math.floor((Math.min(width, height) - 40) / 13),
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  }), [width, height])

  // Convert screen coordinates to grid position
  const getGridPosition = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    // Scale for device pixel ratio
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const scaledX = x * scaleX
    const scaledY = y * scaleY

    const { cellSize, padding } = renderOptions
    const totalCellSize = cellSize + padding

    const col = Math.floor(scaledX / totalCellSize)
    const row = Math.floor(scaledY / totalCellSize)

    if (row >= 0 && row < 13 && col >= 0 && col < 13) {
      return { row, col }
    }

    return null
  }, [renderOptions])

  // Get hand ID from grid position
  const getHandFromPosition = useCallback((row: number, col: number): string | null => {
    if (row >= 0 && row < 13 && col >= 0 && col < 13) {
      return POKER_HANDS[row][col]
    }
    return null
  }, [])

  // Draw a single cell
  const drawCell = useCallback((
    ctx: CanvasRenderingContext2D,
    hand: string,
    row: number,
    col: number,
    options: CanvasRenderOptions
  ) => {
    const { cellSize, padding, fontSize, showBorders } = options
    const x = col * (cellSize + padding)
    const y = row * (cellSize + padding)

    // Get hand color
    const color = getHandColor(hand) || '#374151' // gray-700 default

    // Fill background
    ctx.fillStyle = color
    ctx.fillRect(x, y, cellSize, cellSize)

    // Draw border if enabled
    if (showBorders) {
      ctx.strokeStyle = '#1f2937' // gray-800
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1)
    }

    // Draw text
    ctx.fillStyle = '#ffffff'
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    const textX = x + cellSize / 2
    const textY = y + cellSize / 2
    ctx.fillText(hand, textX, textY)
  }, [getHandColor])

  // Draw drag selection overlay
  const drawDragSelection = useCallback((
    ctx: CanvasRenderingContext2D,
    options: CanvasRenderOptions
  ) => {
    if (!dragStart || !dragEnd) return

    const { cellSize, padding } = options
    const totalCellSize = cellSize + padding

    const startX = Math.min(dragStart.col, dragEnd.col) * totalCellSize
    const startY = Math.min(dragStart.row, dragEnd.row) * totalCellSize
    const endX = (Math.max(dragStart.col, dragEnd.col) + 1) * totalCellSize - padding
    const endY = (Math.max(dragStart.row, dragEnd.row) + 1) * totalCellSize - padding

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)' // blue-500 with opacity
    ctx.fillRect(startX, startY, endX - startX, endY - startY)

    // Border
    ctx.strokeStyle = '#3b82f6' // blue-500
    ctx.lineWidth = 2
    ctx.strokeRect(startX, startY, endX - startX, endY - startY)
  }, [dragStart, dragEnd])

  // Draw hover effect
  const drawHoverEffect = useCallback((
    ctx: CanvasRenderingContext2D,
    options: CanvasRenderOptions
  ) => {
    if (!hoveredCell) return

    const { cellSize, padding } = options
    const x = hoveredCell.col * (cellSize + padding)
    const y = hoveredCell.row * (cellSize + padding)

    // Glow effect
    ctx.shadowColor = '#3b82f6' // blue-500
    ctx.shadowBlur = 8
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, cellSize, cellSize)
    
    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
  }, [hoveredCell])

  // Main render function
  const renderMatrix = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up high DPI canvas
    const { devicePixelRatio } = renderOptions
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    ctx.scale(devicePixelRatio, devicePixelRatio)

    // Enable antialiasing
    if (renderOptions.antialiasing) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw all cells
    POKER_HANDS.forEach((row, rowIndex) => {
      row.forEach((hand, colIndex) => {
        drawCell(ctx, hand, rowIndex, colIndex, renderOptions)
      })
    })

    // Draw drag selection
    if (isDragging) {
      drawDragSelection(ctx, renderOptions)
    }

    // Draw hover effect
    drawHoverEffect(ctx, renderOptions)
  }, [width, height, renderOptions, isDragging, drawCell, drawDragSelection, drawHoverEffect])

  // Render when dependencies change
  useEffect(() => {
    renderMatrix()
  }, [renderMatrix, handActions, actions, mixedColors])

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const position = getGridPosition(event.clientX, event.clientY)
    if (!position) return

    event.preventDefault()
    setDragStart(position)
    setDragEnd(position)
    setIsDragging(true)
  }, [getGridPosition])

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const position = getGridPosition(event.clientX, event.clientY)
    if (!position) {
      setHoveredCell(null)
      return
    }

    setHoveredCell(position)

    if (isDragging && dragStart) {
      setDragEnd(position)
      renderMatrix() // Re-render for drag selection
    }
  }, [getGridPosition, isDragging, dragStart, renderMatrix])

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (!dragStart) return

    const position = getGridPosition(event.clientX, event.clientY)
    if (!position) return

    if (isDragging && dragEnd) {
      // Multi-select
      const selectedHands: string[] = []
      const minRow = Math.min(dragStart.row, dragEnd.row)
      const maxRow = Math.max(dragStart.row, dragEnd.row)
      const minCol = Math.min(dragStart.col, dragEnd.col)
      const maxCol = Math.max(dragStart.col, dragEnd.col)

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const hand = getHandFromPosition(row, col)
          if (hand) selectedHands.push(hand)
        }
      }

      if (selectedHands.length > 1) {
        onDragSelect(selectedHands)
      } else if (selectedHands.length === 1) {
        onHandClick(selectedHands[0])
      }
    } else {
      // Single click
      const hand = getHandFromPosition(position.row, position.col)
      if (hand) onHandClick(hand)
    }

    // Reset drag state
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [dragStart, dragEnd, isDragging, getGridPosition, getHandFromPosition, onHandClick, onDragSelect])

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null)
    if (isDragging) {
      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
    }
  }, [isDragging])

  // Touch event handlers for mobile support
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      const position = getGridPosition(touch.clientX, touch.clientY)
      if (position) {
        event.preventDefault()
        setDragStart(position)
        setDragEnd(position)
        setIsDragging(true)
      }
    }
  }, [getGridPosition])

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 1 && isDragging && dragStart) {
      const touch = event.touches[0]
      const position = getGridPosition(touch.clientX, touch.clientY)
      if (position) {
        event.preventDefault()
        setDragEnd(position)
        renderMatrix()
      }
    }
  }, [getGridPosition, isDragging, dragStart, renderMatrix])

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault()
    handleMouseUp(event as any) // Reuse mouse up logic
  }, [handleMouseUp])

  return (
    <div className={`inline-block ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width, height }}
        className="cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  )
}

// Performance optimized version with memoization
export const OptimizedRangeMatrixCanvas = React.memo(RangeMatrixCanvas, (prevProps, nextProps) => {
  // Only re-render if handActions, actions, or mixedColors change
  return (
    JSON.stringify(prevProps.handActions) === JSON.stringify(nextProps.handActions) &&
    JSON.stringify(prevProps.actions) === JSON.stringify(nextProps.actions) &&
    JSON.stringify(prevProps.mixedColors) === JSON.stringify(nextProps.mixedColors) &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height
  )
})