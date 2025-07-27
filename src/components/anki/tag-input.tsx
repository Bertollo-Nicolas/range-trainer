'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import { TagService, TagSuggestion } from '@/lib/services/tag-service'

interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
  className?: string
}

export function TagInput({ tags, onTagsChange, placeholder = "Ajouter un tag...", className }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Charger les suggestions quand l'input change
  useEffect(() => {
    const loadSuggestions = async () => {
      if (inputValue.trim().length === 0) {
        // Charger les tags populaires quand l'input est vide
        const popularTags = await TagService.getPopularTags(8)
        setSuggestions(popularTags.filter(tag => !tags.includes(tag.name)))
      } else {
        // Chercher des suggestions basées sur l'input
        const searchSuggestions = await TagService.getTagSuggestions(inputValue, 6)
        setSuggestions(searchSuggestions.filter(tag => 
          !tags.includes(tag.name) && 
          tag.name.toLowerCase() !== inputValue.toLowerCase()
        ))
      }
    }

    const debounce = setTimeout(loadSuggestions, 200)
    return () => clearTimeout(debounce)
  }, [inputValue, tags])

  const addTag = async (tagName: string) => {
    const trimmedTag = tagName.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag])
      
      // Incrémenter l'usage du tag en arrière-plan
      TagService.incrementTagUsage(trimmedTag)
    }
    setInputValue('')
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        addTag(suggestions[selectedSuggestionIndex].name)
      } else if (inputValue.trim()) {
        addTag(inputValue.trim())
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  const handleInputFocus = () => {
    setShowSuggestions(true)
  }

  const handleInputBlur = () => {
    // Délai pour permettre le clic sur les suggestions
    setTimeout(() => {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }, 200)
  }

  return (
    <div className={className}>
      {/* Tags existants */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Input avec suggestions */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => addTag(inputValue)}
            disabled={!inputValue.trim() || tags.includes(inputValue.trim())}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            <div className="p-2">
              <div className="text-xs text-muted-foreground mb-2">
                {inputValue ? 'Suggestions:' : 'Tags populaires:'}
              </div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    index === selectedSuggestionIndex 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => addTag(suggestion.name)}
                >
                  <span className="font-medium">{suggestion.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {suggestion.usage_count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-muted-foreground mt-1">
        Tapez pour ajouter un tag • Entrée pour valider • ↑↓ pour naviguer • Cliquez sur ✕ pour supprimer
      </div>
    </div>
  )
}