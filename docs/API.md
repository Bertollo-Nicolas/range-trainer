# API Documentation

This document describes the API structure and services used in Range Trainer.

## Service Layer Architecture

Range Trainer uses a service layer pattern to encapsulate business logic and data access. All services are located in `src/lib/services/`.

## Core Services

### AnkiService

Manages Anki cards and spaced repetition functionality.

```typescript
import { AnkiService } from '@/lib/services/anki-service'

// Get all decks for a user
const decks = await AnkiService.getDecks()

// Create a new deck
const deck = await AnkiService.createDeck({
  name: "Spanish Vocabulary",
  description: "Basic Spanish words and phrases"
})

// Get cards for a specific deck
const cards = await AnkiService.getCards(deckId)

// Create a new card
const card = await AnkiService.createCard({
  deckId: "deck-uuid",
  front: "¿Cómo estás?",
  back: "How are you?",
  tags: ["greetings", "basic"]
})

// Review a card (updates scheduling)
await AnkiService.reviewCard(cardId, {
  quality: 4, // 0-5 rating
  responseTime: 3000 // milliseconds
})
```

### ScenarioService

Handles poker scenario creation, loading, and management.

```typescript
import { ScenarioService } from '@/lib/services/scenario-service'

// Load a scenario
const scenario = await ScenarioService.loadScenario(scenarioId)

// Save a scenario
await ScenarioService.saveScenario({
  name: "UTG vs BTN 3bet",
  description: "Practice UTG vs BTN 3bet scenarios",
  graphData: {
    nodes: [...],
    tableFormat: "6max"
  }
})

// Get user's scenarios
const scenarios = await ScenarioService.getUserScenarios()
```

### TreeService

Manages range trees and poker range data.

```typescript
import { TreeService } from '@/lib/services/tree-service'

// Get range by ID
const range = await TreeService.getById(rangeId)

// Create a new range
const range = await TreeService.create({
  name: "UTG Opening Range",
  type: "range",
  data: {
    editorData: {
      handActions: [...],
      actions: [...],
      mixedColors: [...]
    }
  }
})

// Update range data
await TreeService.update(rangeId, {
  data: updatedRangeData
})

// Delete range
await TreeService.delete(rangeId)
```

### SessionService

Tracks user sessions and performance analytics.

```typescript
import { SessionService } from '@/lib/services/session-service'

// Create a training session
const session = await SessionService.createSession({
  type: "scenario",
  scenarioId: "scenario-uuid",
  scenarioName: "UTG vs BTN"
})

// Record a hand played in session
await SessionService.recordSessionHand(sessionId, {
  hand: "AKs",
  card1: "As",
  card2: "Ks",
  position: "UTG",
  playerAction: "raise",
  correctAction: "raise",
  isCorrect: true,
  responseTime: 2500
})

// Update session stats
await SessionService.updateSession(sessionId, {
  endTime: new Date(),
  totalQuestions: 25,
  correctAnswers: 22,
  accuracy: 88
})

// Get session history
const sessions = await SessionService.getUserSessions()
```

### TagService

Manages tag system for Anki cards with intelligent suggestions.

```typescript
import { TagService } from '@/lib/services/tag-service'

// Get popular tags
const popularTags = await TagService.getPopularTags(10)

// Get tag suggestions based on input
const suggestions = await TagService.getTagSuggestions("gre", 5)

// Increment tag usage
await TagService.incrementTagUsage("greetings")

// Clean up unused tags
await TagService.cleanupUnusedTags()
```

### HeatmapService

Generates activity heatmaps and statistics.

```typescript
import { HeatmapService } from '@/lib/services/heatmap-service'

// Get activity data for a date range
const data = await HeatmapService.getActivityData(startDate, endDate)

// Get session statistics
const stats = await HeatmapService.getSessionStats()
```

## Data Types

### Core Types

```typescript
// Anki Card
interface AnkiCard {
  id: string
  deckId: string
  front: string
  back: string
  tags: string[]
  cardState: 'new' | 'learning' | 'review' | 'relearning'
  dueDate: Date
  interval: number
  easeFactor: number
  reviewCount: number
  createdAt: Date
  updatedAt: Date
}

// Anki Deck
interface AnkiDeck {
  id: string
  name: string
  description?: string
  cardCount: number
  newCards: number
  dueCards: number
  newCardsPerDay: number
  reviewCardsPerDay: number
  createdAt: Date
  updatedAt: Date
}

// Scenario Node
interface ScenarioNode {
  id: string
  position: PokerPosition
  action?: PokerAction
  sizing?: string
  linkedRange?: {
    id: string
    name: string
    hands: string[]
  }
}

// Range Data
interface RangeData {
  editorData: {
    handActions: HandAction[]
    actions: Action[]
    mixedColors: MixedColor[]
  }
}

// Session Data
interface Session {
  id: string
  type: 'scenario' | 'range' | 'anki'
  scenarioId?: string
  scenarioName?: string
  startTime: Date
  endTime?: Date
  duration?: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  accuracy: number
  streak: number
}
```

### Poker-Specific Types

```typescript
type PokerPosition = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'
type PokerAction = 'fold' | 'call' | 'raise' | 'open' | '3bet' | '4bet' | 'limp'
type TableFormat = '6max' | 'HU' | '9max'

interface HandAction {
  handId: string // e.g., "AKs", "QQ", "72o"
  actionId?: string
  mixedColorId?: string
}

interface Action {
  id: string
  name: string
  color: string
  isActive: boolean
}

interface MixedColor {
  id: string
  name: string
  actions: Array<{
    actionId: string
    percentage: number
  }>
}
```

## Error Handling

All services use consistent error handling patterns:

```typescript
// Service methods throw errors that should be caught by components
try {
  const result = await AnkiService.createCard(cardData)
  // Handle success
} catch (error) {
  logger.error('Failed to create card', error, 'Component')
  // Handle error (show toast, etc.)
}

// Services return standardized error objects
class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}
```

## Database Schema

### Tables Overview

```sql
-- Anki System
anki_decks              -- User's card decks
anki_cards              -- Individual flashcards
anki_card_reviews       -- Review history

-- Range System  
tree_items              -- Range trees and scenarios
range_data              -- Range editor data

-- Session Tracking
sessions                -- Training sessions
session_hands           -- Individual hands played

-- Tag System
anki_tags               -- Tag definitions
anki_tag_usage         -- Tag usage statistics
```

### Key Relationships

```sql
-- One-to-many relationships
anki_decks -> anki_cards (deck_id)
sessions -> session_hands (session_id)
tree_items -> tree_items (parent_id) -- hierarchical

-- Many-to-many relationships
anki_cards <-> anki_tags (via tags array)
```

## Authentication

All API calls require authentication via Supabase Auth:

```typescript
// Automatic authentication header injection
const supabase = createClientComponentClient()

// All service calls automatically include user context
const { data, error } = await supabase
  .from('anki_decks')
  .select('*')
  // RLS automatically filters by authenticated user
```

## Rate Limiting

Currently no explicit rate limiting is implemented, but Supabase provides default protections:

- Connection pooling
- Query complexity limits
- Row Level Security (RLS)

## Caching

Client-side caching is handled through:

1. **React State**: Component-level caching
2. **Custom Hooks**: Service-level caching with invalidation
3. **Browser Storage**: Long-term preference storage

```typescript
// Example of cached service hook
export function useAnkiCards(deckId?: string) {
  const [cache, setCache] = useState<Map<string, AnkiCard[]>>(new Map())
  
  const loadCards = useCallback(async (id: string) => {
    if (cache.has(id)) {
      return cache.get(id)!
    }
    
    const cards = await AnkiService.getCards(id)
    setCache(prev => new Map(prev).set(id, cards))
    return cards
  }, [cache])
  
  return { loadCards }
}
```

## Real-time Features

Real-time updates are handled via Supabase subscriptions:

```typescript
// Subscribe to deck changes
useEffect(() => {
  const subscription = supabase
    .channel('deck-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'anki_decks' },
      (payload) => {
        // Handle real-time updates
        updateLocalState(payload)
      }
    )
    .subscribe()
    
  return () => subscription.unsubscribe()
}, [])
```

## Performance Considerations

1. **Pagination**: Large datasets use cursor-based pagination
2. **Selective Loading**: Only load required fields
3. **Batch Operations**: Group multiple operations when possible
4. **Connection Pooling**: Managed by Supabase
5. **Query Optimization**: Use database indexes and RLS policies

## Testing

Services are tested using a combination of:

1. **Unit Tests**: Mock database calls
2. **Integration Tests**: Use test database
3. **End-to-End Tests**: Full user flows

```typescript
// Example service test
describe('AnkiService', () => {
  test('creates card successfully', async () => {
    const cardData = {
      deckId: 'test-deck',
      front: 'Question',
      back: 'Answer'
    }
    
    const card = await AnkiService.createCard(cardData)
    
    expect(card.id).toBeDefined()
    expect(card.front).toBe('Question')
    expect(card.cardState).toBe('new')
  })
})
```