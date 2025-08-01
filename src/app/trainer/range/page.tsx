'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Check, RotateCcw, Target, X } from "lucide-react"
import Link from "next/link"
import { TreeItem } from '@/types/range'
import { SessionService } from '@/lib/services/session-service'
import { SimpleRangeLinkingModal } from '@/components/scenario/SimpleRangeLinkingModal'
import { RangeTable } from '@/components/range-editor/range-table'
import { Action, HandAction, MixedColor } from '@/types/range-editor'
import { ColorPicker } from '@/components/range-editor/color-picker'
import { MixedColorManager } from '@/components/range-editor/mixed-color-manager'
import { cn } from '@/lib/utils'

interface TrainingStats {
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  currentStreak: number
  bestStreak: number
  accuracy: number
}

interface TrainingSession {
  id: string
  rangeId: string
  rangeName: string
  originalHandActions: HandAction[]
  userHandActions: HandAction[]
  actions: Action[]
  mixedColors: MixedColor[]
  startTime: Date
  isCompleted: boolean
}

interface ComparisonResult {
  accuracy: number
  precision: number
  recall: number
  correctActions: number
  totalOriginal: number
  handResults: Map<string, 'correct' | 'wrong_action' | 'missing_action' | 'extra_action'>
}

export default function RangeTraining() {
  const [currentSession, setCurrentSession] = useState<TrainingSession | null>(null)
  const [stats, setStats] = useState<TrainingStats>({
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    currentStreak: 0,
    bestStreak: 0,
    accuracy: 0
  })
  const [showComparison, setShowComparison] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showRangeModal, setShowRangeModal] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)
  const [selectedMixedColor, setSelectedMixedColor] = useState<string | null>(null)
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)

  const handleRangeSelect = async (range: TreeItem) => {
    if (range.type !== 'range' || !range.data?.editorData) {
      alert('Cette range ne contient pas de données d\'éditeur. Veuillez l\'éditer d\'abord.')
      return
    }

    if (!range.id) {
      alert('ID de range manquant. Impossible de créer une session.')
      return
    }

    const editorData = range.data.editorData
    
    // Charger toutes les actions de la range originale
    const actionsToLoad = editorData.actions
    
    // Créer les handActions originaux (sans mixed colors)
    const originalHandActions = editorData.handActions
      .filter(ha => ha.actionId && !ha.mixedColorId) // Exclure les mixed colors
      .map(ha => ({
        handId: ha.handId,
        actionId: ha.actionId!
      }))

    const session: TrainingSession = {
      id: Date.now().toString(),
      rangeId: range.id,
      rangeName: range.name,
      originalHandActions,
      userHandActions: [],
      actions: actionsToLoad, // Toutes les actions sans fold séparé
      mixedColors: [], // Commencer avec 0 mixed colors
      startTime: new Date(),
      isCompleted: false
    }

    // Créer la session en DB
    try {
      const dbSession = await SessionService.createSession({
        type: 'range_training',
        rangeId: range.id,
        rangeName: range.name,
        startTime: session.startTime,
        endTime: session.startTime,
        duration: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracy: 0,
        streak: 0
      })
      setSessionId(dbSession.id)
    } catch (error) {
      console.error('Erreur lors de la création de session:', error)
    }

    setCurrentSession(session)
    setShowComparison(false)
    setSelectedAction(actionsToLoad[0] || null) // Sélectionner la première action
    setSelectedMixedColor(null)
  }

  const handleHandClick = (handId: string) => {
    if (!currentSession || showComparison) return

    setCurrentSession(prev => {
      if (!prev) return prev
      
      // Vérifier si cette main a déjà l'action/mixed color sélectionnée
      const existingHandAction = prev.userHandActions.find(ha => ha.handId === handId)
      const hasSelectedAction = selectedAction && existingHandAction?.actionId === selectedAction.id
      const hasSelectedMixedColor = selectedMixedColor && existingHandAction?.mixedColorId === selectedMixedColor
      
      // Si on clique sur la même action/mixed color, on la supprime (fold)
      if (hasSelectedAction || hasSelectedMixedColor) {
        return {
          ...prev,
          userHandActions: prev.userHandActions.filter(ha => ha.handId !== handId)
        }
      }
      
      // Sinon, supprimer l'ancienne action et ajouter la nouvelle
      const filteredActions = prev.userHandActions.filter(ha => ha.handId !== handId)
      
      let newUserHandActions = filteredActions
      
      if (selectedAction) {
        newUserHandActions = [...filteredActions, { handId, actionId: selectedAction.id }]
      } else if (selectedMixedColor) {
        newUserHandActions = [...filteredActions, { handId, mixedColorId: selectedMixedColor }]
      }
      
      return {
        ...prev,
        userHandActions: newUserHandActions
      }
    })
  }

  const handleDragSelect = (handIds: string[]) => {
    if (!currentSession || showComparison) return

    setCurrentSession(prev => {
      if (!prev) return prev
      
      // Supprimer les anciennes actions pour ces mains
      const filteredActions = prev.userHandActions.filter(ha => !handIds.includes(ha.handId))
      
      // Ajouter la nouvelle action
      let newHandActions = filteredActions
      
      if (selectedAction) {
        newHandActions = [
          ...filteredActions,
          ...handIds.map(handId => ({ handId, actionId: selectedAction.id }))
        ]
      } else if (selectedMixedColor) {
        newHandActions = [
          ...filteredActions,
          ...handIds.map(handId => ({ handId, mixedColorId: selectedMixedColor }))
        ]
      }
      
      return {
        ...prev,
        userHandActions: newHandActions
      }
    })
  }

  const calculateScore = (): ComparisonResult => {
    if (!currentSession) return { 
      accuracy: 0, precision: 0, recall: 0, correctActions: 0, totalOriginal: 0, 
      handResults: new Map() 
    }

    // Créer des Maps pour faciliter la comparaison
    const originalMap = new Map()
    currentSession.originalHandActions.forEach(ha => {
      originalMap.set(ha.handId, ha.actionId)
    })

    const userMap = new Map()
    currentSession.userHandActions.forEach(ha => {
      if (ha.actionId) {
        userMap.set(ha.handId, ha.actionId)
      } else if (ha.mixedColorId) {
        userMap.set(ha.handId, ha.mixedColorId)
      }
    })

    let truePositives = 0
    let falsePositives = 0
    let falseNegatives = 0
    const handResults = new Map<string, 'correct' | 'wrong_action' | 'missing_action' | 'extra_action'>()

    // Parcourir toutes les mains possibles
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
                     'A2o', 'K2o', 'Q2o', 'J2o', 'T2o', '92o', '82o', '72o', '62o', '52o', '42o', '32o', '22'].flat()

    allHands.forEach(hand => {
      const originalAction = originalMap.get(hand)
      const userAction = userMap.get(hand)
      
      const hasOriginalAction = originalAction && originalAction !== 'fold'
      const hasUserAction = userAction && userAction !== 'fold'
      
      if (hasOriginalAction && hasUserAction && originalAction === userAction) {
        truePositives++
        handResults.set(hand, 'correct')
      } else if (hasOriginalAction && hasUserAction && originalAction !== userAction) {
        falsePositives++
        handResults.set(hand, 'wrong_action')
      } else if (hasOriginalAction && !hasUserAction) {
        falseNegatives++
        handResults.set(hand, 'missing_action')
      } else if (!hasOriginalAction && hasUserAction) {
        falsePositives++
        handResults.set(hand, 'extra_action')
      }
      // Les vrais négatifs sont corrects par défaut
    })

    const totalUserActions = currentSession.userHandActions.length
    const totalOriginalActions = currentSession.originalHandActions.length
    const precision = totalUserActions > 0 ? truePositives / totalUserActions : 0
    const recall = totalOriginalActions > 0 ? truePositives / totalOriginalActions : 0
    const accuracy = allHands.length > 0 ? (truePositives + (allHands.length - totalOriginalActions - falsePositives)) / allHands.length : 0

    return {
      accuracy: Math.round(accuracy * 100),
      precision: Math.round(precision * 100),
      recall: Math.round(recall * 100),
      correctActions: truePositives,
      totalOriginal: totalOriginalActions,
      handResults
    }
  }

  const validateRange = async () => {
    if (!currentSession || !sessionId) return

    const result = calculateScore()
    setComparisonResult(result)
    const isSuccess = result.accuracy >= 80 // Seuil de réussite à 80%
    
    // Mettre à jour les stats locales
    const newStats = {
      totalQuestions: stats.totalQuestions + 1,
      correctAnswers: stats.correctAnswers + (isSuccess ? 1 : 0),
      incorrectAnswers: stats.incorrectAnswers + (isSuccess ? 0 : 1),
      currentStreak: isSuccess ? stats.currentStreak + 1 : 0,
      bestStreak: isSuccess ? Math.max(stats.bestStreak, stats.currentStreak + 1) : stats.bestStreak,
      accuracy: stats.totalQuestions + 1 > 0 ? 
        Math.round(((stats.correctAnswers + (isSuccess ? 1 : 0)) / (stats.totalQuestions + 1)) * 100) : 0
    }
    setStats(newStats)

    // Enregistrer en DB
    try {
      await SessionService.updateSession(sessionId, {
        endTime: new Date(),
        duration: Math.round((Date.now() - currentSession.startTime.getTime()) / (1000 * 60)),
        totalQuestions: newStats.totalQuestions,
        correctAnswers: newStats.correctAnswers,
        incorrectAnswers: newStats.incorrectAnswers,
        accuracy: newStats.accuracy,
        streak: newStats.bestStreak
      })

      // Enregistrer le détail de cette reconstruction
      await SessionService.recordSessionHand(sessionId, {
        hand: `${currentSession.rangeName}_reconstruction`,
        card1: '',
        card2: '',
        position: null,
        playerAction: `${result.correctActions}/${result.totalOriginal}`,
        correctAction: `${result.totalOriginal}/${result.totalOriginal}`,
        isCorrect: isSuccess,
        responseTime: Math.round((Date.now() - currentSession.startTime.getTime()) / 1000),
        questionContext: {
          rangeId: currentSession.rangeId,
          rangeName: currentSession.rangeName,
          originalActions: currentSession.originalHandActions.length,
          userActions: currentSession.userHandActions.length,
          accuracy: result.accuracy,
          precision: result.precision,
          recall: result.recall
        }
      })
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    }

    setShowComparison(true)
    setCurrentSession(prev => prev ? { ...prev, isCompleted: true } : null)
  }

  const resetSession = () => {
    setCurrentSession(null)
    setShowComparison(false)
    setSessionId(null)
    setSelectedAction(null)
    setSelectedMixedColor(null)
    setComparisonResult(null)
  }

  // Gestion des actions
  const updateAction = (actionId: string, updates: Partial<Action>) => {
    if (!currentSession) return
    
    setCurrentSession(prev => prev ? {
      ...prev,
      actions: prev.actions.map(action => 
        action.id === actionId ? { ...action, ...updates } : action
      )
    } : prev)
  }

  const deleteAction = (actionId: string) => {
    if (!currentSession || currentSession.actions.length <= 2) return // Garder au moins fold + 1 action
    
    setCurrentSession(prev => prev ? {
      ...prev,
      actions: prev.actions.filter(action => action.id !== actionId)
    } : prev)
    
    if (selectedAction?.id === actionId) {
      setSelectedAction(currentSession.actions.find(a => a.id !== actionId) || null)
    }
  }

  const selectAction = (action: Action) => {
    setSelectedAction(action)
    setSelectedMixedColor(null)
  }

  const selectMixedColor = (mixedColorId: string) => {
    setSelectedMixedColor(mixedColorId)
    setSelectedAction(null)
  }

  // Créer des handActions avec code couleur pour la comparaison
  const getComparisonHandActions = (): HandAction[] => {
    if (!currentSession || !comparisonResult) return []
    
    const comparisonActions: HandAction[] = []
    
    comparisonResult.handResults.forEach((result, handId) => {
      let actionId = 'fold'
      
      switch (result) {
        case 'correct':
          actionId = 'correct' // Vert
          break
        case 'wrong_action':
          actionId = 'wrong' // Rouge
          break
        case 'missing_action':
          actionId = 'missing' // Orange
          break
        case 'extra_action':
          actionId = 'extra' // Rouge
          break
      }
      
      if (actionId !== 'fold') {
        comparisonActions.push({ handId, actionId })
      }
    })
    
    return comparisonActions
  }

  // Actions spéciales pour la comparaison
  const comparisonActions: Action[] = [
    { id: 'correct', name: 'Correct', color: '#22c55e', isActive: false },
    { id: 'wrong', name: 'Erreur', color: '#ef4444', isActive: false },
    { id: 'missing', name: 'Manqué', color: '#f97316', isActive: false },
    { id: 'extra', name: 'Extra', color: '#ef4444', isActive: false }
  ]

  const score = currentSession ? calculateScore() : null

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        
        {/* Sidebar avec stats - masqué en mobile */}
        <aside className="hidden lg:block w-80 border-r border-border p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📊 Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/10 p-3 rounded-lg border text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalQuestions}</div>
                  <div className="text-sm text-muted-foreground">Tentatives</div>
                </div>
                
                <div className="bg-green-500/10 p-3 rounded-lg border text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.accuracy}%</div>
                  <div className="text-sm text-muted-foreground">Réussite</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Série actuelle</span>
                  <span className="text-primary">{stats.currentStreak}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Meilleure série</span>
                  <span className="text-primary">{stats.bestStreak}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {currentSession && score && !showComparison && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎯 Score actuel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Précision</span>
                  <span className="font-medium">{score.accuracy}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Actions trouvées</span>
                  <span className="font-medium">{score.correctActions}/{score.totalOriginal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Actions placées</span>
                  <span className="font-medium">{currentSession.userHandActions.length}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Légende en mode comparaison */}
          {showComparison && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎨 Légende</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Correct</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Mauvaise action</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 bg-orange-400 rounded"></div>
                  <span>Action manquée</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions et Mixed Colors */}
          {currentSession && !showComparison && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎨 Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Actions principales */}
                <div className="space-y-2">
                  {currentSession.actions.map((action, index) => (
                    <div
                      key={action.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                        selectedAction?.id === action.id && !selectedMixedColor
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="radio"
                        checked={selectedAction?.id === action.id && !selectedMixedColor}
                        onChange={() => selectAction(action)}
                        className="w-3 h-3 cursor-pointer accent-primary"
                      />
                      
                      <button
                        className="w-6 h-6 rounded border border-border hover:scale-105 transition-transform cursor-pointer"
                        style={{ backgroundColor: action.color }}
                        onClick={() => setColorPickerOpen(action.id)}
                      />
                      
                      <input
                        value={action.name}
                        onChange={(e) => updateAction(action.id, { name: e.target.value })}
                        placeholder="Nom de l'action"
                        className="flex-1 text-sm bg-transparent border-none outline-none"
                      />
                      
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAction(action.id)}
                          className="p-1 h-auto hover:text-destructive cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                </div>

                {/* Mixed Colors */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Mixed Colors</h4>
                  <MixedColorManager
                    actions={currentSession.actions}
                    mixedColors={currentSession.mixedColors}
                    activeMixedColorId={selectedMixedColor}
                    onMixedColorsChange={(mixedColors) => 
                      setCurrentSession(prev => prev ? { ...prev, mixedColors } : prev)
                    }
                    onSelectMixedColor={selectMixedColor}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Zone principale */}
        <main className="flex-1 p-2 lg:p-6 bg-background">
          <div className="flex items-center gap-2 lg:gap-4 mb-4 lg:mb-6">
            <Link href="/trainer">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-lg lg:text-2xl font-bold">Entraînement Range</h1>
            
            {/* Stats mobiles compactes */}
            <div className="flex items-center gap-2 ml-auto lg:hidden">
              <div className="text-xs bg-primary/10 px-2 py-1 rounded">
                {stats.accuracy}%
              </div>
              <div className="text-xs bg-green-500/10 px-2 py-1 rounded">
                {stats.currentStreak}
              </div>
            </div>
          </div>

          {!currentSession ? (
            // Sélection de range
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Choisir une range à reconstruire</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={() => setShowRangeModal(true)}
                    size="lg" 
                    className="w-full"
                  >
                    <Target className="h-5 w-5 mr-2" />
                    Sélectionner une range
                  </Button>
                </CardContent>
              </Card>

              <div className="bg-muted/20 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Comment ça marche :</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Choisissez une range créée dans l'éditeur</li>
                  <li>• Les actions de la range sont chargées (sans les mixed colors existantes)</li>
                  <li>• Vous pouvez créer vos propres mixed colors pendant l'entraînement</li>
                  <li>• Reconstruisez la range avec les actions disponibles</li>
                  <li>• Validez pour voir les erreurs avec un code couleur</li>
                  <li>• Visez 80% de précision pour réussir l'exercice</li>
                </ul>
              </div>
            </div>
          ) : (
            // Mode entraînement
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {currentSession.rangeName}
                      {showComparison && score && (
                        <span className={`ml-4 text-lg ${score.accuracy >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                          {score.accuracy >= 80 ? '✅' : '❌'} {score.accuracy}%
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex gap-2">
                      {!showComparison && (
                        <Button onClick={validateRange} size="sm">
                          <Check className="h-4 w-4 mr-2" />
                          Valider
                        </Button>
                      )}
                      <Button onClick={resetSession} variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Nouvelle range
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 bg-background">
                  <div className="text-center">
                    {!showComparison ? (
                      <p className="text-lg mb-4">
                        Reconstruisez cette range avec les actions disponibles
                      </p>
                    ) : (
                      <p className="text-lg mb-4">Analyse des erreurs avec code couleur</p>
                    )}
                  </div>
                  
                  {/* Grille interactive */}
                  <div className="bg-card rounded-lg border p-2 lg:p-4 overflow-x-auto">
                    <div className="min-w-[300px]">
                      <RangeTable
                        handActions={showComparison ? getComparisonHandActions() : currentSession.userHandActions}
                        actions={showComparison ? comparisonActions : currentSession.actions}
                        mixedColors={showComparison ? [] : currentSession.mixedColors}
                        onHandClick={handleHandClick}
                        onDragSelect={handleDragSelect}
                      />
                    </div>
                  </div>
                  
                  {showComparison && score && (
                    <div className="text-center space-y-2">
                      <div className="text-lg font-semibold">
                        Score: {score.accuracy}% de précision
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {score.correctActions} actions correctes sur {score.totalOriginal} • 
                        Précision: {score.precision}% • Rappel: {score.recall}%
                      </div>
                      {score.accuracy >= 80 ? (
                        <div className="text-green-600 font-medium">🎉 Excellent travail !</div>
                      ) : (
                        <div className="text-orange-600 font-medium">💪 Continuez à vous entraîner !</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Modal de sélection de range */}
      <SimpleRangeLinkingModal
        open={showRangeModal}
        onOpenChange={setShowRangeModal}
        onSelectRange={handleRangeSelect}
      />

      {/* Color Picker */}
      {colorPickerOpen && currentSession && (
        <ColorPicker
          isOpen={true}
          onClose={() => setColorPickerOpen(null)}
          color={currentSession.actions.find(a => a.id === colorPickerOpen)?.color || '#6b994c'}
          onColorChange={(color) => {
            if (colorPickerOpen) {
              updateAction(colorPickerOpen, { color })
            }
          }}
        />
      )}
    </div>
  )
}