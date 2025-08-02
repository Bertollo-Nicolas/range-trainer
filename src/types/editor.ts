import { PokerHand, PokerAction, PokerPosition } from './poker'

// Editor-specific action types (extends poker actions)
export interface EditorAction extends PokerAction {
  isActive?: boolean
  frequency?: number // For mixed strategies (0-100%)
}

// Mixed color represents a combination of actions with frequencies
export interface MixedColor {
  id: string
  name?: string
  actions: Array<{
    actionId: string
    percentage: number
  }>
  isActive?: boolean
}

// Hand action represents which action/color is assigned to a specific hand
export interface HandAction {
  handId: PokerHand
  actionId?: string
  mixedColorId?: string
  percentage?: number // For mixed strategies
}

// Complete editor data structure
export interface RangeEditorData {
  title: string
  handActions: HandAction[]
  actions: EditorAction[]
  mixedColors: MixedColor[]
  description?: string
  position?: PokerPosition
  scenario?: string
}

// Tree node types using discriminated unions
interface BaseTreeNode {
  id: string
  name: string
  parentId: string | null
  createdAt: Date
  updatedAt: Date
  children?: TreeNode[]
  level?: number
}

export interface PlayerNode extends BaseTreeNode {
  type: 'player'
  position: PokerPosition
  data?: {
    description?: string
    notes?: string
  }
}

export interface ActionNode extends BaseTreeNode {
  type: 'action'
  actionType: 'preflop' | 'flop' | 'turn' | 'river'
  data?: {
    board?: string
    description?: string
    notes?: string
  }
}

export interface FolderNode extends BaseTreeNode {
  type: 'folder'
  isExpanded?: boolean
  data?: {
    description?: string
    color?: string
  }
}

export interface RangeNode extends BaseTreeNode {
  type: 'range'
  data?: {
    hands: PokerHand[]
    editorData?: RangeEditorData
    notes?: string
    position?: PokerPosition
  }
}

// Discriminated union for all tree node types
export type TreeNode = PlayerNode | ActionNode | FolderNode | RangeNode

// Editor context for managing complex tree structures
export interface EditorContext {
  currentPath: TreeNode[]
  breadcrumbs: Array<{
    node: TreeNode
    label: string
  }>
  rootNode: TreeNode | null
}

// Navigation state for tree traversal
export interface NavigationState {
  selectedNode: TreeNode | null
  expandedNodes: Set<string>
  searchQuery: string
  filteredNodes: TreeNode[]
}

// Editor modes
export type EditorMode = 'view' | 'edit' | 'build' | 'analyze'

// Selection modes for hands
export type SelectionMode = 'single' | 'drag' | 'rectangle' | 'lasso'

// Editor preferences
export interface EditorPreferences {
  defaultAction: EditorAction
  showPercentages: boolean
  showCombinations: boolean
  autoSave: boolean
  autoSaveInterval: number // milliseconds
  gridSize: number
  theme: 'light' | 'dark' | 'system'
  shortcuts: Record<string, string>
}

// Default editor preferences
export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  defaultAction: {
    id: 'default',
    type: 'custom',
    name: '',
    color: '#22c55e', // green-500
    isActive: true
  },
  showPercentages: true,
  showCombinations: false,
  autoSave: true,
  autoSaveInterval: 5000, // 5 seconds
  gridSize: 13,
  theme: 'system',
  shortcuts: {
    'save': 'Cmd+S',
    'undo': 'Cmd+Z',
    'redo': 'Cmd+Shift+Z',
    'clear': 'Cmd+Delete',
    'selectAll': 'Cmd+A',
    'copy': 'Cmd+C',
    'paste': 'Cmd+V',
  }
}

// Validation schemas (to be used with Zod later)
export interface ValidationError {
  path: string
  message: string
  code: string
}

export interface EditorValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

// Performance tracking
export interface PerformanceMetrics {
  renderTime: number
  updateTime: number
  saveTime: number
  loadTime: number
  memoryUsage?: number
}

// Export/Import formats
export type ExportFormat = 'json' | 'csv' | 'pio' | 'text' | 'image'

export interface ExportOptions {
  format: ExportFormat
  includeStats: boolean
  includeNotes: boolean
  compression?: boolean
}

export interface ImportResult {
  success: boolean
  data?: RangeEditorData
  errors: string[]
  warnings: string[]
}

// Canvas rendering options for RangeMatrix optimization
export interface CanvasRenderOptions {
  cellSize: number
  padding: number
  fontSize: number
  showBorders: boolean
  antialiasing: boolean
  devicePixelRatio: number
}

// Touch/gesture support for mobile
export interface GestureState {
  isGesturing: boolean
  gestureType: 'pan' | 'pinch' | 'tap' | 'longPress'
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  scale: number
}

// Accessibility options
export interface AccessibilityOptions {
  highContrast: boolean
  reducedMotion: boolean
  screenReaderEnabled: boolean
  keyboardNavigation: boolean
  focusIndicators: boolean
}