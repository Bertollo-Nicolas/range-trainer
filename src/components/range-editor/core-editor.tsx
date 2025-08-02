'use client'

import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RangeTable } from './range-table'
import { ActionPanel } from './action-panel'
import { RangeEditorData, Action, MixedColor, HandAction, DEFAULT_ACTION } from '@/types/range-editor'
import { TreeItem } from '@/types/range'
import { TreeService } from '@/lib/services/tree-service'
import { EditorToaster, useEditorSaveEvent } from './editor-toaster'
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

export const CoreEditor = forwardRef<CoreEditorRef, CoreEditorProps>(function CoreEditor({ selectedRange, pendingRangeSelection, onSave, onUnsavedChanges, onRangeUpdated, onRangeSelectionConfirmed, onRangeSelectionCancelled: _onRangeSelectionCancelled, className }, ref) {
  const [title, setTitle] = useState(selectedRange?.name || 'Nouvelle Range')
  const [actions, setActions] = useState<Action[]>([DEFAULT_ACTION])
  const [mixedColors, setMixedColors] = useState<MixedColor[]>([])
  const [handActions, setHandActions] = useState<HandAction[]>([])
  const [activeActionId, setActiveActionId] = useState<string>(DEFAULT_ACTION.id)
  const [activeMixedColorId, setActiveMixedColorId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-switch vers la nouvelle range sans modal (plus fluide)
  useEffect(() => {
    if (pendingRangeSelection) {
      // Passer directement à la nouvelle range
      onRangeSelectionConfirmed?.(pendingRangeSelection)
    }
  }, [pendingRangeSelection, onRangeSelectionConfirmed])

  // Définir handleSave avec useCallback
  const handleSave = useCallback(async () => {
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
    setError(null)
    
    try {
      // Extraire les mains sélectionnées pour les sauvegarder dans le format legacy
      const selectedHands = handActions.map(ha => ha.handId)
      
      const updatePayload = {
        name: title,
        type: 'range' as const,
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
      console.error('Save error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsSaving(false)
    }
  }, [selectedRange, title, handActions, actions, mixedColors, onUnsavedChanges, onSave, onRangeUpdated])

  // Hook pour écouter les événements de sauvegarde du toaster
  useEditorSaveEvent(handleSave)

  // Exposer la fonction save via ref
  useImperativeHandle(ref, () => ({
    save: handleSave
  }), [handleSave])

  // Charger les données de la range sélectionnée
  useEffect(() => {
    console.log('🔍 CoreEditor loading range:', {
      name: selectedRange?.name,
      type: selectedRange?.type,
      hasData: !!(selectedRange as any)?.data,
      hasEditorData: !!(selectedRange as any)?.data?.editorData,
      hasValidEditorData: (selectedRange as any)?.data?.editorData && (
        (selectedRange as any).data.editorData.handActions?.length > 0 ||
        (selectedRange as any).data.editorData.actions?.length > 0 ||
        (selectedRange as any).data.editorData.title
      ),
      hasHands: !!(selectedRange as any)?.data?.hands,
      handsCount: (selectedRange as any)?.data?.hands?.length || 0
    })
    
    if (selectedRange && selectedRange.type === 'range') {
      const editorData = selectedRange.data?.editorData
      
      // Vérifier si editorData contient des données complètes
      const hasCompleteEditorData = editorData && (
        // Priorité 1: Actions ET HandActions présents (données riches)
        (editorData.handActions?.length > 0 && editorData.actions?.length > 0) ||
        // Priorité 2: MixedColors présents (même si pas de handActions)
        (editorData.mixedColors?.length > 0 && editorData.actions?.length > 0) ||
        // Priorité 3: Au moins un titre personnalisé (pas juste le nom de la range)
        (editorData.title && editorData.title !== selectedRange?.name) ||
        // Fallback: Si on a au moins des actions définies
        (editorData.actions?.length > 0)
      )
      
      if (hasCompleteEditorData) {
        console.log('📊 Loading editorData:', {
          title: editorData.title,
          actionsCount: editorData.actions?.length || 0,
          mixedColorsCount: editorData.mixedColors?.length || 0,
          handActionsCount: editorData.handActions?.length || 0,
          sampleHandActions: editorData.handActions?.slice(0, 3)
        })
        setTitle(editorData.title || 'Nouvelle Range')
        setActions((editorData.actions as Action[]) || [DEFAULT_ACTION])
        setMixedColors(editorData.mixedColors || [])
        setHandActions(editorData.handActions || [])
      } else {
        // Si pas d'editor data mais qu'il y a des mains dans le format legacy, les convertir
        setTitle(selectedRange.name || 'Nouvelle Range')
        // S'assurer que DEFAULT_ACTION est dans les actions
        setActions([DEFAULT_ACTION])
        setMixedColors([])
        
        if (selectedRange.data?.hands && Array.isArray(selectedRange.data.hands)) {
          // Convertir les mains du format legacy vers HandActions avec DEFAULT_ACTION
          const legacyHandActions: HandAction[] = selectedRange.data.hands.map(hand => ({
            handId: hand,
            actionId: DEFAULT_ACTION.id
          }))
          console.log('Loading imported range:', {
            name: selectedRange.name,
            handsCount: selectedRange.data.hands.length,
            handActionsCount: legacyHandActions.length,
            defaultActionId: DEFAULT_ACTION.id,
            sampleHands: selectedRange.data.hands.slice(0, 5),
            actionsArray: [DEFAULT_ACTION]
          })
          setHandActions(legacyHandActions)
        } else {
          setHandActions([])
        }
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

      {/* Toaster pour les notifications */}
      <EditorToaster
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        error={error}
      />
    </div>
  )
})