'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { AnkiService } from '@/lib/services/anki-service'
import { JsonImportData, BulkImportResult } from '@/types/anki'

interface JsonImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: BulkImportResult) => void
  deckId: string
  deckName: string
}

export function JsonImportDialog({ isOpen, onClose, onSuccess, deckId, deckName }: JsonImportDialogProps) {
  const [jsonText, setJsonText] = useState('')
  const [validationResult, setValidationResult] = useState<{ valid: boolean; data?: JsonImportData; error?: string } | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)

  const handleJsonChange = (value: string) => {
    setJsonText(value)
    setValidationResult(null)
    setImportResult(null)
    
    if (value.trim()) {
      const result = AnkiService.validateJsonImport(value)
      setValidationResult(result)
    }
  }

  const handleImport = async () => {
    if (!validationResult?.valid || !validationResult.data) return

    setIsImporting(true)
    try {
      let result: BulkImportResult
      
      // Détecter si c'est un export Anki (avec deckNames détectés)
      if ('deckNames' in validationResult && validationResult.deckNames) {
        // Import Anki avec création automatique des decks
        const parsed = JSON.parse(jsonText)
        result = await AnkiService.importFromAnkiExport(parsed, deckId)
      } else {
        // Import simple dans le deck sélectionné
        const jsonData: JsonImportData = {
          ...validationResult.data,
          deckId
        }
        result = await AnkiService.importCardsFromJson(jsonData)
      }
      
      setImportResult(result)
      
      if (result.success > 0) {
        onSuccess(result)
      }
    } catch (error) {
      setImportResult({
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
        createdDecks: []
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setJsonText('')
    setValidationResult(null)
    setImportResult(null)
    onClose()
  }

  const getExampleJson = () => `Format simple :
{
  "cards": [
    {
      "front": "Qu'est-ce qu'une range d'ouverture en UTG ?",
      "back": "C'est l'ensemble des mains qu'on joue depuis la position Under The Gun, généralement les plus fortes (AA-22, AK-AJ, KQ-KJ, etc.)",
      "tags": ["position", "preflop", "ranges"]
    }
  ]
}

Format export Anki :
{
  "name": "Mon Deck",
  "notes": [
    {
      "deckName": "Mon Deck",
      "modelName": "Basic",
      "fields": {
        "Front": "Question ici",
        "Back": "Réponse ici"
      },
      "tags": ["tag1", "tag2"]
    }
  ]
}`

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importer des cartes JSON
            <Badge variant="outline">{deckName}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Collez votre JSON dans le champ ci-dessous. Supporte le format simple avec "cards" ou 
              le format d'export Anki avec "notes". Les balises HTML sont conservées.
            </AlertDescription>
          </Alert>

          {/* Exemple */}
          <div className="space-y-2">
            <Label>Exemple de format JSON :</Label>
            <div className="w-full overflow-hidden">
              <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap break-words">
                <code>{getExampleJson()}</code>
              </pre>
            </div>
          </div>

          {/* Zone de saisie JSON */}
          <div className="space-y-2">
            <Label htmlFor="json-input">Votre JSON :</Label>
            <Textarea
              id="json-input"
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder="Collez votre JSON ici..."
              rows={12}
              className="font-mono w-full resize-none"
            />
          </div>

          {/* Validation */}
          {validationResult && (
            <div className="w-full">
              <Alert variant={validationResult.valid ? "default" : "destructive"} className="w-full">
                {validationResult.valid ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription className="w-full">
                  {validationResult.valid ? (
                    <div className="space-y-1 w-full">
                      <div>✅ JSON valide - {validationResult.data?.cards.length} carte(s) prête(s) à importer</div>
                      <div className="text-sm text-muted-foreground w-full">
                        {'deckNames' in validationResult && validationResult.deckNames ? (
                          <div className="w-full">
                            <div className="break-words">Format Anki détecté - Decks: {(validationResult.deckNames as string[]).join(', ')}</div>
                            <div className="text-xs">Les decks seront créés sous "{deckName}" si nécessaire</div>
                          </div>
                        ) : (
                          `Destination: ${deckName}`
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="break-words">{validationResult.error}</div>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Résultat d'import */}
          {importResult && (
            <div className="w-full">
              <Alert variant={importResult.success > 0 ? "default" : "destructive"} className="w-full">
                {importResult.success > 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription className="w-full">
                  <div className="space-y-2 w-full">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="default" className="bg-green-600">
                        {importResult.success} réussies
                      </Badge>
                      {importResult.failed > 0 && (
                        <Badge variant="destructive">
                          {importResult.failed} échouées
                        </Badge>
                      )}
                      {importResult.createdDecks.length > 0 && (
                        <Badge variant="outline" className="bg-blue-50">
                          {importResult.createdDecks.length} deck(s) créé(s)
                        </Badge>
                      )}
                    </div>
                    
                    {importResult.createdDecks.length > 0 && (
                      <div className="mt-2 w-full">
                        <div className="text-sm font-medium">Decks créés :</div>
                        <div className="text-sm text-muted-foreground break-words">
                          {importResult.createdDecks.join(', ')}
                        </div>
                      </div>
                    )}
                    
                    {importResult.errors.length > 0 && (
                      <div className="space-y-1 w-full">
                        <div className="font-medium">Erreurs :</div>
                        <ul className="text-sm space-y-1 w-full">
                          {importResult.errors.map((error, index) => (
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
              {importResult?.success ? 'Fermer' : 'Annuler'}
            </Button>
            
            {!importResult && (
              <Button 
                onClick={handleImport}
                disabled={!validationResult?.valid || isImporting}
                className="min-w-24"
              >
                {isImporting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Import...
                  </div>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importer
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}