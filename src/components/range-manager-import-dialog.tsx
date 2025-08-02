'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, CheckCircle, AlertCircle, Folder } from 'lucide-react'
import { RangeManagerImportService, RangeManagerImportResult, RangeManagerData } from '@/lib/services/range-manager-import'

interface RangeManagerImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (importResult: RangeManagerImportResult) => void
}

// Fonction utilitaire pour compter les ranges dans un dossier
const countRangesInFolder = (folder: any): number => {
  let count = 0
  for (const child of folder.children || []) {
    if (child.type === 'folder') {
      count += countRangesInFolder(child)
    } else {
      count++
    }
  }
  return count
}

export function RangeManagerImportDialog({ isOpen, onClose, onSuccess }: RangeManagerImportDialogProps) {
  const [importText, setImportText] = useState('')
  const [parseResult, setParseResult] = useState<RangeManagerImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleTextChange = (value: string) => {
    setImportText(value)
    setParseResult(null)
  }

  const handleParse = () => {
    if (!importText.trim()) return

    setIsProcessing(true)
    try {
      const result = RangeManagerImportService.parseRangeManagerFile(importText)
      setParseResult(result)
    } catch (error) {
      setParseResult({
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
        ranges: []
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = () => {
    if (!parseResult || parseResult.success === 0) return
    
    onSuccess(parseResult)
    handleClose()
  }

  const handleClose = () => {
    setImportText('')
    setParseResult(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importer depuis Range Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 w-full">
          {/* Instructions */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Collez le contenu de votre fichier Range Manager (.txt) ci-dessous. 
              Le système détectera automatiquement les ranges et les mains associées.
            </AlertDescription>
          </Alert>

          {/* Zone de saisie */}
          <div className="space-y-2 w-full">
            <Label htmlFor="import-text">Contenu du fichier Range Manager :</Label>
            <Textarea
              id="import-text"
              value={importText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Collez ici le contenu de votre fichier Range Manager..."
              rows={15}
              className="font-mono w-full resize-none"
            />
          </div>

          {/* Bouton d'analyse */}
          <div className="flex justify-center">
            <Button 
              onClick={handleParse}
              disabled={!importText.trim() || isProcessing}
              className="min-w-32"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyse...
                </div>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Analyser
                </>
              )}
            </Button>
          </div>

          {/* Résultats de l'analyse */}
          {parseResult && (
            <div className="w-full">
              <Alert variant={parseResult.success > 0 ? "default" : "destructive"} className="w-full">
                {parseResult.success > 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription className="w-full">
                  <div className="space-y-3 w-full">
                    {/* Statistiques */}
                    <div className="flex gap-2 flex-wrap">
                      {parseResult.success > 0 && (
                        <Badge variant="default" className="bg-green-600">
                          {parseResult.success} range{parseResult.success > 1 ? 's' : ''} trouvée{parseResult.success > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {parseResult.folders && parseResult.folders.length > 0 && (
                        <Badge variant="default" className="bg-blue-600">
                          {parseResult.folders.length} dossier{parseResult.folders.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {parseResult.ranges && parseResult.ranges.length > 0 && (
                        <Badge variant="default" className="bg-orange-600">
                          {parseResult.ranges.length} range{parseResult.ranges.length > 1 ? 's' : ''} individuelle{parseResult.ranges.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {parseResult.failed > 0 && (
                        <Badge variant="destructive">
                          {parseResult.failed} erreur{parseResult.failed > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {/* Aperçu des ranges trouvées */}
                    {parseResult.ranges && parseResult.ranges.length > 0 && (
                      <div className="space-y-2 w-full">
                        <div className="font-medium text-sm">Ranges détectées :</div>
                        <div className="max-h-40 overflow-y-auto space-y-1 w-full">
                          {parseResult.ranges.map((range, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm w-full">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{range.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {range.hands.length} main{range.hands.length > 1 ? 's' : ''}
                                  {range.position && ` • ${range.position}`}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                {range.hands.slice(0, 3).join(', ')}
                                {range.hands.length > 3 && '...'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Aperçu des dossiers trouvés */}
                    {parseResult.folders && parseResult.folders.length > 0 && (
                      <div className="space-y-2 w-full">
                        <div className="font-medium text-sm">Dossiers détectés :</div>
                        <div className="max-h-40 overflow-y-auto space-y-1 w-full">
                          {parseResult.folders.map((folder, index) => (
                            <div key={index} className="p-2 bg-muted/30 rounded text-sm w-full">
                              <div className="font-medium flex items-center gap-1">
                                <Folder className="h-3 w-3" />
                                {folder.name}
                              </div>
                              <div className="text-xs text-muted-foreground ml-4 mt-1">
                                {countRangesInFolder(folder)} range{countRangesInFolder(folder) > 1 ? 's' : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Erreurs */}
                    {parseResult.errors.length > 0 && (
                      <div className="space-y-1 w-full">
                        <div className="font-medium text-sm">Erreurs :</div>
                        <ul className="text-sm space-y-1 w-full">
                          {parseResult.errors.map((error, index) => (
                            <li key={index} className="flex items-start gap-1 w-full">
                              <span className="text-red-500 flex-shrink-0">•</span>
                              <span className="break-words flex-1">{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            
            {parseResult && parseResult.success > 0 && (
              <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700">
                <Upload className="h-4 w-4 mr-2" />
                Importer {parseResult.success} range{parseResult.success > 1 ? 's' : ''}
                {(parseResult.folders?.length || 0) > 0 && ` dans ${parseResult.folders.length} dossier${parseResult.folders.length > 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}