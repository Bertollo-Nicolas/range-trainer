'use client'

import { useEffect, forwardRef, useImperativeHandle, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, RotateCcw, Undo, Redo, Settings, Keyboard, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AnimatedRangeMatrix, ANIMATION_PRESETS, useAnimationPreferences } from './animated-range-matrix'
import { RangeStatsPanel, CompactRangeStats } from './range-stats-panel'
import { ActionPanel } from './action-panel'
import { UnsavedChangesDialog } from './unsaved-changes-dialog'
import { useEditorStore, useEditorData, useEditorState, useEditorHistory } from '@/stores/editorStore'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useEditorKeyboardShortcuts, KeyboardShortcutsHelp } from '@/hooks/useKeyboardShortcuts'
import { TreeItem } from '@/types/range'
import { cn } from '@/lib/utils'

interface EnhancedCoreEditorProps {
  selectedRange?: TreeItem
  pendingRangeSelection?: TreeItem | null
  onRangeUpdated?: () => void
  onRangeSelectionConfirmed?: (range: TreeItem) => void
  onRangeSelectionCancelled?: () => void
  className?: string
}

export interface EnhancedCoreEditorRef {
  save: () => Promise<void>
  undo: () => void
  redo: () => void
}

export const EnhancedCoreEditor = forwardRef<EnhancedCoreEditorRef, EnhancedCoreEditorProps>(
  function EnhancedCoreEditor({
    selectedRange,
    pendingRangeSelection,
    onRangeUpdated,
    onRangeSelectionConfirmed,
    onRangeSelectionCancelled,
    className
  }, ref) {
    // UI state
    const [showStats, setShowStats] = useState(true)
    const [showShortcuts, setShowShortcuts] = useState(false)
    const [showSettings, setShowSettings] = useState(false)

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

    // Animation preferences
    const { preset, settings, updatePreset, availablePresets } = useAnimationPreferences()

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

    // Keyboard shortcuts
    const { registeredShortcuts } = useEditorKeyboardShortcuts({
      onSave: async () => {
        await saveRange()
        onRangeUpdated?.()
      },
      onUndo: undo,
      onRedo: redo,
      onClear: () => {
        clearAllHands()
        setTitle(selectedRange?.name || 'Nouvelle Range')
      },
      onSelectAll: () => {
        // Select all poker hands
        const allHands = ['AA', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
                         'AKo', 'KK', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
                         'AQo', 'KQo', 'QQ', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
                         'AJo', 'KJo', 'QJo', 'JJ', 'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s',
                         'ATo', 'KTo', 'QTo', 'JTo', 'TT', 'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s',
                         'A9o', 'K9o', 'Q9o', 'J9o', 'T9o', '99', '98s', '97s', '96s', '95s', '94s', '93s', '92s',
                         'A8o', 'K8o', 'Q8o', 'J8o', 'T8o', '98o', '88', '87s', '86s', '85s', '84s', '83s', '82s',
                         'A7o', 'K7o', 'Q7o', 'J7o', 'T7o', '97o', '87o', '77', '76s', '75s', '74s', '73s', '72s',
                         'A6o', 'K6o', 'Q6o', 'J6o', 'T6o', '96o', '86o', '76o', '66', '65s', '64s', '63s', '62s',
                         'A5o', 'K5o', 'Q5o', 'J5o', 'T5o', '95o', '85o', '75o', '65o', '55', '54s', '53s', '52s',
                         'A4o', 'K4o', 'Q4o', 'J4o', 'T4o', '94o', '84o', '74o', '64o', '54o', '44', '43s', '42s',
                         'A3o', 'K3o', 'Q3o', 'J3o', 'T3o', '93o', '83o', '73o', '63o', '53o', '43o', '33', '32s',
                         'A2o', 'K2o', 'Q2o', 'J2o', 'T2o', '92o', '82o', '72o', '62o', '52o', '42o', '32o', '22']
        selectMultipleHands(allHands)
      },
      enabled: true
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
        }, 1000)
        
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

    // Header animation variants
    const headerVariants = {
      hidden: { opacity: 0, y: -20 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.3, ease: "easeOut" }
      }
    }

    // Content animation variants
    const contentVariants = {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: { duration: 0.4, delay: 0.1 }
      }
    }

    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Animated Header */}
        <motion.div 
          className="p-4 border-b bg-background"
          variants={headerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-3">
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
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
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
                    <motion.div 
                      className="h-3 w-3 rounded-full border-2 border-background border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : saveSuccess ? (
                    <motion.div 
                      className="h-3 w-3 rounded-full bg-background flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    </motion.div>
                  ) : (
                    <>
                      <Save className="h-3 w-3" />
                      <AnimatePresence>
                        {hasUnsavedChanges && (
                          <motion.div 
                            className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          />
                        )}
                      </AnimatePresence>
                    </>
                  )}
                  {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : hasUnsavedChanges ? 'Save*' : 'Save'}
                </Button>
              </motion.div>

              {/* UI Controls */}
              <Button
                onClick={() => setShowStats(!showStats)}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                {showStats ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>

              <Sheet open={showShortcuts} onOpenChange={setShowShortcuts}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Keyboard className="h-3 w-3" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Keyboard Shortcuts</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <KeyboardShortcutsHelp shortcuts={registeredShortcuts} />
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet open={showSettings} onOpenChange={setShowSettings}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-3 w-3" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium">Animation Preset</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availablePresets.map((presetName) => (
                          <Button
                            key={presetName}
                            onClick={() => updatePreset(presetName)}
                            variant={preset === presetName ? "default" : "outline"}
                            size="sm"
                          >
                            {presetName}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          
          {/* Status bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              {/* Auto-save status */}
              {autoSave.isEnabled && (
                <motion.div 
                  className="text-muted-foreground"
                  animate={{ opacity: autoSave.isAutoSaving ? [1, 0.5, 1] : 1 }}
                  transition={{ duration: 1, repeat: autoSave.isAutoSaving ? Infinity : 0 }}
                >
                  {autoSave.statusText}
                </motion.div>
              )}
              
              {/* Error display */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    className="text-destructive"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    Error: {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Compact stats */}
            <CompactRangeStats
              handActions={handActions}
              actions={actions}
              mixedColors={mixedColors}
            />
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div 
          className="flex-1 flex overflow-hidden"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Range Matrix */}
          <div className="w-[60%] p-4 overflow-auto flex items-center justify-center">
            <AnimatedRangeMatrix
              handActions={handActions}
              actions={actions}
              mixedColors={mixedColors}
              onHandClick={toggleHand}
              onDragSelect={selectMultipleHands}
              className="max-w-full max-h-full"
              {...settings}
            />
          </div>

          {/* Right Panel */}
          <div className="w-[40%] border-l bg-muted/20 overflow-auto">
            <div className="p-4 space-y-4">
              {/* Action Panel */}
              <Card>
                <CardContent className="p-4">
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
                </CardContent>
              </Card>

              {/* Stats Panel */}
              <AnimatePresence>
                {showStats && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RangeStatsPanel
                      handActions={handActions}
                      actions={actions}
                      mixedColors={mixedColors}
                      showDetailed={true}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

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