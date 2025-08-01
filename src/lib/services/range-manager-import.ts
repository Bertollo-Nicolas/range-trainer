// Service d'import pour les fichiers Range Manager
export interface RangeManagerData {
  name: string
  hands: string[]
  notes?: string
  position?: string
}

export interface RangeManagerImportResult {
  success: number
  failed: number
  errors: string[]
  ranges: RangeManagerData[]
}

export class RangeManagerImportService {
  // Parser le contenu du fichier Range Manager
  static parseRangeManagerFile(content: string): RangeManagerImportResult {
    const result: RangeManagerImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      ranges: []
    }

    try {
      // Nettoyer le contenu - supprimer les caractères indésirables
      const cleanContent = content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim()

      // Diviser en lignes et filtrer les lignes vides
      const lines = cleanContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      let currentRange: Partial<RangeManagerData> = {}
      let inRangeSection = false
      let handsBuffer: string[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Détecter le début d'une nouvelle range (ligne avec un nom de position/range)
        if (this.isRangeName(line)) {
          // Sauvegarder la range précédente si elle existe
          if (currentRange.name && handsBuffer.length > 0) {
            const hands = this.parseHands(handsBuffer.join(' '))
            if (hands.length > 0) {
              result.ranges.push({
                name: currentRange.name,
                hands,
                ...(currentRange.notes && { notes: currentRange.notes }),
                ...(currentRange.position && { position: currentRange.position })
              })
              result.success++
            }
          }

          // Commencer une nouvelle range
          const position = this.extractPosition(line)
          currentRange = {
            name: this.cleanRangeName(line),
            ...(position && { position })
          }
          handsBuffer = []
          inRangeSection = true
          continue
        }

        // Si on est dans une section de range, collecter les mains
        if (inRangeSection && this.isHandsLine(line)) {
          handsBuffer.push(line)
          continue
        }

        // Détecter les notes/commentaires
        if (inRangeSection && this.isNotesLine(line)) {
          currentRange.notes = this.extractNotes(line)
          continue
        }
      }

      // Traiter la dernière range
      if (currentRange.name && handsBuffer.length > 0) {
        const hands = this.parseHands(handsBuffer.join(' '))
        if (hands.length > 0) {
          result.ranges.push({
            name: currentRange.name,
            hands,
            ...(currentRange.notes && { notes: currentRange.notes }),
            ...(currentRange.position && { position: currentRange.position })
          })
          result.success++
        }
      }

      // Si aucune range trouvée avec le parsing strict, essayer un parsing plus permissif
      if (result.ranges.length === 0) {
        const permissiveResult = this.parseWithPermissiveMethod(cleanContent)
        if (permissiveResult.ranges.length > 0) {
          return permissiveResult
        } else {
          result.errors.push('Aucune range valide trouvée dans le fichier')
          result.errors.push('Formats supportés: lignes avec noms de ranges suivies de mains (AA, AKs, etc.)')
          result.failed = 1
        }
      }

    } catch (error) {
      result.errors.push(`Erreur de parsing: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      result.failed = 1
    }

    return result
  }

  // Détecter si une ligne est un nom de range/position
  private static isRangeName(line: string): boolean {
    // Patterns typiques des noms de ranges dans Range Manager
    const rangePatterns = [
      /^(UTG|EP|MP|CO|BTN|SB|BB|LJ|HJ)/i, // Positions
      /^(Early|Middle|Late|Button|Blinds)/i, // Positions longues
      /^(Open|Call|3bet|4bet|Fold)/i, // Actions
      /^(Tight|Loose|Aggressive|Passive)/i, // Styles
      /^[A-Z][A-Za-z\s-_]+\s*:?\s*$/, // Format titre général
      /^\d+\.\s*[A-Za-z]/, // Format numéroté
      /^[A-Za-z][A-Za-z\s\-_0-9]*\s*:?\s*$/, // Format plus flexible pour titres
      /^\s*[A-Za-z]+.*:/, // Ligne avec : à la fin
    ]

    return rangePatterns.some(pattern => pattern.test(line)) &&
           !this.isHandsLine(line) &&
           line.length < 200 && // Augmenter la limite
           line.length > 0
  }

  // Nettoyer le nom de la range
  private static cleanRangeName(line: string): string {
    return line
      .replace(/^[\d\.\-\s]*/, '') // Supprimer numérotation
      .replace(/:?\s*$/, '') // Supprimer : en fin
      .replace(/^\s*[\-\*\+]\s*/, '') // Supprimer puces
      .trim()
  }

  // Extraire la position du nom
  private static extractPosition(line: string): string | undefined {
    const positionMatch = line.match(/(UTG|EP|MP|CO|BTN|SB|BB|LJ|HJ|Early|Middle|Late|Button|Blinds)/i)
    return positionMatch ? positionMatch[1].toUpperCase() : undefined
  }

  // Détecter si une ligne contient des mains de poker
  private static isHandsLine(line: string): boolean {
    // Rechercher des patterns de mains de poker
    const handPatterns = [
      /[AKQJT2-9]{2}[so]?/g, // AA, AKs, AKo, 22, etc.
      /[AKQJT2-9][AKQJT2-9]/g, // Format simple AA, AK, etc.
    ]

    const handMatches = handPatterns.reduce((count, pattern) => {
      const matches = line.match(pattern)
      return count + (matches ? matches.length : 0)
    }, 0)

    // Réduire le seuil minimum de mains et être plus permissif
    const totalLength = line.replace(/\s/g, '').length
    const nonPokerChars = line.replace(/[AKQJT2-9so\s,\-\+\(\)\[\]]/g, '').length
    
    // Accepter si au moins 1 main et moins de 50% de caractères non-poker
    return handMatches >= 1 && (totalLength === 0 || nonPokerChars < totalLength * 0.5)
  }

  // Détecter les lignes de notes/commentaires
  private static isNotesLine(line: string): boolean {
    const notePatterns = [
      /^(Note|Comment|Info|Remarque):/i,
      /^[\-\*\+]\s/,
      /^\([^)]+\)/, // Texte entre parenthèses
      /^\/\//,      // Commentaire style code
    ]

    return notePatterns.some(pattern => pattern.test(line)) &&
           !this.isHandsLine(line)
  }

  // Extraire les notes
  private static extractNotes(line: string): string {
    return line
      .replace(/^(Note|Comment|Info|Remarque):\s*/i, '')
      .replace(/^[\-\*\+]\s*/, '')
      .replace(/^\([^)]+\)\s*/, '')
      .replace(/^\/\/\s*/, '')
      .trim()
  }

  // Parser les mains depuis une chaîne
  private static parseHands(handsText: string): string[] {
    const hands: string[] = []
    
    // Nettoyer le texte
    const cleanText = handsText
      .replace(/[^\w\s,\-\+]/g, ' ') // Garder seulement lettres, chiffres, espaces et séparateurs
      .replace(/\s+/g, ' ')
      .trim()

    // Patterns pour détecter les mains
    const handPatterns = [
      /\b([AKQJT2-9]{2}[so]?)\b/g,     // AAs, AKs, AKo, 22, etc.
      /\b([AKQJT2-9][AKQJT2-9])\b/g,   // AA, AK, etc.
    ]

    handPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(cleanText)) !== null) {
        const hand = match[1].toUpperCase()
        
        // Normaliser la main
        const normalizedHand = this.normalizeHand(hand)
        if (normalizedHand && !hands.includes(normalizedHand)) {
          hands.push(normalizedHand)
        }
      }
    })

    return hands.sort()
  }

  // Normaliser une main de poker
  private static normalizeHand(hand: string): string | null {
    if (hand.length < 2 || hand.length > 3) return null

    const cards = hand.substring(0, 2).toUpperCase()
    const suited = hand.length === 3 ? hand[2].toLowerCase() : ''

    // Vérifier que les cartes sont valides
    const validRanks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
    if (!validRanks.includes(cards[0]) || !validRanks.includes(cards[1])) {
      return null
    }

    // Normaliser l'ordre pour les paires et les non-paires
    if (cards[0] === cards[1]) {
      // Paire
      return cards
    } else if (suited === 's' || suited === 'o') {
      // Suited ou offsuit - mettre la plus haute carte en premier
      const rank1 = validRanks.indexOf(cards[0])
      const rank2 = validRanks.indexOf(cards[1])
      
      if (rank1 < rank2) {
        return cards + suited
      } else {
        return cards[1] + cards[0] + suited
      }
    } else {
      // Sans indication suited/offsuit - supposer suited pour les connecteurs
      const rank1 = validRanks.indexOf(cards[0])
      const rank2 = validRanks.indexOf(cards[1])
      
      const orderedCards = rank1 < rank2 ? cards : cards[1] + cards[0]
      return orderedCards + 's' // Par défaut suited
    }
  }

  // Méthode de parsing plus permissive pour différents formats
  private static parseWithPermissiveMethod(content: string): RangeManagerImportResult {
    const result: RangeManagerImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      ranges: []
    }

    try {
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      // Chercher toutes les mains dans le texte
      const allHands: string[] = []
      const handPattern = /\b([AKQJT2-9]{2}[so]?)\b/g
      
      let match
      while ((match = handPattern.exec(content)) !== null) {
        const normalizedHand = this.normalizeHand(match[1])
        if (normalizedHand && !allHands.includes(normalizedHand)) {
          allHands.push(normalizedHand)
        }
      }

      if (allHands.length > 0) {
        // Si on trouve des mains mais pas de structure claire, créer une range générique
        result.ranges.push({
          name: 'Range importée',
          hands: allHands.sort(),
          notes: `${allHands.length} mains détectées dans le fichier`
        })
        result.success = 1
      }

      // Essayer de détecter des sections basées sur des lignes non-vides
      let currentRangeName = ''
      let currentHands: string[] = []
      
      for (const line of lines) {
        // Si la ligne contient beaucoup de mains, la traiter comme des mains
        const lineHands = this.parseHands(line)
        if (lineHands.length > 0) {
          currentHands.push(...lineHands)
        } else if (line.length < 100 && currentHands.length > 0) {
          // Ligne courte après des mains = potentiellement un nouveau titre
          if (currentRangeName && currentHands.length > 0) {
            const uniqueHands = [...new Set(currentHands)].sort()
            result.ranges.push({
              name: currentRangeName,
              hands: uniqueHands
            })
          }
          currentRangeName = line
          currentHands = []
        } else if (!currentRangeName && line.length < 100) {
          // Première ligne courte = titre potentiel
          currentRangeName = line
        }
      }

      // Ajouter la dernière range si nécessaire
      if (currentRangeName && currentHands.length > 0) {
        const uniqueHands = [...new Set(currentHands)].sort()
        result.ranges.push({
          name: currentRangeName,
          hands: uniqueHands
        })
      }

      // Déduplication des ranges si nécessaire
      if (result.ranges.length > 1) {
        result.ranges = result.ranges.filter((range, index) => 
          index === 0 || range.hands.length !== result.ranges[0].hands.length ||
          !range.hands.every(hand => result.ranges[0].hands.includes(hand))
        )
      }

      result.success = result.ranges.length

    } catch (error) {
      result.errors.push(`Erreur de parsing permissif: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      result.failed = 1
    }

    return result
  }

  // Convertir au format Range Trainer
  static convertToRangeTrainerFormat(ranges: RangeManagerData[]) {
    return ranges.map(range => ({
      name: range.name,
      hands: range.hands,
      notes: range.notes || '',
      description: range.position ? `Range pour position ${range.position}` : '',
      data: {
        hands: range.hands,
        position: range.position
      }
    }))
  }
}