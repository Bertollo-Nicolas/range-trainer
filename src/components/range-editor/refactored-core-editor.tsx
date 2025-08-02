'use client'

import { useEffect, forwardRef, useImperativeHandle } from 'react'
import { Save, RotateCcw, Undo, Redo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RangeMatrixCanvas } from './range-matrix-canvas'
import { ActionPanel } from './action-panel'
import { UnsavedChangesDialog } from './unsaved-changes-dialog'
import { useEditorStore, useEditorData, useEditorState, useEditorHistory } from '@/stores/editorStore'
import { useAutoSave } from '@/hooks/useAutoSave'
import { TreeItem } from '@/types/range'
import { cn } from '@/lib/utils'

interface RefactoredCoreEditorProps {
  selectedRange?: TreeItem
  pendingRangeSelection?: TreeItem | null
  onRangeUpdated?: () => void
  onRangeSelectionConfirmed?: (range: TreeItem) => void
  onRangeSelectionCancelled?: () => void
  className?: string
}

export interface RefactoredCoreEditorRef {
  save: () => Promise<void>
  undo: () => void
  redo: () => void
}

export const RefactoredCoreEditor = forwardRef<RefactoredCoreEditorRef, RefactoredCoreEditorProps>(
  function RefactoredCoreEditor({
    selectedRange,
    pendingRangeSelection,
    onRangeUpdated,
    onRangeSelectionConfirmed,
    onRangeSelectionCancelled,
    className
  }, ref) {
    // Store hooks
    const {
      loadRange,
      saveRange,
      resetEditor,
      setTitle,
      toggleHand,
      selectMultipleHands,
      clearAllHands,
      setPendingRangeSelection,
      undo,
      redo,
      saveToHistory
    } = useEditorStore()

    const { title, actions, mixedColors, handActions } = useEditorData()
    const { hasUnsavedChanges, isSaving, saveSuccess, error } = useEditorState()
    const { canUndo, canRedo } = useEditorHistory()

    // Auto-save hook
    const autoSave = useAutoSave({
      data: { title, actions, mixedColors, handActions },
      onSave: async (data) => {
        await saveRange()
      },
      enabled: true,
      interval: 5000,
      onSuccess: () => {
        onRangeUpdated?.()
      },
      onError: (error) => {
        console.error('Auto-save failed:', error)
      }
    })

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      save: async () => {
        await saveRange()
        onRangeUpdated?.()
      },
      undo,
      redo,
    }), [saveRange, onRangeUpdated, undo, redo])

    // Load range when selectedRange changes
    useEffect(() => {
      if (selectedRange) {
        loadRange(selectedRange)
      }
    }, [selectedRange, loadRange])

    // Handle pending range selection
    useEffect(() => {
      setPendingRangeSelection(pendingRangeSelection)
    }, [pendingRangeSelection, setPendingRangeSelection])

    // Save to history when making changes
    useEffect(() => {
      if (hasUnsavedChanges) {
        const timer = setTimeout(() => {
          saveToHistory()
        }, 1000) // Save to history after 1 second of no changes
        
        return () => clearTimeout(timer)
      }
    }, [hasUnsavedChanges, saveToHistory])

    const handleSave = async () => {
      try {
        await saveRange()
        onRangeUpdated?.()
      } catch (error) {
        console.error('Save failed:', error)
      }
    }

    const handleClear = () => {
      clearAllHands()
      setTitle(selectedRange?.name || 'Nouvelle Range')
    }

    const handleUnsavedDialogSave = async () => {
      await handleSave()
      if (pendingRangeSelection) {
        onRangeSelectionConfirmed?.(pendingRangeSelection)
      }
    }

    const handleUnsavedDialogDiscard = () => {
      if (pendingRangeSelection) {
        onRangeSelectionConfirmed?.(pendingRangeSelection)
      }
    }

    const handleUnsavedDialogCancel = () => {
      onRangeSelectionCancelled?.()
    }

    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la range"
              className="flex-1"
            />
            
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <Button
                onClick={undo}
                disabled={!canUndo}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <Undo className="h-3 w-3" />
              </Button>
              
              <Button
                onClick={redo}
                disabled={!canRedo}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <Redo className="h-3 w-3" />
              </Button>
              
              <Button
                onClick={handleClear}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Clear
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                className={cn(
                  "gap-2 transition-all duration-200 relative",
                  saveSuccess && "bg-green-600 hover:bg-green-700",
                  hasUnsavedChanges && !isSaving && !saveSuccess && "bg-orange-600 hover:bg-orange-700"
                )}
              >
                {isSaving ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : saveSuccess ? (
                  <div className="h-3 w-3 rounded-full bg-background flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
                  </div>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    {hasUnsavedChanges && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </>
                )}
                {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : hasUnsavedChanges ? 'Save*' : 'Save'}
              </Button>
            </div>
          </div>
          
          {/* Auto-save status */}
          {autoSave.isEnabled && (
            <div className="mt-2 text-xs text-muted-foreground">
              {autoSave.statusText}
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className="mt-2 text-xs text-destructive">
              Error: {error}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Range Matrix (60%) */}
          <div className="w-[60%] p-4 overflow-auto flex items-center justify-center">
            <RangeMatrixCanvas
              handActions={handActions}
              actions={actions}
              mixedColors={mixedColors}
              onHandClick={toggleHand}
              onDragSelect={selectMultipleHands}
              width={520}
              height={520}
            />
          </div>

          {/* Action Panel (40%) */}
          <div className="w-[40%] border-l bg-muted/20 p-4 overflow-auto">
            <ActionPanel
              actions={actions}
              mixedColors={mixedColors}
              activeActionId={useEditorStore.getState().activeActionId}
              activeMixedColorId={useEditorStore.getState().activeMixedColorId}
              onActionsChange={useEditorStore.getState().setActions}
              onMixedColorsChange={useEditorStore.getState().setMixedColors}
              onActiveActionChange={useEditorStore.getState().setActiveActionId}
              onActiveMixedColorChange={useEditorStore.getState().setActiveMixedColorId}
            />
          </div>
        </div>

        {/* Unsaved Changes Dialog */}
        <UnsavedChangesDialog
          open={!!pendingRangeSelection && hasUnsavedChanges}
          onOpenChange={() => {}} // Controlled by store
          onSave={handleUnsavedDialogSave}
          onDiscard={handleUnsavedDialogDiscard}
          onCancel={handleUnsavedDialogCancel}
        />
      </div>
    )
  }
)

// Additional utility components for better composition

export const EditorHeader = ({
  title,
  onTitleChange,
  onSave,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isSaving,
  saveSuccess,
  hasUnsavedChanges,
  autoSaveStatus
}: {
  title: string
  onTitleChange: (title: string) => void
  onSave: () => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  isSaving: boolean
  saveSuccess: boolean
  hasUnsavedChanges: boolean
  autoSaveStatus?: string
}) => (
  <div className="p-4 border-b bg-background">
    <div className="flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Titre de la range"
        className="flex-1"
      />
      
      <div className="flex items-center gap-1">
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          variant="outline"
          size="sm"
        >
          <Undo className="h-3 w-3" />
        </Button>
        
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          variant="outline"
          size="sm"
        >
          <Redo className="h-3 w-3" />
        </Button>
        
        <Button
          onClick={onClear}
          variant="outline"
          size="sm"
        >
          <RotateCcw className="h-3 w-3" />
          Clear
        </Button>
        
        <Button
          onClick={onSave}
          disabled={isSaving}
          size="sm"
          className={cn(
            "gap-2",
            saveSuccess && "bg-green-600 hover:bg-green-700",
            hasUnsavedChanges && !isSaving && !saveSuccess && "bg-orange-600 hover:bg-orange-700"
          )}
        >
          <Save className="h-3 w-3" />
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : hasUnsavedChanges ? 'Save*' : 'Save'}
        </Button>
      </div>
    </div>
    
    {autoSaveStatus && (
      <div className="mt-2 text-xs text-muted-foreground">
        {autoSaveStatus}
      </div>
    )}
  </div>
)

export const EditorLayout = ({ 
  header, 
  matrix, 
  panel, 
  className 
}: { 
  header: React.ReactNode
  matrix: React.ReactNode
  panel: React.ReactNode
  className?: string 
}) => (
  <div className={cn("flex flex-col h-full", className)}>
    {header}
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[60%] p-4 overflow-auto flex items-center justify-center">
        {matrix}
      </div>
      <div className="w-[40%] border-l bg-muted/20 p-4 overflow-auto">
        {panel}
      </div>
    </div>
  </div>
)