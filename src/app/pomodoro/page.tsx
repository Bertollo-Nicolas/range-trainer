'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Play, Pause, RotateCcw, Coffee, Timer, Plus } from 'lucide-react'
import { PomodoroService, PomodoroSession, PomodoroConfig } from '@/lib/services/pomodoro-service'
import { PomodoroConfigModal } from '@/components/pomodoro-config-modal'
import { PomodoroToaster } from '@/components/pomodoro-toaster'
import { PomodoroAudioControls, PomodoroAudioControlsRef } from '@/components/pomodoro-audio-controls'
import { logger } from '@/utils/logger'

export default function PomodoroPage() {
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showToaster, setShowToaster] = useState(false)
  const [toasterType, setToasterType] = useState<'work' | 'short_break' | 'long_break'>('work')
  const [sessionHistory, setSessionHistory] = useState<any[]>([])
  const [allSessions, setAllSessions] = useState<PomodoroSession[]>([])
  const [notificationVolume, setNotificationVolume] = useState(0.7)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const bellRef = useRef<HTMLAudioElement | null>(null)
  const audioControlsRef = useRef<PomodoroAudioControlsRef>(null)

  // Charger la session active et l'historique au démarrage
  useEffect(() => {
    loadActiveSession()
    loadSessionHistory()
    loadAllSessions()
  }, [])

  // Recharger l'historique quand la session change
  useEffect(() => {
    if (currentSession) {
      loadSessionHistory()
    }
  }, [currentSession?.id])

  // Timer logic
  useEffect(() => {
    if (currentSession?.isRunning && currentSession.timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        updateTimeLeft()
      }, 1000)
    } else if (currentSession?.timeLeft === 0) {
      handleTimerComplete()
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentSession?.isRunning, currentSession?.timeLeft])

  // Mettre à jour le titre de la page avec le timer
  useEffect(() => {
    if (currentSession && currentSession.timeLeft > 0) {
      const timeString = formatTime(currentSession.timeLeft)
      const emoji = currentSession.currentType === 'work' ? '🍅' : '☕'
      document.title = `${emoji} ${timeString} - Range Trainer`
    } else {
      document.title = 'Pomodoro - Range Trainer'
    }
    
    return () => {
      document.title = 'Pomodoro - Range Trainer'
    }
  }, [currentSession?.timeLeft, currentSession?.currentType])

  const loadActiveSession = async () => {
    try {
      const session = await PomodoroService.getActiveSession()
      if (session) {
        setCurrentSession(session)
      }
    } catch (error) {
      logger.error('Error loading active session', { error }, 'Pomodoro')
    }
  }

  const loadSessionHistory = async () => {
    try {
      if (currentSession) {
        const history = await PomodoroService.getSessionHistory(currentSession.id)
        setSessionHistory(history)
      }
    } catch (error) {
      logger.error('Error loading session history', { error }, 'Pomodoro')
    }
  }

  const loadAllSessions = async () => {
    try {
      const sessions = await PomodoroService.getAllSessions()
      setAllSessions(sessions)
    } catch (error) {
      logger.error('Error loading all sessions', { error }, 'Pomodoro')
    }
  }

  const updateTimeLeft = async () => {
    if (!currentSession) return
    
    const newTimeLeft = currentSession.timeLeft - 1
    const updatedSession = { ...currentSession, timeLeft: newTimeLeft }
    setCurrentSession(updatedSession)
    
    // Sauvegarder en DB toutes les 10 secondes
    if (newTimeLeft % 10 === 0) {
      try {
        await PomodoroService.updateSession(currentSession.id, { timeLeft: newTimeLeft })
      } catch (error) {
        logger.error('Error saving timer state', { error }, 'Pomodoro')
      }
    }
  }

  const handleTimerComplete = async () => {
    if (!currentSession) return

    try {
      // Arrêter le timer
      const updatedSession = { ...currentSession, isRunning: false, timeLeft: 0 }
      setCurrentSession(updatedSession)
      await PomodoroService.updateSession(currentSession.id, { isRunning: false, timeLeft: 0 })

      // Jouer le son de fin de cycle
      playNotificationSound()

      // Ajouter à l'historique
      await PomodoroService.addHistoryEntry({
        sessionId: currentSession.id,
        type: currentSession.currentType,
        plannedDuration: getDurationForType(currentSession.currentType),
        completed: true,
        startTime: currentSession.startTime || new Date(),
        endTime: new Date()
      })

      // Recharger l'historique
      loadSessionHistory()

      // Déterminer le prochain type
      const nextType = getNextType()
      const nextDuration = getDurationForType(nextType)
      
      // Mettre à jour la session
      const newCompletedPomodoros = currentSession.currentType === 'work' 
        ? currentSession.completedPomodoros + 1 
        : currentSession.completedPomodoros

      const sessionUpdate = {
        currentType: nextType,
        timeLeft: nextDuration,
        completedPomodoros: newCompletedPomodoros,
        currentCycle: currentSession.currentType === 'work' 
          ? currentSession.currentCycle + 1 
          : currentSession.currentCycle
      }

      await PomodoroService.updateSession(currentSession.id, sessionUpdate)
      setCurrentSession({ ...updatedSession, ...sessionUpdate })

      // Afficher le toaster
      setToasterType(nextType)
      setShowToaster(true)
      
    } catch (error) {
      logger.error('Error completing timer', { error }, 'Pomodoro')
    }
  }

  const getNextType = (): 'work' | 'short_break' | 'long_break' => {
    if (!currentSession) return 'work'
    
    if (currentSession.currentType === 'work') {
      // Après le travail, déterminer le type de pause
      const nextCycle = currentSession.currentCycle + 1
      return nextCycle % currentSession.cyclesBeforeLongBreak === 0 ? 'long_break' : 'short_break'
    } else {
      // Après une pause, retour au travail
      return 'work'
    }
  }

  const getDurationForType = (type: 'work' | 'short_break' | 'long_break'): number => {
    if (!currentSession) return 1500
    
    switch (type) {
      case 'work': return currentSession.workDuration
      case 'short_break': return currentSession.shortBreakDuration
      case 'long_break': return currentSession.longBreakDuration
    }
  }

  const playNotificationSound = () => {
    if (bellRef.current) {
      bellRef.current.volume = notificationVolume
      bellRef.current.currentTime = 0
      bellRef.current.play().catch(() => {
        logger.info('Timer completed - notification sound failed', {}, 'Pomodoro')
      })
    }
  }

  const handleNotificationVolumeChange = (volume: number) => {
    setNotificationVolume(volume)
  }

  // Initialiser l'audio bell
  useEffect(() => {
    bellRef.current = new Audio('/audio/bell.wav')
    bellRef.current.volume = notificationVolume
    
    return () => {
      if (bellRef.current) {
        bellRef.current.pause()
      }
    }
  }, [])

  const handleCreateSession = async (config: PomodoroConfig) => {
    try {
      // Arrêter tous les sons avant de créer une nouvelle session
      audioControlsRef.current?.stopAllSounds()
      
      // Arrêter toutes les sessions actives
      await PomodoroService.stopAllSessions()
      
      // Créer la nouvelle session
      const newSession = await PomodoroService.createSession(config)
      setCurrentSession(newSession)
      
      // Recharger la liste de toutes les sessions
      loadAllSessions()
    } catch (error) {
      logger.error('Error creating session', { error }, 'Pomodoro')
    }
  }

  const toggleTimer = async () => {
    if (!currentSession) return

    try {
      const newIsRunning = !currentSession.isRunning
      const updates: Partial<PomodoroSession> = { 
        isRunning: newIsRunning,
        isPaused: !newIsRunning && currentSession.timeLeft > 0
      }

      if (newIsRunning) {
        updates.startTime = new Date()
        // Jouer le son de démarrage
        playNotificationSound()
      }

      await PomodoroService.updateSession(currentSession.id, updates)
      setCurrentSession({ ...currentSession, ...updates })
    } catch (error) {
      logger.error('Error toggling timer', { error }, 'Pomodoro')
    }
  }

  const resetTimer = async () => {
    if (!currentSession) return

    try {
      const originalDuration = getDurationForType(currentSession.currentType)
      const updates = { 
        isRunning: false, 
        isPaused: false, 
        timeLeft: originalDuration 
      }

      await PomodoroService.updateSession(currentSession.id, updates)
      setCurrentSession({ ...currentSession, ...updates })
    } catch (error) {
      logger.error('Error resetting timer', { error }, 'Pomodoro')
    }
  }

  const deleteCurrentSession = async () => {
    if (!currentSession) return

    try {
      // Arrêter tous les sons avant de supprimer la session
      audioControlsRef.current?.stopAllSounds()
      
      await PomodoroService.deleteSession(currentSession.id)
      setCurrentSession(null)
      loadAllSessions() // Recharger la liste
    } catch (error) {
      logger.error('Error deleting current session', { error }, 'Pomodoro')
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Si on supprime la session active, arrêter les sons
      if (currentSession?.id === sessionId) {
        audioControlsRef.current?.stopAllSounds()
      }
      
      await PomodoroService.deleteSession(sessionId)
      loadAllSessions() // Recharger la liste
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
      }
    } catch (error) {
      logger.error('Error deleting session', { error, sessionId }, 'Pomodoro')
    }
  }

  const handleResumeSession = async (session: PomodoroSession) => {
    try {
      // Arrêter tous les sons avant de changer de session
      audioControlsRef.current?.stopAllSounds()
      
      // Arrêter toutes les sessions actives
      await PomodoroService.stopAllSessions()
      
      // Activer cette session
      await PomodoroService.updateSession(session.id, { isRunning: false })
      setCurrentSession(session)
      loadAllSessions() // Recharger la liste
    } catch (error) {
      logger.error('Error resuming session', { error }, 'Pomodoro')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getProgress = () => {
    if (!currentSession) return 0
    const total = getDurationForType(currentSession.currentType)
    return ((total - currentSession.timeLeft) / total) * 100
  }

  const getModeIcon = (type: string) => {
    switch (type) {
      case 'work': return <Timer className="h-5 w-5" />
      case 'short_break': return <Coffee className="h-5 w-5" />
      case 'long_break': return <Coffee className="h-5 w-5" />
      default: return <Timer className="h-5 w-5" />
    }
  }

  const getModeLabel = (type: string) => {
    switch (type) {
      case 'work': return 'Temps de travail'
      case 'short_break': return 'Pause courte'
      case 'long_break': return 'Pause longue'
      default: return 'Temps de travail'
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Session actuelle - full width */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              🍅 Session Pomodoro
              {currentSession && (
                <Badge variant={currentSession.currentType === 'work' ? 'default' : 'secondary'}>
                  {getModeLabel(currentSession.currentType)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSession ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timer principal */}
                <div className="lg:col-span-2">
                  <div className="text-center space-y-6">
                    {/* Progress et type */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2">
                        {getModeIcon(currentSession.currentType)}
                        <h3 className="text-xl font-semibold">
                          {getModeLabel(currentSession.currentType)}
                        </h3>
                      </div>
                      <Progress value={getProgress()} className="w-full h-3" />
                    </div>
                    
                    {/* Timer display */}
                    <div className="text-7xl font-mono font-bold text-foreground">
                      {formatTime(currentSession.timeLeft)}
                    </div>
                    
                    {/* Controls */}
                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={toggleTimer}
                        size="lg"
                        className={currentSession.isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                      >
                        {currentSession.isRunning ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                        {currentSession.isRunning ? 'Pause' : 'Démarrer'}
                      </Button>
                      
                      <Button onClick={resetTimer} variant="outline" size="lg">
                        <RotateCcw className="h-5 w-5 mr-2" />
                        Reset
                      </Button>

                      <Button onClick={deleteCurrentSession} variant="destructive" size="lg">
                        Terminer session
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Stats session */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{currentSession.completedPomodoros}</div>
                    <div className="text-sm text-muted-foreground">Pomodoros terminés</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      Cycle {currentSession.currentCycle + 1} / {currentSession.cyclesBeforeLongBreak}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currentSession.cyclesBeforeLongBreak - (currentSession.currentCycle % currentSession.cyclesBeforeLongBreak) - 1} avant pause longue
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="font-medium">{Math.floor(currentSession.workDuration / 60)}m</div>
                      <div className="text-xs text-muted-foreground">Travail</div>
                    </div>
                    <div>
                      <div className="font-medium">{Math.floor(currentSession.shortBreakDuration / 60)}m</div>
                      <div className="text-xs text-muted-foreground">Pause</div>
                    </div>
                    <div>
                      <div className="font-medium">{Math.floor(currentSession.longBreakDuration / 60)}m</div>
                      <div className="text-xs text-muted-foreground">Long</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm font-medium">{currentSession.name}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍅</div>
                <h3 className="text-xl font-semibold mb-2">Aucune session active</h3>
                <p className="text-muted-foreground mb-6">
                  Créez une nouvelle session Pomodoro pour commencer à travailler avec la technique de gestion du temps
                </p>
                <Button 
                  onClick={() => setShowConfigModal(true)}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nouvelle session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historique de la session - seulement si session active */}
        {currentSession && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🕒 Historique de la session
                <Badge variant="outline">
                  {sessionHistory.length} complétés
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {sessionHistory.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Aucun pomodoro terminé dans cette session
                  </div>
                ) : (
                  sessionHistory.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-1 px-2 bg-muted/30 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-medium">
                          {entry.type === 'work' ? '🍅 Travail' : 
                           entry.type === 'short_break' ? '☕ Pause' : 
                           '🌴 Pause longue'}
                        </span>
                        <span className="text-muted-foreground">
                          ({Math.floor(entry.plannedDuration / 60)}m)
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.endTime?.toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contrôles Audio - seulement si session active */}
        {currentSession && (
          <PomodoroAudioControls 
            ref={audioControlsRef}
            onNotificationVolumeChange={handleNotificationVolumeChange}
          />
        )}

        {/* Historique de toutes les sessions - seulement si AUCUNE session active */}
        {!currentSession && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                📋 Historique des sessions
                <Badge variant="outline">
                  {allSessions.length} sessions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {allSessions.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Aucune session Pomodoro créée
                  </div>
                ) : (
                  allSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                      <div className="flex-1 mr-3">
                        <div className="font-medium text-sm">{session.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                          <span>🍅 {session.completedPomodoros} complétés</span>
                          <span>⏱️ {Math.floor(session.workDuration / 60)}m/{Math.floor(session.shortBreakDuration / 60)}m</span>
                          <span className={session.isRunning ? 'text-green-600' : session.completedPomodoros > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
                            {session.isRunning ? '🟢 Active' : session.completedPomodoros > 0 ? '✅ Terminée' : '⏸️ Créée'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground text-right mr-2">
                          <div>{session.createdAt.toLocaleDateString('fr-FR')}</div>
                          <div>{session.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className="flex gap-1">
                          {!session.isRunning && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResumeSession(session)}
                              className="h-7 px-2 text-xs"
                            >
                              {session.completedPomodoros > 0 ? 'Reprendre' : 'Recommencer'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSession(session.id)}
                            className="h-7 px-2 text-xs"
                          >
                            Suppr
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info technique Pomodoro - seulement si AUCUNE session active */}
        {!currentSession && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 La Technique Pomodoro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl mb-2">🍅</div>
                  <div className="font-semibold">1. Choisir une tâche</div>
                  <div className="text-muted-foreground">Focus sur une seule chose</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">⏰</div>
                  <div className="font-semibold">2. Timer 25 min</div>
                  <div className="text-muted-foreground">Travail sans interruption</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">☕</div>
                  <div className="font-semibold">3. Pause 5 min</div>
                  <div className="text-muted-foreground">Récupération courte</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">🔄</div>
                  <div className="font-semibold">4. Répéter</div>
                  <div className="text-muted-foreground">Pause longue après 4 cycles</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de configuration */}
      <PomodoroConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSubmit={handleCreateSession}
      />

      {/* Toaster pour les notifications */}
      <PomodoroToaster
        isVisible={showToaster}
        type={toasterType}
        onClose={() => setShowToaster(false)}
      />

      {/* L'audio bell est géré dans le useEffect et les contrôles audio */}
    </div>
  )
}

