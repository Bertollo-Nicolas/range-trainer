// Service d'import pour les fichiers Range Manager
export interface RangeManagerData {
  name: string
  hands: string[]
  notes?: string
  position?: string
  editorData?: {
    title: string
    actions: Array<{id: string, name: string, color: string}>
    handActions: Array<{handId: string, actionId?: string, mixedColorId?: string}>
    mixedColors: Array<{id: string, actions: Array<{actionId: string, percentage: number}>}>
  }
}

export interface RangeManagerFolder {
  name: string
  type: 'folder'
  children: (RangeManagerFolder | RangeManagerData)[]
}

export interface RangeManagerImportResult {
  success: number
  failed: number
  errors: string[]
  ranges: RangeManagerData[]
  folders: RangeManagerFolder[]
}

export class RangeManagerImportService {
  // Parser le contenu du fichier Range Manager
  static parseRangeManagerFile(content: string): RangeManagerImportResult {
    const result: RangeManagerImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      ranges: [],
      folders: []
    }

    try {
      // D'abord, essayer de parser comme JSON (format Range Manager export)
      const jsonResult = this.parseRangeManagerJSON(content)
      
      if (jsonResult.ranges.length > 0 || jsonResult.folders.length > 0) {
        return jsonResult
      }

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
      ranges: [],
      folders: []
    }

    try {
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      // Stratégie 1: Détecter les ranges par patterns de séparation
      const rangesByPattern = this.parseByPatternDetection(lines)
      if (rangesByPattern.length > 1) {
        result.ranges = rangesByPattern
        result.success = rangesByPattern.length
        return result
      }

      // Stratégie 2: Détecter par blocs de mains séparés par des lignes vides
      const rangesByBlocks = this.parseByHandBlocks(content)
      if (rangesByBlocks.length > 1) {
        result.ranges = rangesByBlocks
        result.success = rangesByBlocks.length
        return result
      }

      // Stratégie 3: Parsing ligne par ligne amélioré
      const rangesByImprovedParsing = this.parseWithImprovedLineDetection(lines)
      if (rangesByImprovedParsing.length > 0) {
        result.ranges = rangesByImprovedParsing
        result.success = rangesByImprovedParsing.length
        return result
      }

      // Fallback: Au moins récupérer toutes les mains trouvées
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
        result.ranges.push({
          name: 'Range importée',
          hands: allHands.sort(),
          notes: `${allHands.length} mains détectées dans le fichier`
        })
        result.success = 1
      }

    } catch (error) {
      result.errors.push(`Erreur de parsing permissif: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      result.failed = 1
    }

    return result
  }

  // Stratégie 1: Détecter les ranges par patterns typiques
  private static parseByPatternDetection(lines: string[]): RangeManagerData[] {
    const ranges: RangeManagerData[] = []
    let currentRange: Partial<RangeManagerData> = {}
    let currentHands: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const nextLine = i < lines.length - 1 ? lines[i + 1] : ''

      // Détecter un nouveau titre de range
      if (this.isPotentialRangeTitle(line, nextLine)) {
        // Sauvegarder la range précédente
        if (currentRange.name && currentHands.length > 0) {
          ranges.push({
            name: currentRange.name,
            hands: [...new Set(currentHands)].sort(),
            ...(currentRange.notes && { notes: currentRange.notes })
          })
        }

        // Commencer une nouvelle range
        currentRange = { name: line }
        currentHands = []
        continue
      }

      // Collecter les mains
      const lineHands = this.parseHands(line)
      if (lineHands.length > 0) {
        currentHands.push(...lineHands)
      }
    }

    // Ajouter la dernière range
    if (currentRange.name && currentHands.length > 0) {
      ranges.push({
        name: currentRange.name,
        hands: [...new Set(currentHands)].sort(),
        ...(currentRange.notes && { notes: currentRange.notes })
      })
    }

    return ranges
  }

  // Stratégie 2: Parser par blocs de mains séparés
  private static parseByHandBlocks(content: string): RangeManagerData[] {
    const ranges: RangeManagerData[] = []
    
    // Diviser le contenu par double saut de ligne ou lignes vides multiples
    const blocks = content.split(/\n\s*\n/).filter(block => block.trim().length > 0)
    
    if (blocks.length <= 1) return []

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim()
      const blockLines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      
      if (blockLines.length === 0) continue

      const allHands: string[] = []
      let potentialName = ''

      // Chercher les mains dans ce bloc
      for (const line of blockLines) {
        const lineHands = this.parseHands(line)
        if (lineHands.length > 0) {
          allHands.push(...lineHands)
        } else if (line.length < 100 && !potentialName) {
          potentialName = line
        }
      }

      if (allHands.length > 0) {
        ranges.push({
          name: potentialName || `Range ${i + 1}`,
          hands: [...new Set(allHands)].sort()
        })
      }
    }

    return ranges
  }

  // Stratégie 3: Parsing amélioré ligne par ligne
  private static parseWithImprovedLineDetection(lines: string[]): RangeManagerData[] {
    const ranges: RangeManagerData[] = []
    let currentRange: Partial<RangeManagerData> = {}
    let currentHands: string[] = []
    let handsSinceLastTitle = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineHands = this.parseHands(line)

      if (lineHands.length > 0) {
        currentHands.push(...lineHands)
        handsSinceLastTitle += lineHands.length
      } else {
        // Ligne sans mains - potentiel titre
        const isTitle = this.isLikelyTitle(line, currentHands.length, handsSinceLastTitle)
        
        if (isTitle && currentRange.name && currentHands.length > 0) {
          // Sauvegarder la range actuelle
          ranges.push({
            name: currentRange.name,
            hands: [...new Set(currentHands)].sort()
          })
          
          // Commencer une nouvelle range
          currentRange = { name: line }
          currentHands = []
          handsSinceLastTitle = 0
        } else if (!currentRange.name) {
          // Premier titre potentiel
          currentRange = { name: line }
        }
      }
    }

    // Ajouter la dernière range
    if (currentRange.name && currentHands.length > 0) {
      ranges.push({
        name: currentRange.name,
        hands: [...new Set(currentHands)].sort()
      })
    }

    return ranges
  }

  // Améliorer la détection des titres potentiels
  private static isPotentialRangeTitle(line: string, nextLine: string): boolean {
    // Ligne courte suivie d'une ligne avec des mains
    if (line.length < 80 && nextLine) {
      const nextLineHands = this.parseHands(nextLine)
      if (nextLineHands.length > 0) return true
    }

    // Patterns classiques de titres
    const titlePatterns = [
      /^(UTG|EP|MP|CO|BTN|SB|BB|LJ|HJ)/i,
      /^(Open|Call|3bet|4bet|Fold|Raise|Check)/i,
      /^(Range|Hand|Combo)/i,
      /^\d+\.\s*/,
      /^[A-Z][A-Za-z\s]*:?\s*$/,
      /vs\s+(UTG|EP|MP|CO|BTN|SB|BB)/i
    ]

    return titlePatterns.some(pattern => pattern.test(line)) && !this.isHandsLine(line)
  }

  // Détecter si une ligne est probablement un titre
  private static isLikelyTitle(line: string, currentHandsCount: number, handsSinceLastTitle: number): boolean {
    // Si on a déjà collecté des mains et qu'on trouve une ligne courte
    if (currentHandsCount > 0 && handsSinceLastTitle > 5 && line.length < 80) {
      return !this.isHandsLine(line)
    }

    return false
  }

  // Parser le format JSON de Range Manager
  private static parseRangeManagerJSON(content: string): RangeManagerImportResult {
    const result: RangeManagerImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      ranges: [],
      folders: []
    }

    try {
      const jsonData = JSON.parse(content)
      
      if (!jsonData.categories) {
        throw new Error('Format JSON invalide - pas de propriété "categories"')
      }

      // Parser la structure hiérarchique depuis la racine
      const rootCategory = jsonData.categories.root
      
      if (rootCategory && rootCategory.children) {
        for (const childId of rootCategory.children) {
          const parsed = this.parseCategory(childId, jsonData.categories, 0)
          
          if (parsed) {
            if ((parsed as any).type === 'folder') {
              result.folders.push(parsed as RangeManagerFolder)
              // Compter les ranges dans le dossier
              const rangeCount = this.countRangesInFolder(parsed as RangeManagerFolder)
              result.success += rangeCount
            } else {
              result.ranges.push(parsed as RangeManagerData)
              result.success++
            }
          }
        }
      }


      if (result.ranges.length === 0 && result.folders.length === 0) {
        result.errors.push('Aucune range ou dossier trouvé dans le fichier JSON Range Manager')
        result.failed = 1
      }

    } catch (error) {
      // Ce n'est pas un JSON valide ou pas le bon format
      // On retourne un résultat vide pour que le parser texte prenne le relais
      return {
        success: 0,
        failed: 0,
        errors: [],
        ranges: [],
        folders: []
      }
    }

    return result
  }

  // Parser une catégorie récursivement
  private static parseCategory(categoryId: string, categories: any, depth: number = 0): RangeManagerFolder | RangeManagerData | null {
    if (depth > 10) {
      console.error('Max recursion depth reached for category:', categoryId)
      return null
    }
    const category = categories[categoryId]
    if (!category) {
      return null
    }

    // Si c'est une catégorie avec des enfants (dossier)
    if (category.children && Array.isArray(category.children)) {
      const folder: RangeManagerFolder = {
        name: category.name || 'Dossier sans nom',
        type: 'folder',
        children: []
      }

      for (const childId of category.children) {
        try {
          const childParsed = this.parseCategory(childId, categories, depth + 1)
          if (childParsed) {
            folder.children.push(childParsed)
          }
        } catch (error) {
          console.error('Error parsing child:', childId, error)
        }
      }

      return folder
    }
    
    // Si c'est une catégorie avec des onglets (contient des ranges)
    else if (category.tabList && category.tabs) {
      const folder: RangeManagerFolder = {
        name: category.name || 'Catégorie sans nom',
        type: 'folder',
        children: []
      }

      for (const tabId of category.tabList) {
        const tab = category.tabs[tabId]
        
        if (tab && tab.rangeList) {
          // Créer une range avec actions et mixed strategies complètes
          const actions: Array<{id: string, name: string, color: string}> = []
          const handActions: Array<{handId: string, actionId?: string, mixedColorId?: string}> = []
          const mixedColors: Array<{id: string, actions: Array<{actionId: string, percentage: number}>}> = []

          // Mapper les IDs d'actions à leurs informations
          const actionMap = new Map([
            ["c177f3ba6c0f6752f683815847a301a4", { name: "OPEN", color: "#6666ff" }],
            ["000r", { name: "CALL", color: "#4CAF50" }],
            ["8cf904d5d5e21ec3bef6260df3c9dbfb", { name: "RAISE", color: "#FF9800" }],
            // Ignore FOLD: "1ecb745db61f02a1866b24e2858d1158"
          ])

          let mixedColorIdCounter = Date.now()

          for (const range of tab.rangeList) {
            // Filtrer les actions FOLD - l'ID "1ecb745db61f02a1866b24e2858d1158" correspond aux FOLD
            if (range.id === "1ecb745db61f02a1866b24e2858d1158") {
              // Ignorer les actions FOLD
              continue
            }

            const actionInfo = actionMap.get(range.id)
            if (!actionInfo) continue

            // Ajouter l'action si elle n'existe pas déjà
            if (!actions.find(a => a.id === range.id)) {
              actions.push({
                id: range.id,
                name: actionInfo.name,
                color: actionInfo.color
              })
            }
            
            if (range.hands && Array.isArray(range.hands)) {
              for (const handStr of range.hands) {
                const [hand, probabilityStr] = handStr.split(':')
                const normalizedHand = this.normalizeHand(hand)
                
                if (!normalizedHand) continue

                if (probabilityStr) {
                  // C'est une stratégie mixte
                  const probability = parseFloat(probabilityStr)
                  if (probability > 0 && probability < 1) {
                    const mixedColorId = `mixed-${mixedColorIdCounter++}`
                    const percentage = Math.round(probability * 100)
                    
                    handActions.push({
                      handId: normalizedHand,
                      mixedColorId: mixedColorId
                    })

                    mixedColors.push({
                      id: mixedColorId,
                      actions: [{
                        actionId: range.id,
                        percentage: percentage
                      }]
                    })
                  } else if (probability === 1) {
                    // 100% = action pure
                    handActions.push({
                      handId: normalizedHand,
                      actionId: range.id
                    })
                  }
                  // Si probability === 0, on ignore (pas joué)
                } else {
                  // Pas de probabilité = action pure
                  handActions.push({
                    handId: normalizedHand,
                    actionId: range.id
                  })
                }
              }
            }
          }

          if (actions.length > 0 && handActions.length > 0) {
            const rangeData: any = {
              name: tab.name || 'Range sans nom',
              hands: handActions.map(ha => ha.handId), // Pour le format legacy
              notes: `Importé depuis ${category.name} - Range Manager avec actions complètes`,
              editorData: {
                title: tab.name || 'Range sans nom',
                actions: actions,
                handActions: handActions,
                mixedColors: mixedColors
              }
            }
            folder.children.push(rangeData)
          }
        }
      }

      return folder.children.length > 0 ? folder : null
    }

    return null
  }

  // Compter les ranges dans un dossier récursivement
  private static countRangesInFolder(folder: RangeManagerFolder): number {
    let count = 0
    for (const child of folder.children) {
      if ((child as any).type === 'folder') {
        count += this.countRangesInFolder(child as RangeManagerFolder)
      } else {
        count++
      }
    }
    return count
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