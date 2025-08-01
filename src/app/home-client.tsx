'use client'

import { useState, useRef } from 'react'
import { AsideDB } from "@/components/aside-db"
import { CoreEditor, CoreEditorRef } from "@/components/range-editor/core-editor"
import { TreeItem } from '@/types/range'
import { logger } from '@/utils/logger'

export function HomeClient() {
  const [selectedRange, setSelectedRange] = useState<TreeItem | undefined>()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingRangeSelection, setPendingRangeSelection] = useState<TreeItem | null>(null)
  const asideRefresh = useRef<(() => void) | null>(null)
  const coreEditorRef = useRef<CoreEditorRef | null>(null)

  const handleSelectItem = (item: TreeItem) => {
    if (item.type === 'range') {
      if (hasUnsavedChanges && selectedRange) {
        // Il y a des changements non sauvegardés, passer à CoreEditor
        setPendingRangeSelection(item)
      } else {
        // Pas de changements, changer directement
        setSelectedRange(item)
      }
    }
  }

  const handleRangeSelectionConfirmed = (range: TreeItem) => {
    setSelectedRange(range)
    setPendingRangeSelection(null)
  }

  const handleRangeSelectionCancelled = () => {
    setPendingRangeSelection(null)
  }

  const handleRangeUpdated = () => {
    logger.debug('Refreshing sidebar data after save', {}, 'RangeEditor')
    asideRefresh.current?.()
  }

  // Empêcher la fermeture de la page avec des changements non sauvegardés
  // TEMPORAIREMENT DÉSACTIVÉ - trop sensible et bloque la navigation
  // useEffect(() => {
  //   const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  //     if (hasUnsavedChanges) {
  //       e.preventDefault()
  //       e.returnValue = '' // Chrome requires returnValue to be set
  //       return 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter la page ?'
  //     }
  //   }

  //   window.addEventListener('beforeunload', handleBeforeUnload)
    
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload)
  //   }
  // }, [hasUnsavedChanges])

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-[calc(100vh-3.5rem)]">
        <AsideDB 
          className="w-80 min-w-80" 
          onSelectItem={handleSelectItem}
          onRefreshReady={(refreshFn) => {
            asideRefresh.current = refreshFn
          }}
        />
        <main className="flex-1">
          {selectedRange ? (
            <CoreEditor 
              ref={coreEditorRef}
              selectedRange={selectedRange}
              pendingRangeSelection={pendingRangeSelection}
              onUnsavedChanges={setHasUnsavedChanges}
              onRangeUpdated={handleRangeUpdated}
              onRangeSelectionConfirmed={handleRangeSelectionConfirmed}
              onRangeSelectionCancelled={handleRangeSelectionCancelled}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Range Editor</h1>
                <p className="text-muted-foreground">
                  Sélectionnez un range dans la barre latérale pour commencer
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}