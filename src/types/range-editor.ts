// Re-export types from the new modular structure
export type { EditorAction as Action, MixedColor, HandAction, RangeEditorData } from './editor'
export type { PokerHand } from './poker'
export { POKER_HANDS, DEFAULT_POKER_ACTIONS } from './poker'

// Legacy compatibility exports
export const DEFAULT_ACTION = {
  id: 'default',
  type: 'custom' as const,
  name: 'Default',
  color: '#22c55e',
  isActive: true
}

export const FOLD_ACTION = {
  id: 'fold',
  type: 'fold' as const,
  name: 'Fold',
  color: '#ef4444',
  isActive: false
}