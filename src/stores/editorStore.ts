'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { TreeItem } from '@/types/range'
import { RangeEditorData, Action, MixedColor, HandAction, DEFAULT_ACTION } from '@/types/range-editor'
import { TreeService } from '@/lib/services/tree-service'

interface EditorState {
  // Tree navigation state
  currentTree: TreeItem | null
  selectedNode: TreeItem | null
  editMode: boolean
  pendingRangeSelection: TreeItem | null
  
  // Editor data state
  title: string
  actions: Action[]
  mixedColors: MixedColor[]
  handActions: HandAction[]
  activeActionId: string
  activeMixedColorId: string | null
  
  // History management
  history: RangeEditorData[]
  historyIndex: number
  maxHistorySize: number
  
  // Sync and save state
  hasUnsavedChanges: boolean
  isSaving: boolean
  saveSuccess: boolean
  autoSaveEnabled: boolean
  
  // Loading state
  isLoading: boolean
  error: string | null
}

interface EditorActions {
  // Tree navigation
  setCurrentTree: (tree: TreeItem | null) => void
  setSelectedNode: (node: TreeItem | null) => void
  setEditMode: (mode: boolean) => void
  setPendingRangeSelection: (selection: TreeItem | null) => void
  
  // Editor data actions
  setTitle: (title: string) => void
  setActions: (actions: Action[]) => void
  setMixedColors: (colors: MixedColor[]) => void
  setHandActions: (handActions: HandAction[]) => void
  setActiveActionId: (id: string) => void
  setActiveMixedColorId: (id: string | null) => void
  
  // Hand selection actions
  toggleHand: (handId: string) => void
  selectMultipleHands: (handIds: string[]) => void
  clearAllHands: () => void
  
  // History management
  saveToHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void
  
  // Data management
  loadRange: (range: TreeItem) => void
  saveRange: () => Promise<void>
  resetEditor: () => void
  
  // Utility actions
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  markAsUnsaved: () => void
  markAsSaved: () => void
}

type EditorStore = EditorState & EditorActions

const initialState: EditorState = {
  currentTree: null,
  selectedNode: null,
  editMode: false,
  pendingRangeSelection: null,
  
  title: 'Nouvelle Range',
  actions: [DEFAULT_ACTION],
  mixedColors: [],
  handActions: [],
  activeActionId: DEFAULT_ACTION.id,
  activeMixedColorId: null,
  
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  
  hasUnsavedChanges: false,
  isSaving: false,
  saveSuccess: false,
  autoSaveEnabled: true,
  
  isLoading: false,
  error: null,
}

export const useEditorStore = create<EditorStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Tree navigation
      setCurrentTree: (tree) => set({ currentTree: tree }),
      setSelectedNode: (node) => set({ selectedNode: node }),
      setEditMode: (mode) => set({ editMode: mode }),
      setPendingRangeSelection: (selection) => set({ pendingRangeSelection: selection }),
      
      // Editor data actions
      setTitle: (title) => {
        set({ title })
        get().markAsUnsaved()
      },
      
      setActions: (actions) => {
        set({ actions })
        get().markAsUnsaved()
      },
      
      setMixedColors: (mixedColors) => {
        set({ mixedColors })
        get().markAsUnsaved()
      },
      
      setHandActions: (handActions) => {
        set({ handActions })
        get().markAsUnsaved()
      },
      
      setActiveActionId: (activeActionId) => set({ activeActionId }),
      setActiveMixedColorId: (activeMixedColorId) => set({ activeMixedColorId }),
      
      // Hand selection actions
      toggleHand: (handId) => {
        const { handActions, activeActionId, activeMixedColorId } = get()
        const existingAction = handActions.find(ha => ha.handId === handId)
        
        let newHandActions: HandAction[]
        
        if (activeMixedColorId) {
          if (existingAction?.mixedColorId === activeMixedColorId) {
            newHandActions = handActions.filter(ha => ha.handId !== handId)
          } else {
            const filtered = handActions.filter(ha => ha.handId !== handId)
            newHandActions = [...filtered, { handId, mixedColorId: activeMixedColorId }]
          }
        } else {
          if (existingAction?.actionId === activeActionId) {
            newHandActions = handActions.filter(ha => ha.handId !== handId)
          } else {
            const filtered = handActions.filter(ha => ha.handId !== handId)
            newHandActions = [...filtered, { handId, actionId: activeActionId }]
          }
        }
        
        set({ handActions: newHandActions })
        get().markAsUnsaved()
      },
      
      selectMultipleHands: (handIds) => {
        const { handActions, activeActionId, activeMixedColorId } = get()
        
        // Check if all hands are already selected with current action/color
        const allAlreadySelected = handIds.every(handId => {
          const existing = handActions.find(ha => ha.handId === handId)
          if (activeMixedColorId) {
            return existing?.mixedColorId === activeMixedColorId
          } else {
            return existing?.actionId === activeActionId
          }
        })
        
        let newHandActions: HandAction[]
        
        if (allAlreadySelected) {
          // Deselect all hands
          newHandActions = handActions.filter(ha => !handIds.includes(ha.handId))
        } else {
          // Select all hands
          const filtered = handActions.filter(ha => !handIds.includes(ha.handId))
          const newActions = handIds.map(handId => ({
            handId,
            ...(activeMixedColorId ? { mixedColorId: activeMixedColorId } : { actionId: activeActionId })
          }))
          newHandActions = [...filtered, ...newActions]
        }
        
        set({ handActions: newHandActions })
        get().markAsUnsaved()
      },
      
      clearAllHands: () => {
        set({ handActions: [] })
        get().markAsUnsaved()
      },
      
      // History management
      saveToHistory: () => {
        const { title, actions, mixedColors, handActions, history, historyIndex, maxHistorySize } = get()
        const currentData: RangeEditorData = { title, actions, mixedColors, handActions }
        
        // Remove any history after current index (for when we're not at the end)
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(currentData)
        
        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift()
        }
        
        set({
          history: newHistory,
          historyIndex: newHistory.length - 1
        })
      },
      
      undo: () => {
        const { history, historyIndex } = get()
        if (historyIndex > 0) {
          const previousData = history[historyIndex - 1]
          set({
            ...previousData,
            historyIndex: historyIndex - 1
          })
        }
      },
      
      redo: () => {
        const { history, historyIndex } = get()
        if (historyIndex < history.length - 1) {
          const nextData = history[historyIndex + 1]
          set({
            ...nextData,
            historyIndex: historyIndex + 1
          })
        }
      },
      
      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,
      
      clearHistory: () => set({ history: [], historyIndex: -1 }),
      
      // Data management
      loadRange: (range) => {
        if (range.type !== 'range') return
        
        console.log('🔍 EditorStore loading range:', {
          name: range.name,
          hasData: !!range.data,
          hasEditorData: !!range.data?.editorData,
          editorDataKeys: range.data?.editorData ? Object.keys(range.data.editorData) : [],
          hasHands: !!range.data?.hands,
          handsCount: range.data?.hands?.length || 0
        })
        
        const editorData = range.data?.editorData
        
        // Prioriser editorData s'il existe et contient des données complètes
        const hasCompleteEditorData = editorData && (
          // Priorité 1: Actions ET HandActions présents (données riches)
          (editorData.handActions?.length > 0 && editorData.actions?.length > 0) ||
          // Priorité 2: MixedColors présents (même si pas de handActions)
          (editorData.mixedColors?.length > 0 && editorData.actions?.length > 0) ||
          // Priorité 3: Au moins un titre personnalisé (pas juste le nom de la range)
          (editorData.title && editorData.title !== range.name) ||
          // Fallback: Si on a au moins des actions définies
          (editorData.actions?.length > 0)
        )
        
        if (hasCompleteEditorData) {
          console.log('📊 Loading complete editorData:', {
            title: editorData.title,
            actionsCount: editorData.actions?.length || 0,
            mixedColorsCount: editorData.mixedColors?.length || 0,
            handActionsCount: editorData.handActions?.length || 0
          })
          
          set({
            title: editorData.title || range.name,
            actions: editorData.actions?.length > 0 ? (editorData.actions as Action[]) : [DEFAULT_ACTION],
            mixedColors: editorData.mixedColors || [],
            handActions: editorData.handActions || [],
            hasUnsavedChanges: false,
            selectedNode: range
          })
        } else {
          // Fallback sur les mains simples (legacy ou data.hands)
          console.log('📊 Loading legacy hands format')
          
          const legacyHands = range.data?.hands || []
          const legacyHandActions: HandAction[] = legacyHands.map(hand => ({
            handId: hand,
            actionId: DEFAULT_ACTION.id
          }))
          
          set({
            title: range.name,
            actions: [DEFAULT_ACTION],
            mixedColors: [],
            handActions: legacyHandActions,
            hasUnsavedChanges: false,
            selectedNode: range
          })
        }
        
        // Clear history when loading new range
        get().clearHistory()
        get().saveToHistory()
      },
      
      saveRange: async () => {
        const { selectedNode, title, actions, mixedColors, handActions } = get()
        
        if (!selectedNode || selectedNode.type !== 'range') return
        
        set({ isSaving: true, saveSuccess: false, error: null })
        
        try {
          const data: RangeEditorData = { title, handActions, actions, mixedColors }
          const selectedHands = handActions.map(ha => ha.handId)
          
          const updatePayload = {
            name: title,
            type: 'range' as const,
            data: {
              hands: selectedHands,
              editorData: data
            }
          }
          
          await TreeService.update(selectedNode.id, updatePayload)
          
          set({
            hasUnsavedChanges: false,
            saveSuccess: true,
            isSaving: false
          })
          
          // Reset success state after 2 seconds
          setTimeout(() => set({ saveSuccess: false }), 2000)
          
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Erreur de sauvegarde',
            isSaving: false
          })
          throw error
        }
      },
      
      resetEditor: () => {
        set({
          ...initialState,
          currentTree: get().currentTree, // Keep tree context
        })
      },
      
      // Utility actions
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),
      markAsUnsaved: () => set({ hasUnsavedChanges: true }),
      markAsSaved: () => set({ hasUnsavedChanges: false }),
    }),
    {
      name: 'editor-store',
    }
  )
)

// Selectors for common state combinations
export const useEditorData = () => {
  const store = useEditorStore()
  return {
    title: store.title,
    actions: store.actions,
    mixedColors: store.mixedColors,
    handActions: store.handActions,
  }
}

export const useEditorState = () => {
  const store = useEditorStore()
  return {
    hasUnsavedChanges: store.hasUnsavedChanges,
    isSaving: store.isSaving,
    saveSuccess: store.saveSuccess,
    isLoading: store.isLoading,
    error: store.error,
  }
}

export const useEditorHistory = () => {
  const store = useEditorStore()
  return {
    canUndo: store.canUndo(),
    canRedo: store.canRedo(),
    undo: store.undo,
    redo: store.redo,
  }
}