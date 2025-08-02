import { z } from 'zod'
import { ALL_POKER_HANDS } from '@/types/poker'

// Base schemas for poker types
export const pokerHandSchema = z.enum(ALL_POKER_HANDS as [string, ...string[]])

export const pokerPositionSchema = z.enum([
  'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'
])

export const pokerActionTypeSchema = z.enum([
  'fold', 'call', 'raise', 'all-in', 'check', 'bet', 'custom'
])

// Color validation (hex colors)
export const colorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
  message: "Must be a valid hex color (e.g., #FF0000 or #F00)"
})

// Editor action schema
export const editorActionSchema = z.object({
  id: z.string().min(1, "Action ID cannot be empty"),
  type: pokerActionTypeSchema,
  name: z.string().max(50, "Action name too long"),
  color: colorSchema,
  sizing: z.number().min(0).max(1000).optional(),
  description: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  frequency: z.number().min(0).max(100).optional(),
})

// Mixed color schema
export const mixedColorSchema = z.object({
  id: z.string().min(1, "Mixed color ID cannot be empty"),
  name: z.string().max(50).optional(),
  actions: z.array(z.object({
    actionId: z.string().min(1, "Action ID cannot be empty"),
    percentage: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
  })).min(1, "At least one action required").max(4, "Maximum 4 actions allowed"),
  isActive: z.boolean().optional(),
}).refine((data) => {
  // Validate that percentages add up to 100
  const total = data.actions.reduce((sum, action) => sum + action.percentage, 0)
  return Math.abs(total - 100) < 0.01 // Allow for small floating point errors
}, {
  message: "Action percentages must add up to 100%",
  path: ["actions"]
})

// Hand action schema
export const handActionSchema = z.object({
  handId: pokerHandSchema,
  actionId: z.string().optional(),
  mixedColorId: z.string().optional(),
  percentage: z.number().min(0).max(100).optional(),
}).refine((data) => {
  // Either actionId or mixedColorId must be provided, but not both
  return (data.actionId && !data.mixedColorId) || (!data.actionId && data.mixedColorId)
}, {
  message: "Either actionId or mixedColorId must be provided, but not both",
  path: ["actionId"]
})

// Range editor data schema
export const rangeEditorDataSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").max(100, "Title too long"),
  handActions: z.array(handActionSchema).max(169, "Maximum 169 hand actions (13x13 grid)"),
  actions: z.array(editorActionSchema).min(1, "At least one action required").max(20, "Maximum 20 actions allowed"),
  mixedColors: z.array(mixedColorSchema).max(10, "Maximum 10 mixed colors allowed"),
  description: z.string().max(500).optional(),
  position: pokerPositionSchema.optional(),
  scenario: z.string().max(100).optional(),
}).refine((data) => {
  // Validate that all handActions reference existing actions or mixedColors
  const actionIds = new Set(data.actions.map(a => a.id))
  const mixedColorIds = new Set(data.mixedColors.map(mc => mc.id))
  
  for (const handAction of data.handActions) {
    if (handAction.actionId && !actionIds.has(handAction.actionId)) {
      return false
    }
    if (handAction.mixedColorId && !mixedColorIds.has(handAction.mixedColorId)) {
      return false
    }
  }
  
  return true
}, {
  message: "All hand actions must reference existing actions or mixed colors",
  path: ["handActions"]
}).refine((data) => {
  // Validate that all mixedColor actions reference existing actions
  const actionIds = new Set(data.actions.map(a => a.id))
  
  for (const mixedColor of data.mixedColors) {
    for (const action of mixedColor.actions) {
      if (!actionIds.has(action.actionId)) {
        return false
      }
    }
  }
  
  return true
}, {
  message: "All mixed color actions must reference existing actions",
  path: ["mixedColors"]
})

// Tree node schemas
export const baseTreeNodeSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
  name: z.string().min(1, "Name cannot be empty").max(100, "Name too long"),
  parentId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  level: z.number().int().min(0).optional(),
})

export const folderNodeSchema = baseTreeNodeSchema.extend({
  type: z.literal('folder'),
  isExpanded: z.boolean().optional(),
  data: z.object({
    description: z.string().max(500).optional(),
    color: colorSchema.optional(),
  }).optional(),
})

export const rangeNodeSchema = baseTreeNodeSchema.extend({
  type: z.literal('range'),
  data: z.object({
    hands: z.array(pokerHandSchema).max(169),
    editorData: rangeEditorDataSchema.optional(),
    notes: z.string().max(1000).optional(),
    position: pokerPositionSchema.optional(),
  }).optional(),
})

export const playerNodeSchema = baseTreeNodeSchema.extend({
  type: z.literal('player'),
  position: pokerPositionSchema,
  data: z.object({
    description: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
  }).optional(),
})

export const actionNodeSchema = baseTreeNodeSchema.extend({
  type: z.literal('action'),
  actionType: z.enum(['preflop', 'flop', 'turn', 'river']),
  data: z.object({
    board: z.string().max(10).optional(), // e.g., "AhKsQd"
    description: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
  }).optional(),
})

export const treeNodeSchema = z.discriminatedUnion('type', [
  folderNodeSchema,
  rangeNodeSchema,
  playerNodeSchema,
  actionNodeSchema,
])

// Import/Export schemas
export const exportOptionsSchema = z.object({
  format: z.enum(['json', 'csv', 'pio', 'text', 'image']),
  includeStats: z.boolean().default(true),
  includeNotes: z.boolean().default(true),
  compression: z.boolean().optional(),
})

export const importResultSchema = z.object({
  success: z.boolean(),
  data: rangeEditorDataSchema.optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
})

// Editor preferences schema
export const editorPreferencesSchema = z.object({
  defaultAction: editorActionSchema,
  showPercentages: z.boolean().default(true),
  showCombinations: z.boolean().default(false),
  autoSave: z.boolean().default(true),
  autoSaveInterval: z.number().int().min(1000).max(60000).default(5000),
  gridSize: z.number().int().min(8).max(20).default(13),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  shortcuts: z.record(z.string().min(1), z.string().min(1)),
})

// Canvas render options schema
export const canvasRenderOptionsSchema = z.object({
  cellSize: z.number().int().min(10).max(100).default(40),
  padding: z.number().int().min(0).max(10).default(2),
  fontSize: z.number().int().min(6).max(24).default(12),
  showBorders: z.boolean().default(true),
  antialiasing: z.boolean().default(true),
  devicePixelRatio: z.number().min(0.5).max(4).default(1),
})

// Performance metrics schema
export const performanceMetricsSchema = z.object({
  renderTime: z.number().min(0),
  updateTime: z.number().min(0),
  saveTime: z.number().min(0),
  loadTime: z.number().min(0),
  memoryUsage: z.number().min(0).optional(),
})

// Type exports
export type EditorActionValidated = z.infer<typeof editorActionSchema>
export type MixedColorValidated = z.infer<typeof mixedColorSchema>
export type HandActionValidated = z.infer<typeof handActionSchema>
export type RangeEditorDataValidated = z.infer<typeof rangeEditorDataSchema>
export type TreeNodeValidated = z.infer<typeof treeNodeSchema>
export type EditorPreferencesValidated = z.infer<typeof editorPreferencesSchema>
export type ExportOptionsValidated = z.infer<typeof exportOptionsSchema>
export type ImportResultValidated = z.infer<typeof importResultSchema>
export type CanvasRenderOptionsValidated = z.infer<typeof canvasRenderOptionsSchema>
export type PerformanceMetricsValidated = z.infer<typeof performanceMetricsSchema>

// Validation error type
export interface ValidationError {
  path: string
  message: string
  code: string
}

// Helper function to format Zod errors
export function formatZodError(error: z.ZodError): ValidationError[] {
  return error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code
  }))
}

// Validation result type
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors: ValidationError[]
}

// Generic validation function
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data)
    return {
      success: true,
      data: validatedData,
      errors: []
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: formatZodError(error)
      }
    }
    return {
      success: false,
      errors: [{
        path: 'unknown',
        message: 'Unknown validation error',
        code: 'unknown'
      }]
    }
  }
}

// Specific validation functions
export const validateRangeEditorData = (data: unknown) => 
  validateData(rangeEditorDataSchema, data)

export const validateTreeNode = (data: unknown) => 
  validateData(treeNodeSchema, data)

export const validateEditorAction = (data: unknown) => 
  validateData(editorActionSchema, data)

export const validateMixedColor = (data: unknown) => 
  validateData(mixedColorSchema, data)

export const validateHandAction = (data: unknown) => 
  validateData(handActionSchema, data)

export const validateEditorPreferences = (data: unknown) => 
  validateData(editorPreferencesSchema, data)

export const validateExportOptions = (data: unknown) => 
  validateData(exportOptionsSchema, data)

export const validateCanvasRenderOptions = (data: unknown) => 
  validateData(canvasRenderOptionsSchema, data)