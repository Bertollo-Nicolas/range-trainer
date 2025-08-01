'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RangeTable } from './range-table'
import { ActionPanel } from './action-panel'
import { UnsavedChangesDialog } from './unsaved-changes-dialog'
import { RangeEditorData, Action, MixedColor, HandAction, DEFAULT_ACTION } from '@/types/range-editor'
import { TreeItem } from '@/types/range'
import { TreeService } from '@/lib/services/tree-service'
import { cn } from '@/lib/utils'

interface CoreEditorProps {
  selectedRange?: TreeItem
  pendingRangeSelection?: TreeItem | null
  onSave?: (data: RangeEditorData) => void
  onUnsavedChanges?: (hasChanges: boolean) => void
  onRangeUpdated?: () => void
  onRangeSelectionConfirmed?: (range: TreeItem) => void
  onRangeSelectionCancelled?: () => void
  className?: string
}

export interface CoreEditorRef {
  save: () => Promise<void>
}

export const CoreEditor = forwardRef<CoreEditorRef, CoreEditorProps>(function CoreEditor({ selectedRange, pendingRangeSelection, onSave, onUnsavedChanges, onRangeUpdated, onRangeSelectionConfirmed, onRangeSelectionCancelled, className }, ref) {
  const [title, setTitle] = useState(selectedRange?.name || 'Nouvelle Range')
  const [actions, setActions] = useState<Action[]>([DEFAULT_ACTION])
  const [mixedColors, setMixedColors] = useState<MixedColor[]>([])
  const [handActions, setHandActions] = useState<HandAction[]>([])
  const [activeActionId, setActiveActionId] = useState<string>(DEFAULT_ACTION.id)
  const [activeMixedColorId, setActiveMixedColorId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)

  // Afficher la modal quand il y a un pending range selection
  useEffect(() => {
    if (pendingRangeSelection && hasUnsavedChanges) {
      setShowUnsavedDialog(true)
    }
  }, [pendingRangeSelection, hasUnsavedChanges])

  // Exposer la fonction save via ref
  useImperativeHandle(ref, () => ({
    save: handleSave
  }), [])

  // Charger les données de la range sélectionnée
  useEffect(() => {
    if (selectedRange && selectedRange.type === 'range') {
      const editorData = selectedRange.data?.editorData
      
      if (editorData) {
        setTitle(editorData.title)
        setActions(editorData.actions)
        setMixedColors(editorData.mixedColors)
        setHandActions(editorData.handActions)
      } else {
        // Reset to default if no editor data
        setTitle(selectedRange.name)
        setActions([DEFAULT_ACTION])
        setMixedColors([])
        setHandActions([])
      }
      setHasUnsavedChanges(false)
      onUnsavedChanges?.(false)
    }
  }, [selectedRange, onUnsavedChanges])

  // Tracker les changements dans le titre
  useEffect(() => {
    if (selectedRange && selectedRange.type === 'range' && title !== (selectedRange.data?.editorData?.title || selectedRange.name)) {
      setHasUnsavedChanges(true)
      onUnsavedChanges?.(true)
    }
  }, [title, selectedRange, onUnsavedChanges])

  const handleSave = async () => {
    if (!selectedRange || selectedRange.type !== 'range') {
      return
    }
    
    const data: RangeEditorData = {
      title,
      handActions,
      actions,
      mixedColors
    }
    
    
    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      // Extraire les mains sélectionnées pour les sauvegarder dans le format legacy
      const selectedHands = handActions.map(ha => ha.handId)
      
      const updatePayload = {
        name: title,
        data: {
          hands: selectedHands,
          editorData: data
        }
      }
      
      
      // Mettre à jour la range avec les nouvelles données
      await TreeService.update(selectedRange.id, updatePayload)
      
      setHasUnsavedChanges(false)
      onUnsavedChanges?.(false)
      setSaveSuccess(true)
      onSave?.(data)
      onRangeUpdated?.() // Déclencher le refresh de la sidebar
      
      // Reset success state after 2 seconds
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    setHandActions([])
    setTitle(selectedRange?.name || 'Nouvelle Range')
    setActions([DEFAULT_ACTION])
    setMixedColors([])
    setActiveActionId(DEFAULT_ACTION.id)
    setActiveMixedColorId(null)
    setHasUnsavedChanges(true)
    onUnsavedChanges?.(true)
  }

  const handleHandClick = (handId: string) => {
    const existingAction = handActions.find(ha => ha.handId === handId)
    
    if (activeMixedColorId) {
      if (existingAction?.mixedColorId === activeMixedColorId) {
        setHandActions(prev => prev.filter(ha => ha.handId !== handId))
      } else {
        setHandActions(prev => {
          const filtered = prev.filter(ha => ha.handId !== handId)
          return [...filtered, { handId, mixedColorId: activeMixedColorId }]
        })
      }
    } else {
      if (existingAction?.actionId === activeActionId) {
        setHandActions(prev => prev.filter(ha => ha.handId !== handId))
      } else {
        setHandActions(prev => {
          const filtered = prev.filter(ha => ha.handId !== handId)
          return [...filtered, { handId, actionId: activeActionId }]
        })
      }
    }
    
    setHasUnsavedChanges(true)
    onUnsavedChanges?.(true)
  }

  const handleDragSelect = (handIds: string[]) => {
    
    setHandActions(prev => {
      // Vérifier si TOUTES les mains sont déjà sélectionnées avec l'action/couleur active
      const allAlreadySelected = handIds.every(handId => {
        const existing = prev.find(ha => ha.handId === handId)
        if (activeMixedColorId) {
          return existing?.mixedColorId === activeMixedColorId
        } else {
          return existing?.actionId === activeActionId
        }
      })
      
      if (allAlreadySelected) {
        // DÉSÉLECTIONNER toutes les mains
        const result = prev.filter(ha => !handIds.includes(ha.handId))
        return result
      } else {
        // SÉLECTIONNER toutes les mains
        const filtered = prev.filter(ha => !handIds.includes(ha.handId))
        const newHandActions = handIds.map(handId => ({
          handId,
          ...(activeMixedColorId ? { mixedColorId: activeMixedColorId } : { actionId: activeActionId })
        }))
        const result = [...filtered, ...newHandActions]
        return result
      }
    })
    
    setHasUnsavedChanges(true)
    onUnsavedChanges?.(true)
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la range"
            className="flex-1"
          />
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className={cn(
              "gap-2 transition-all duration-200 cursor-pointer relative",
              saveSuccess && "bg-green-600 hover:bg-green-700",
              hasUnsavedChanges && !isSaving && !saveSuccess && "bg-orange-600 hover:bg-orange-700 animate-pulse"
            )}
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : saveSuccess ? (
              <div className="h-4 w-4 rounded-full bg-background flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-green-600" />
              </div>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {hasUnsavedChanges && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                )}
              </>
            )}
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : hasUnsavedChanges ? 'Save*' : 'Save'}
          </Button>
          <Button onClick={handleClear} variant="outline" className="gap-2 cursor-pointer">
            <RotateCcw className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Range Table (60%) */}
        <div className="w-[60%] p-4 overflow-auto">
          <RangeTable
            handActions={handActions}
            actions={actions}
            mixedColors={mixedColors}
            onHandClick={handleHandClick}
            onDragSelect={handleDragSelect}
          />
        </div>

        {/* Column 2: Action Panel (40%) */}
        <div className="w-[40%] border-l bg-muted/20 p-4 overflow-auto">
          <ActionPanel
            actions={actions}
            mixedColors={mixedColors}
            activeActionId={activeActionId}
            activeMixedColorId={activeMixedColorId}
            onActionsChange={setActions}
            onMixedColorsChange={setMixedColors}
            onActiveActionChange={setActiveActionId}
            onActiveMixedColorChange={setActiveMixedColorId}
          />
        </div>
      </div>

      {/* Modal de changements non sauvegardés */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSave={handleSaveAndContinue}
        onDiscard={handleDiscardAndContinue}
        onCancel={handleCancelChange}
      />
    </div>
  )

  // Handlers pour la modal
  function handleSaveAndContinue() {
    handleSave().then(() => {
      setShowUnsavedDialog(false)
      if (pendingRangeSelection) {
        onRangeSelectionConfirmed?.(pendingRangeSelection)
      }
    }).catch(error => {
      console.error('Erreur lors de la sauvegarde:', error)
    })
  }

  function handleDiscardAndContinue() {
    setShowUnsavedDialog(false)
    if (pendingRangeSelection) {
      onRangeSelectionConfirmed?.(pendingRangeSelection)
    }
  }

  function handleCancelChange() {
    setShowUnsavedDialog(false)
    onRangeSelectionCancelled?.()
  }
})