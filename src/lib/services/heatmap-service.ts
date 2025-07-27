import { SessionService } from './session-service'
import { Database } from '@/types/database'

type SessionHandRow = Database['public']['Tables']['session_hands']['Row']

export interface HandStats {
  hand: string
  totalPlayed: number
  totalCorrect: number
  totalIncorrect: number
  accuracy: number
  errorRate: number // Pourcentage d'erreurs (0-100)
}

export interface HeatmapData {
  [hand: string]: HandStats
}

export class HeatmapService {
  // Récupérer toutes les mains de toutes les sessions
  static async getAllSessionHands(): Promise<SessionHandRow[]> {
    const sessions = await SessionService.getAllSessions()
    const allHands: SessionHandRow[] = []
    
    for (const session of sessions) {
      const hands = await SessionService.getSessionHands(session.id)
      allHands.push(...hands)
    }
    
    return allHands
  }

  // Analyser les données pour créer la heatmap
  static async generateHeatmapData(): Promise<HeatmapData> {
    const allHands = await this.getAllSessionHands()
    return this.processHandsData(allHands)
  }

  // Analyser les données pour créer la heatmap filtrée par range
  static async generateHeatmapDataByRange(rangeName: string): Promise<HeatmapData> {
    const sessions = await SessionService.getAllSessions()
    const rangeSessionIds = sessions
      .filter(s => s.type === 'range_training' && s.rangeName === rangeName)
      .map(s => s.id)
    
    const allHands = await this.getAllSessionHands()
    const filteredHands = allHands.filter(hand => 
      rangeSessionIds.includes(hand.session_id)
    )
    
    return this.processHandsData(filteredHands)
  }

  // Méthode commune pour traiter les données des mains
  private static processHandsData(handsData: any[]): HeatmapData {
    const heatmapData: HeatmapData = {}

    // Analyser chaque main
    for (const handData of handsData) {
      const hand = handData.hand
      
      if (!heatmapData[hand]) {
        heatmapData[hand] = {
          hand,
          totalPlayed: 0,
          totalCorrect: 0,
          totalIncorrect: 0,
          accuracy: 0,
          errorRate: 0
        }
      }

      heatmapData[hand].totalPlayed++
      
      if (handData.is_correct) {
        heatmapData[hand].totalCorrect++
      } else {
        heatmapData[hand].totalIncorrect++
      }
    }

    // Calculer les pourcentages
    Object.values(heatmapData).forEach(stats => {
      if (stats.totalPlayed > 0) {
        stats.accuracy = Math.round((stats.totalCorrect / stats.totalPlayed) * 100)
        stats.errorRate = Math.round((stats.totalIncorrect / stats.totalPlayed) * 100)
      }
    })

    return heatmapData
  }

  // Générer la grille 13x13 standard de poker
  static generatePokerGrid(): string[][] {
    const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
    const grid: string[][] = []

    for (let i = 0; i < 13; i++) {
      grid[i] = []
      for (let j = 0; j < 13; j++) {
        if (i === j) {
          // Diagonale = paires
          grid[i][j] = RANKS[i] + RANKS[i]
        } else if (i < j) {
          // Au-dessus de la diagonale = suited
          grid[i][j] = RANKS[i] + RANKS[j] + 's'
        } else {
          // En-dessous de la diagonale = offsuited
          grid[i][j] = RANKS[j] + RANKS[i] + 'o'
        }
      }
    }

    return grid
  }

  // Obtenir la couleur pour une main basée sur son taux d'erreur
  static getHeatmapColor(errorRate: number, totalPlayed: number): string {
    if (totalPlayed === 0) {
      // Aucune donnée - gris clair
      return 'bg-gray-100 text-gray-400'
    }

    if (errorRate === 0) {
      // Aucune erreur - vert foncé
      return 'bg-green-600 text-white'
    } else if (errorRate <= 10) {
      // Très peu d'erreurs - vert
      return 'bg-green-400 text-white'
    } else if (errorRate <= 25) {
      // Quelques erreurs - vert clair
      return 'bg-green-200 text-green-800'
    } else if (errorRate <= 40) {
      // Erreurs moyennes - jaune
      return 'bg-yellow-300 text-yellow-800'
    } else if (errorRate <= 60) {
      // Beaucoup d'erreurs - orange
      return 'bg-orange-400 text-white'
    } else if (errorRate <= 80) {
      // Très beaucoup d'erreurs - rouge clair
      return 'bg-red-400 text-white'
    } else {
      // Énormément d'erreurs - rouge foncé
      return 'bg-red-600 text-white'
    }
  }

  // Obtenir les stats pour une main spécifique
  static getHandStats(hand: string, heatmapData: HeatmapData): HandStats | null {
    return heatmapData[hand] || null
  }
}