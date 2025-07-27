'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Timer, Coffee, RotateCcw } from 'lucide-react'
import { PomodoroConfig } from '@/lib/services/pomodoro-service'

interface PomodoroConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (config: PomodoroConfig) => void
}

interface PomodoroConfigForm {
  name: string
  workDuration: string
  shortBreakDuration: string
  longBreakDuration: string
  cyclesBeforeLongBreak: string
}

const DEFAULT_CONFIG: PomodoroConfigForm = {
  name: 'Session de travail',
  workDuration: '25',
  shortBreakDuration: '5',
  longBreakDuration: '15',
  cyclesBeforeLongBreak: '4'
}

const PRESET_CONFIGS = [
  {
    name: 'Classique',
    config: { ...DEFAULT_CONFIG, name: 'Session classique' }
  },
  {
    name: 'Court',
    config: { ...DEFAULT_CONFIG, name: 'Session courte', workDuration: '15', shortBreakDuration: '3', longBreakDuration: '10' }
  },
  {
    name: 'Long',
    config: { ...DEFAULT_CONFIG, name: 'Session longue', workDuration: '45', shortBreakDuration: '10', longBreakDuration: '30' }
  },
  {
    name: 'Intensif',
    config: { ...DEFAULT_CONFIG, name: 'Session intensive', workDuration: '50', shortBreakDuration: '10', longBreakDuration: '20', cyclesBeforeLongBreak: '3' }
  }
]

export function PomodoroConfigModal({ isOpen, onClose, onSubmit }: PomodoroConfigModalProps) {
  const [config, setConfig] = useState<PomodoroConfigForm>(DEFAULT_CONFIG)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation et conversion en fin de formulaire
    const finalConfig: PomodoroConfig = {
      name: config.name.trim() || 'Session de travail',
      workDuration: Math.max(1, parseInt(config.workDuration) || 25),
      shortBreakDuration: Math.max(1, parseInt(config.shortBreakDuration) || 5),
      longBreakDuration: Math.max(1, parseInt(config.longBreakDuration) || 15),
      cyclesBeforeLongBreak: Math.max(2, parseInt(config.cyclesBeforeLongBreak) || 4)
    }
    
    onSubmit(finalConfig)
    onClose()
  }

  const handlePresetSelect = (presetConfig: PomodoroConfigForm) => {
    setConfig(presetConfig)
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            🍅 Configurer votre session Pomodoro
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Presets */}
          <div>
            <Label className="text-base font-semibold">Configurations prédéfinies</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              {PRESET_CONFIGS.map((preset) => (
                <Card 
                  key={preset.name}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handlePresetSelect(preset.config)}
                >
                  <CardContent className="p-3 text-center">
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {preset.config.workDuration}m / {preset.config.shortBreakDuration}m
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Configuration personnalisée */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Configuration personnalisée</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>

            {/* Nom de la session */}
            <div>
              <Label htmlFor="name">Nom de la session</Label>
              <Input
                id="name"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Ex: Session de révision"
                className="mt-1"
              />
            </div>

            {/* Durées */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="workDuration" className="flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  Travail (minutes)
                </Label>
                <Input
                  id="workDuration"
                  type="number"
                  min="1"
                  max="120"
                  value={config.workDuration}
                  onChange={(e) => setConfig({ ...config, workDuration: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="shortBreakDuration" className="flex items-center gap-1">
                  <Coffee className="h-4 w-4" />
                  Pause courte (minutes)
                </Label>
                <Input
                  id="shortBreakDuration"
                  type="number"
                  min="1"
                  max="30"
                  value={config.shortBreakDuration}
                  onChange={(e) => setConfig({ ...config, shortBreakDuration: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="longBreakDuration" className="flex items-center gap-1">
                  <Coffee className="h-4 w-4" />
                  Pause longue (minutes)
                </Label>
                <Input
                  id="longBreakDuration"
                  type="number"
                  min="1"
                  max="60"
                  value={config.longBreakDuration}
                  onChange={(e) => setConfig({ ...config, longBreakDuration: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Cycles */}
            <div>
              <Label htmlFor="cyclesBeforeLongBreak">Nombre de cycles avant pause longue</Label>
              <Input
                id="cyclesBeforeLongBreak"
                type="number"
                min="2"
                max="8"
                value={config.cyclesBeforeLongBreak}
                onChange={(e) => setConfig({ ...config, cyclesBeforeLongBreak: e.target.value })}
                className="mt-1 max-w-24"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Après {config.cyclesBeforeLongBreak} pomodoros, vous aurez une pause de {config.longBreakDuration} minutes
              </p>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Aperçu de votre session</h4>
            <div className="text-sm space-y-1">
              <div>📝 <strong>{config.name || 'Session de travail'}</strong></div>
              <div>⏱️ Travail: <strong>{parseInt(config.workDuration) || 25} minutes</strong></div>
              <div>☕ Pause courte: <strong>{parseInt(config.shortBreakDuration) || 5} minutes</strong></div>
              <div>🌴 Pause longue: <strong>{parseInt(config.longBreakDuration) || 15} minutes</strong> (tous les {parseInt(config.cyclesBeforeLongBreak) || 4} cycles)</div>
              <div className="pt-2 text-muted-foreground">
                Durée totale d'un cycle complet: <strong>
                  {(parseInt(config.workDuration) || 25) * (parseInt(config.cyclesBeforeLongBreak) || 4) + 
                   (parseInt(config.shortBreakDuration) || 5) * ((parseInt(config.cyclesBeforeLongBreak) || 4) - 1) + 
                   (parseInt(config.longBreakDuration) || 15)} minutes
                </strong>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              🍅 Démarrer la session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}