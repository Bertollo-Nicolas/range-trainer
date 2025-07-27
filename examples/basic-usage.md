# Basic Usage Examples

This document provides practical examples for using Range Trainer components and services.

## Range Editor

### Creating a Basic Range

```typescript
import { RangeEditor } from '@/components/range-editor/core-editor'
import { Action, HandAction } from '@/types/range-editor'

// Define actions
const actions: Action[] = [
  { id: 'fold', name: 'Fold', color: '#dc2626', isActive: true },
  { id: 'call', name: 'Call', color: '#2563eb', isActive: true },
  { id: 'raise', name: 'Raise', color: '#16a34a', isActive: true }
]

// Define hand actions
const handActions: HandAction[] = [
  { handId: 'AA', actionId: 'raise' },
  { handId: 'KK', actionId: 'raise' },
  { handId: 'QQ', actionId: 'raise' },
  { handId: 'AKs', actionId: 'raise' },
  { handId: 'AQs', actionId: 'call' }
]

function MyRangeEditor() {
  return (
    <RangeEditor
      handActions={handActions}
      actions={actions}
      onHandActionsChange={(newHandActions) => {
        console.log('Range updated:', newHandActions)
      }}
    />
  )
}
```

### Mixed Color Strategies

```typescript
import { MixedColor } from '@/types/range-editor'

// Create mixed color for balanced strategy
const mixedColors: MixedColor[] = [
  {
    id: 'mixed-1',
    name: 'Balanced 3bet/Call',
    actions: [
      { actionId: 'call', percentage: 70 },
      { actionId: 'raise', percentage: 30 }
      // Remaining 0% = fold
    ]
  }
]

// Apply mixed color to hands
const mixedHandActions: HandAction[] = [
  { handId: 'AJs', mixedColorId: 'mixed-1' },
  { handId: 'ATs', mixedColorId: 'mixed-1' },
  { handId: 'KQs', mixedColorId: 'mixed-1' }
]
```

## Anki System

### Basic Card Management

```typescript
import { useAnkiCards } from '@/hooks/use-anki-cards'
import { AnkiCardInsert } from '@/types/anki'

function AnkiCardManager({ deckId }: { deckId: string }) {
  const { cards, loading, actions } = useAnkiCards()

  const handleCreateCard = async () => {
    const cardData: AnkiCardInsert = {
      deck_id: deckId,
      front: "What is a continuation bet?",
      back: "A bet made by the preflop aggressor on the flop",
      tags: ["cbetting", "postflop"]
    }

    try {
      await actions.createCard(cardData)
      console.log('Card created successfully')
    } catch (error) {
      console.error('Failed to create card:', error)
    }
  }

  const handleReviewCard = async (cardId: string, quality: number) => {
    try {
      await actions.reviewCard(cardId, quality)
      console.log('Card reviewed successfully')
    } catch (error) {
      console.error('Failed to review card:', error)
    }
  }

  if (loading) return <div>Loading cards...</div>

  return (
    <div>
      <button onClick={handleCreateCard}>Create Card</button>
      {cards.map(card => (
        <div key={card.id}>
          <h3>{card.front}</h3>
          <p>{card.back}</p>
          <div>
            {[1, 2, 3, 4, 5].map(quality => (
              <button 
                key={quality}
                onClick={() => handleReviewCard(card.id, quality)}
              >
                {quality}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Custom Study Session

```typescript
import { StudySession } from '@/components/anki/study-session'
import { AnkiCard } from '@/types/anki'

function CustomStudySession({ cards }: { cards: AnkiCard[] }) {
  const handleCardReview = async (cardId: string, quality: number) => {
    // Handle card review logic
    console.log(`Reviewed card ${cardId} with quality ${quality}`)
  }

  const handleSessionEnd = () => {
    console.log('Study session completed')
  }

  return (
    <StudySession
      cards={cards}
      onReviewCard={handleCardReview}
      onEndSession={handleSessionEnd}
    />
  )
}
```

## Scenario Training

### Creating a Basic Scenario

```typescript
import { ScenarioBuilder } from '@/components/scenario/ScenarioBuilderV3'
import { ScenarioNode } from '@/types/scenario'

function MyScenarioBuilder() {
  const [nodes, setNodes] = useState<ScenarioNode[]>([
    {
      id: 'node-1',
      position: 'UTG',
      action: 'open',
      sizing: '2.5'
    },
    {
      id: 'node-2',
      position: 'BTN',
      action: '3bet',
      sizing: '9'
    }
  ])

  const handleSaveScenario = async () => {
    const scenarioData = {
      name: "UTG vs BTN 3bet",
      description: "Basic 3bet scenario",
      graph_data: {
        nodes,
        tableFormat: '6max' as const
      }
    }

    try {
      await ScenarioService.saveScenario(scenarioData)
      console.log('Scenario saved successfully')
    } catch (error) {
      console.error('Failed to save scenario:', error)
    }
  }

  return (
    <div>
      <ScenarioBuilder
        nodes={nodes}
        onNodesChange={setNodes}
        tableFormat="6max"
      />
      <button onClick={handleSaveScenario}>
        Save Scenario
      </button>
    </div>
  )
}
```

### Practice Session

```typescript
import { PracticeSession } from '@/app/trainer/practice/page'

function PracticeExample() {
  // Practice session is automatically loaded based on scenario ID
  // from URL parameters: /trainer/practice?scenario=scenario-id
  
  return (
    <div className="h-screen">
      <PracticeSession />
    </div>
  )
}
```

## Service Layer Usage

### TreeService for Range Management

```typescript
import { TreeService } from '@/lib/services/tree-service'

// Create a new range
async function createRange() {
  const rangeData = {
    name: "UTG Opening Range",
    type: "range" as const,
    data: {
      editorData: {
        handActions: [
          { handId: 'AA', actionId: 'raise' },
          { handId: 'KK', actionId: 'raise' }
        ],
        actions: [
          { id: 'raise', name: 'Raise', color: '#16a34a', isActive: true }
        ],
        mixedColors: []
      }
    }
  }

  try {
    const range = await TreeService.create(rangeData)
    console.log('Range created:', range.id)
    return range
  } catch (error) {
    console.error('Failed to create range:', error)
    throw error
  }
}

// Load existing range
async function loadRange(rangeId: string) {
  try {
    const range = await TreeService.getById(rangeId)
    console.log('Range loaded:', range.name)
    return range
  } catch (error) {
    console.error('Failed to load range:', error)
    throw error
  }
}
```

### Session Tracking

```typescript
import { SessionService } from '@/lib/services/session-service'

// Start a training session
async function startTrainingSession() {
  const sessionData = {
    type: 'scenario' as const,
    scenarioId: 'scenario-123',
    scenarioName: 'UTG vs BTN 3bet',
    startTime: new Date(),
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    accuracy: 0,
    streak: 0
  }

  try {
    const session = await SessionService.createSession(sessionData)
    console.log('Session started:', session.id)
    return session
  } catch (error) {
    console.error('Failed to start session:', error)
    throw error
  }
}

// Record a hand played
async function recordHand(sessionId: string) {
  const handData = {
    hand: 'AKs',
    card1: 'As',
    card2: 'Ks',
    position: 'UTG',
    playerAction: 'raise',
    correctAction: 'raise',
    isCorrect: true,
    responseTime: 2500,
    questionContext: {
      nodeId: 'node-123',
      pot: 3.5,
      rangeId: 'range-456'
    }
  }

  try {
    await SessionService.recordSessionHand(sessionId, handData)
    console.log('Hand recorded successfully')
  } catch (error) {
    console.error('Failed to record hand:', error)
    throw error
  }
}
```

## Custom Hooks

### Creating a Custom Range Hook

```typescript
import { useState, useEffect } from 'react'
import { TreeService } from '@/lib/services/tree-service'
import { TreeItem } from '@/types/range'

export function useRange(rangeId?: string) {
  const [range, setRange] = useState<TreeItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!rangeId) return

    const loadRange = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const data = await TreeService.getById(rangeId)
        setRange(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load range')
      } finally {
        setLoading(false)
      }
    }

    loadRange()
  }, [rangeId])

  const updateRange = async (updates: Partial<TreeItem>) => {
    if (!range) return

    try {
      await TreeService.update(range.id, updates)
      setRange(prev => prev ? { ...prev, ...updates } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update range')
      throw err
    }
  }

  return {
    range,
    loading,
    error,
    updateRange
  }
}
```

### Using the Custom Hook

```typescript
function RangeViewer({ rangeId }: { rangeId: string }) {
  const { range, loading, error, updateRange } = useRange(rangeId)

  const handleUpdateRange = async () => {
    try {
      await updateRange({
        name: 'Updated Range Name',
        description: 'Updated description'
      })
      console.log('Range updated successfully')
    } catch (error) {
      console.error('Failed to update range:', error)
    }
  }

  if (loading) return <div>Loading range...</div>
  if (error) return <div>Error: {error}</div>
  if (!range) return <div>Range not found</div>

  return (
    <div>
      <h1>{range.name}</h1>
      <p>{range.description}</p>
      <button onClick={handleUpdateRange}>
        Update Range
      </button>
    </div>
  )
}
```

## Error Handling

### Component Error Boundaries

```typescript
import { Component, ReactNode } from 'react'
import { logger } from '@/utils/logger'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Using Error Boundaries

```typescript
function App() {
  return (
    <ErrorBoundary>
      <RangeEditor />
    </ErrorBoundary>
  )
}
```

This covers the most common usage patterns for Range Trainer. For more advanced examples, check the source code in the respective component directories.