'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { 
  Volume2, 
  VolumeX, 
  CloudRain, 
  Waves, 
  Zap, 
  Bell,
  RotateCcw
} from 'lucide-react'

interface AmbientSound {
  id: string
  name: string
  file: string
  icon: React.ReactNode
  color: string
}

interface PomodoroAudioControlsProps {
  onNotificationVolumeChange?: (volume: number) => void
}

export interface PomodoroAudioControlsRef {
  stopAllSounds: () => void
}

const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: 'rain',
    name: 'Pluie',
    file: '/audio/rain.wav',
    icon: <CloudRain className="h-4 w-4" />,
    color: 'bg-blue-500'
  },
  {
    id: 'beach',
    name: 'Plage',
    file: '/audio/beach.wav',
    icon: <Waves className="h-4 w-4" />,
    color: 'bg-cyan-500'
  },
  {
    id: 'storm',
    name: 'Orage',
    file: '/audio/storm.wav',
    icon: <Zap className="h-4 w-4" />,
    color: 'bg-purple-500'
  }
]

export const PomodoroAudioControls = forwardRef<PomodoroAudioControlsRef, PomodoroAudioControlsProps>(({ onNotificationVolumeChange }, ref) => {
  const [activeSounds, setActiveSounds] = useState<Set<string>>(new Set())
  const [soundVolumes, setSoundVolumes] = useState<{ [key: string]: number }>({
    rain: 30,
    beach: 30,
    storm: 30
  })
  const [notificationVolume, setNotificationVolume] = useState([70])
  const [isMuted, setIsMuted] = useState(false)

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const bellRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Initialiser les audio elements
    AMBIENT_SOUNDS.forEach(sound => {
      const audio = new Audio(sound.file)
      audio.loop = true
      audio.volume = soundVolumes[sound.id] / 100
      audioRefs.current[sound.id] = audio
    })

    // Audio pour bell
    bellRef.current = new Audio('/audio/bell.wav')
    if (bellRef.current) {
      bellRef.current.volume = notificationVolume[0] / 100
    }

    return () => {
      // Cleanup
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause()
        audio.currentTime = 0
      })
    }
  }, [])

  useEffect(() => {
    // Mettre à jour le volume des sons d'ambiance
    AMBIENT_SOUNDS.forEach(sound => {
      const audio = audioRefs.current[sound.id]
      if (audio) {
        audio.volume = isMuted ? 0 : soundVolumes[sound.id] / 100
      }
    })
  }, [soundVolumes, isMuted])

  useEffect(() => {
    // Mettre à jour le volume des notifications
    if (bellRef.current) {
      bellRef.current.volume = isMuted ? 0 : notificationVolume[0] / 100
    }
    onNotificationVolumeChange?.(isMuted ? 0 : notificationVolume[0] / 100)
  }, [notificationVolume, isMuted, onNotificationVolumeChange])

  const handleSoundToggle = (soundId: string) => {
    const audio = audioRefs.current[soundId]
    if (!audio) return

    const newActiveSounds = new Set(activeSounds)
    
    if (activeSounds.has(soundId)) {
      // Arrêter ce son
      audio.pause()
      audio.currentTime = 0
      newActiveSounds.delete(soundId)
    } else {
      // Démarrer ce son
      audio.currentTime = 0
      audio.play().catch(console.error)
      newActiveSounds.add(soundId)
    }
    
    setActiveSounds(newActiveSounds)
  }

  const handleStopAll = () => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
    setActiveSounds(new Set())
  }

  // Exposer la méthode stopAllSounds via ref
  useImperativeHandle(ref, () => ({
    stopAllSounds: handleStopAll
  }), [])

  const handleVolumeChange = (soundId: string, newVolume: number) => {
    setSoundVolumes(prev => ({
      ...prev,
      [soundId]: newVolume
    }))
    
    // Mettre à jour immédiatement le volume de l'audio
    const audio = audioRefs.current[soundId]
    if (audio) {
      audio.volume = isMuted ? 0 : newVolume / 100
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const testBell = () => {
    if (bellRef.current) {
      bellRef.current.currentTime = 0
      bellRef.current.play().catch(console.error)
    }
  }

  const getActiveSoundsInfo = () => {
    return AMBIENT_SOUNDS.filter(s => activeSounds.has(s.id))
  }

  const activeSoundsInfo = getActiveSoundsInfo()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
          🎵 Contrôles Audio
          {activeSoundsInfo.map(sound => (
            <Badge key={sound.id} className={`${sound.color} text-white`}>
              {sound.icon}
              <span className="ml-1">{sound.name}</span>
            </Badge>
          ))}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contrôles généraux */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className={isMuted ? 'bg-red-50 border-red-200' : ''}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {isMuted ? 'Activé' : 'Muet'}
          </Button>
          
          {activeSounds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopAll}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Arrêter tout ({activeSounds.size})
            </Button>
          )}
        </div>

        {/* Sons d'ambiance */}
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-1">
            🌊 Sons d'ambiance - Contrôles indépendants
          </h4>
          
          <div className="space-y-4">
            {AMBIENT_SOUNDS.map((sound) => (
              <div key={sound.id} className="space-y-2">
                {/* Bouton et nom du son */}
                <div className="flex items-center gap-3">
                  <Button
                    variant={activeSounds.has(sound.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSoundToggle(sound.id)}
                    className={`h-10 w-16 flex flex-col items-center justify-center ${
                      activeSounds.has(sound.id)
                        ? `${sound.color} hover:${sound.color}/90 text-white` 
                        : ''
                    }`}
                  >
                    {sound.icon}
                  </Button>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{sound.name}</span>
                      <div className="flex items-center gap-2">
                        {activeSounds.has(sound.id) && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-600">Actif</span>
                          </div>
                        )}
                        <span className="text-xs font-mono">{soundVolumes[sound.id]}%</span>
                      </div>
                    </div>
                    {/* Slider de volume individuel */}
                    <Slider
                      value={[soundVolumes[sound.id]]}
                      onValueChange={(value) => handleVolumeChange(sound.id, value[0])}
                      max={100}
                      step={5}
                      className="w-full mt-1"
                      disabled={isMuted}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
            🔔 Notifications (Bell)
          </h4>
          
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testBell}
              className="flex-1"
            >
              <Bell className="h-4 w-4 mr-1" />
              Tester
            </Button>
          </div>

          {/* Volume notifications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Volume notifications</span>
              <span className="text-xs font-mono">{notificationVolume[0]}%</span>
            </div>
            <Slider
              value={notificationVolume}
              onValueChange={setNotificationVolume}
              max={100}
              step={5}
              className="w-full"
              disabled={isMuted}
            />
          </div>
        </div>

        {/* Résumé des sons actifs */}
        {activeSounds.size > 0 && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="text-sm">
              <div className="font-medium text-green-800 mb-1">
                {activeSounds.size} son{activeSounds.size > 1 ? 's' : ''} d'ambiance en cours
              </div>
              <div className="flex flex-wrap gap-2">
                {activeSoundsInfo.map(sound => (
                  <div key={sound.id} className="flex items-center gap-1 text-xs text-green-700">
                    {sound.icon}
                    <span>{sound.name}</span>
                    <span className="font-mono">({soundVolumes[sound.id]}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

PomodoroAudioControls.displayName = 'PomodoroAudioControls'