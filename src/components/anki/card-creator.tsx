'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAnkiEngine } from '@/hooks/use-anki-engine'
import { Plus, X, Upload, FileText, Download } from 'lucide-react'
import { CardImport, ImportResult } from '@/lib/anki'

interface CardCreatorProps {
  deckId: string
  onCardCreated?: () => void
  onClose?: () => void
}

export function CardCreator({ deckId, onCardCreated, onClose }: CardCreatorProps) {
  const { actions, loading } = useAnkiEngine()
  
  // État pour la création manuelle
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [creating, setCreating] = useState(false)
  
  // État pour l'import JSON
  const [jsonInput, setJsonInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Création manuelle d'une carte
  const handleCreateCard = async () => {
    if (!front.trim() || !back.trim()) return

    try {
      setCreating(true)
      await actions.createCard({
        deckId,
        front: front.trim(),
        back: back.trim(),
        tags: tags.filter(tag => tag.trim().length > 0)
      })

      // Réinitialise le formulaire
      setFront('')
      setBack('')
      setTags([])
      setCurrentTag('')
      
      onCardCreated?.()
    } catch (error) {
      console.error('Error creating card:', error)
    } finally {
      setCreating(false)
    }
  }

  // Ajout d'un tag
  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag('')
    }
  }

  // Suppression d'un tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  // Import depuis JSON
  const handleImportJson = async () => {
    if (!jsonInput.trim()) return

    try {
      setImporting(true)
      setImportResult(null)
      
      // Parse le JSON
      let cardsToImport: CardImport[]
      
      try {
        const parsed = JSON.parse(jsonInput)
        
        // Supporte différents formats
        if (Array.isArray(parsed)) {
          cardsToImport = parsed
        } else if (parsed.cards && Array.isArray(parsed.cards)) {
          cardsToImport = parsed.cards
        } else if (parsed.front && parsed.back) {
          cardsToImport = [parsed]
        } else {
          throw new Error('Format JSON non reconnu')
        }
      } catch (err) {
        throw new Error('JSON invalide: ' + (err instanceof Error ? err.message : 'Erreur de syntaxe'))
      }

      // Valide le format des cartes
      for (const [index, card] of cardsToImport.entries()) {
        if (!card.front || !card.back) {
          throw new Error(`Carte ${index + 1}: "front" et "back" sont requis`)
        }
      }

      // Import les cartes
      const result = await actions.importCards(cardsToImport, deckId)
      setImportResult(result)
      
      if (result.success > 0) {
        setJsonInput('')
        onCardCreated?.()
      }
    } catch (error) {
      console.error('Error importing cards:', error)
      setImportResult({
        success: 0,
        failed: 0,
        errors: [{ 
          index: 0, 
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          card: { front: '', back: '' }
        }],
        createdDecks: []
      })
    } finally {
      setImporting(false)
    }
  }

  // Génère un exemple JSON
  const generateExampleJson = () => {
    const example = [
      {
        front: "Quelle est la capitale de la France ?",
        back: "Paris",
        tags: ["géographie", "capitale"]
      },
      {
        front: "Qui a écrit 'Les Misérables' ?",
        back: "Victor Hugo",
        tags: ["littérature", "auteur"]
      },
      {
        front: "Quelle est la formule de l'eau ?",
        back: "H₂O",
        tags: ["chimie", "formule"]
      }
    ]
    
    setJsonInput(JSON.stringify(example, null, 2))
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Créer des cartes
          </CardTitle>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Création manuelle
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import JSON
            </TabsTrigger>
          </TabsList>

          {/* Création manuelle */}
          <TabsContent value="manual" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="front">Question (recto)</Label>
                <Textarea
                  id="front"
                  placeholder="Tapez votre question ici..."
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="back">Réponse (verso)</Label>
                <Textarea
                  id="back"
                  placeholder="Tapez votre réponse ici..."
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (optionnel)</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="tags"
                    placeholder="Ajouter un tag..."
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    Ajouter
                  </Button>
                </div>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleCreateCard}
                disabled={!front.trim() || !back.trim() || creating || loading}
                className="w-full"
              >
                {creating ? 'Création...' : 'Créer la carte'}
              </Button>
            </div>
          </TabsContent>

          {/* Import JSON */}
          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="json-input">Données JSON</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateExampleJson}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Exemple
                  </Button>
                </div>
                <Textarea
                  id="json-input"
                  placeholder="Collez votre JSON ici..."
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <div className="bg-muted p-3 rounded-lg text-sm">
                <strong>Formats supportés :</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Array de cartes : <code>[{"{front: '...', back: '...'}"}]</code></li>
                  <li>Objet avec propriété cards : <code>{"{cards: [...]}"}</code></li>
                  <li>Carte unique : <code>{"{front: '...', back: '...'}"}</code></li>
                </ul>
              </div>

              <Button
                onClick={handleImportJson}
                disabled={!jsonInput.trim() || importing}
                className="w-full"
              >
                {importing ? 'Import en cours...' : 'Importer les cartes'}
              </Button>

              {/* Résultats d'import */}
              {importResult && (
                <div className="space-y-2">
                  {importResult.success > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <strong className="text-green-800">✅ Succès :</strong>
                      <span className="ml-2">{importResult.success} carte(s) importée(s)</span>
                    </div>
                  )}
                  
                  {importResult.failed > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <strong className="text-red-800">❌ Erreurs :</strong>
                      <span className="ml-2">{importResult.failed} carte(s) échouée(s)</span>
                      <div className="mt-2 space-y-1">
                        {importResult.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-700">
                            Carte {error.index + 1}: {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {importResult.createdDecks.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <strong className="text-blue-800">📁 Decks créés :</strong>
                      <span className="ml-2">{importResult.createdDecks.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}