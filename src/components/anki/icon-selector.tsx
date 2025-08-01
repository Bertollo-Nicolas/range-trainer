'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

interface IconSelectorProps {
  selectedIcon: string
  onIconSelect: (icon: string) => void
}

// Collection d'icônes organisée par catégories
const ICON_CATEGORIES = {
  education: {
    name: '🎓 Éducation',
    icons: [
      '📚', '📖', '📝', '📄', '📰', '📋', '📊', '📈', '📉', '📌',
      '📍', '📎', '📐', '📏', '🖊️', '✏️', '🖍️', '📘', '📙', '📗',
      '📕', '📓', '📔', '📒', '📑', '🗂️', '📇', '🗃️', '🗄️', '📁'
    ]
  },
  gaming: {
    name: '🎮 Jeux & Poker',
    icons: [
      '🎮', '🃏', '🎴', '🎲', '🎯', '🎪', '🎨', '🎭', '🎬', '🎤',
      '🎵', '🎶', '🎸', '🎹', '🥁', '🎺', '🎻', '🪕', '🎼', '🎧',
      '🎦', '📽️', '🎰', '♠️', '♥️', '♦️', '♣️', '🔥', '💎', '👑'
    ]
  },
  science: {
    name: '🔬 Science',
    icons: [
      '🔬', '🧪', '⚗️', '🧬', '💊', '🩺', '🔭', '📡', '🛰️', '⚡',
      '🔋', '💡', '🔌', '🧲', '⚙️', '🔧', '🔨', '🛠️', '⚖️', '🌡️',
      '🧯', '🔫', '💣', '🏹', '⚔️', '🛡️', '🚀', '🛸', '⭐', '🌟'
    ]
  },
  nature: {
    name: '🌿 Nature',
    icons: [
      '🌱', '🌿', '☘️', '🍀', '🌾', '🌵', '🌴', '🌳', '🌲', '🌺',
      '🌸', '🌼', '🌻', '🌷', '🌹', '🥀', '🌊', '💧', '❄️', '⛄',
      '🌈', '☀️', '🌤️', '⛅', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '☁️'
    ]
  },
  animals: {
    name: '🐾 Animaux',
    icons: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣',
      '🐥', '🦆', '🦉', '🦅', '🦋', '🐛', '🐝', '🐞', '🦗', '🕷️'
    ]
  },
  food: {
    name: '🍎 Nourriture',
    icons: [
      '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
      '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥒', '🥬',
      '🥕', '🌽', '🌶️', '🫑', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨'
    ]
  },
  transport: {
    name: '🚗 Transport',
    icons: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🚁', '✈️',
      '🛩️', '🚀', '🛸', '🚢', '⛵', '🚤', '⛴️', '🛥️', '🚂', '🚇'
    ]
  },
  objects: {
    name: '📱 Objets',
    icons: [
      '📱', '💻', '🖥️', '⌨️', '🖱️', '🖨️', '📞', '☎️', '📟', '📠',
      '📺', '📻', '🔊', '📢', '📣', '📯', '🔔', '🔕', '🎵', '🎶',
      '⏰', '⏲️', '⏱️', '⏳', '⌛', '📅', '📆', '🗓️', '📇', '🗃️'
    ]
  },
  symbols: {
    name: '⚡ Symboles',
    icons: [
      '⚡', '🔥', '💎', '👑', '💰', '💳', '💸', '💵', '💴', '💶',
      '💷', '🪙', '💲', '🔱', '⚜️', '🔰', '⭐', '🌟', '✨', '💫',
      '⭕', '❌', '⚠️', '🚫', '✅', '☑️', '✔️', '❎', '➕', '➖'
    ]
  },
  flags: {
    name: '🏁 Drapeaux',
    icons: [
      '🏁', '🏳️', '🏴', '🏳️‍🌈', '🏳️‍⚧️', '🇫🇷', '🇺🇸', '🇬🇧', '🇩🇪', '🇪🇸',
      '🇮🇹', '🇯🇵', '🇨🇳', '🇰🇷', '🇷🇺', '🇧🇷', '🇨🇦', '🇦🇺', '🇮🇳', '🇲🇽',
      '🇳🇱', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇨🇭', '🇦🇹', '🇵🇱', '🇵🇹', '🇧🇪'
    ]
  }
}

export function IconSelector({ selectedIcon, onIconSelect }: IconSelectorProps) {
  const [activeTab, setActiveTab] = useState('education')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrer les icônes selon la recherche
  const getFilteredIcons = () => {
    if (!searchTerm) {
      return ICON_CATEGORIES[activeTab as keyof typeof ICON_CATEGORIES]?.icons || []
    }
    
    // Recherche dans toutes les catégories
    const allIcons: string[] = []
    Object.values(ICON_CATEGORIES).forEach(category => {
      allIcons.push(...category.icons)
    })
    
    return allIcons.filter(icon => 
      icon.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const filteredIcons = getFilteredIcons()

  return (
    <div className="space-y-3">
      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Rechercher une icône..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs des catégories */}
      {!searchTerm && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(ICON_CATEGORIES).map(([key, category]) => (
            <Button
              key={key}
              type="button"
              variant={activeTab === key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(key)}
              className="text-xs h-8"
            >
              {category.name}
            </Button>
          ))}
        </div>
      )}

      {/* Résultats de recherche */}
      {searchTerm && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">
            {filteredIcons.length} résultat{filteredIcons.length > 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Grille d'icônes */}
      <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto border rounded-lg p-2">
        {filteredIcons.map((icon) => (
          <Button
            key={icon}
            type="button"
            variant={selectedIcon === icon ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0 text-base hover:scale-110 transition-transform"
            onClick={() => onIconSelect(icon)}
            title={icon}
          >
            {icon}
          </Button>
        ))}
      </div>

      {filteredIcons.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-4xl mb-2">🔍</div>
          <div>Aucune icône trouvée</div>
        </div>
      )}

      {/* Icône personnalisée */}
      <div className="border-t pt-3">
        <div className="text-sm font-medium mb-2">Ou saisir une icône personnalisée :</div>
        <Input
          placeholder="Ex: 🎯"
          value={selectedIcon}
          onChange={(e) => onIconSelect(e.target.value)}
          className="text-center text-xl h-12"
          maxLength={4}
        />
      </div>
    </div>
  )
}