'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Timer, Coffee } from 'lucide-react'

interface PomodoroToasterProps {
  isVisible: boolean
  type: 'work' | 'short_break' | 'long_break'
  onClose: () => void
  onContinue?: () => void
  autoHideDelay?: number
}

export function PomodoroToaster({ 
  isVisible, 
  type, 
  onClose, 
  onContinue,
  autoHideDelay = 10000 // 10 secondes par défaut
}: PomodoroToasterProps) {
  const [timeLeft, setTimeLeft] = useState(autoHideDelay / 1000)

  useEffect(() => {
    if (!isVisible) return

    setTimeLeft(autoHideDelay / 1000)
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onClose()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isVisible, autoHideDelay, onClose])

  if (!isVisible) return null

  const getTypeConfig = () => {
    switch (type) {
      case 'work':
        return {
          title: '🍅 Temps de travail !',
          message: 'Concentrez-vous sur votre tâche',
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          icon: <Timer className="h-5 w-5 text-red-600" />
        }
      case 'short_break':
        return {
          title: '☕ Pause courte !',
          message: 'Prenez 5 minutes pour vous détendre',
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          icon: <Coffee className="h-5 w-5 text-green-600" />
        }
      case 'long_break':
        return {
          title: '🌴 Pause longue !',
          message: 'Profitez de 15 minutes de repos',
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          icon: <Coffee className="h-5 w-5 text-blue-600" />
        }
    }
  }

  const config = getTypeConfig()

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <Card className={`${config.bgColor} border-2 shadow-lg min-w-[300px]`}>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {config.icon}
              <div>
                <h4 className={`font-semibold ${config.textColor}`}>
                  {config.title}
                </h4>
                <p className={`text-sm ${config.textColor} opacity-80`}>
                  {config.message}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-white/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="flex space-x-2">
              {onContinue && (
                <Button
                  onClick={onContinue}
                  size="sm"
                  className="bg-white hover:bg-gray-50 text-gray-700 border"
                >
                  Continuer
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className={`${config.textColor} hover:bg-white/50`}
              >
                Fermer
              </Button>
            </div>
            
            <div className={`text-xs ${config.textColor} opacity-60`}>
              Auto-fermeture: {timeLeft}s
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}