# Architecture Overview

This document provides a high-level overview of the Range Trainer application architecture.

## System Architecture

Range Trainer is built as a modern web application using the following architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Supabase)    │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ - React 19      │    │ - Auth          │    │ - Tables        │
│ - TypeScript    │    │ - API           │    │ - Functions     │
│ - Tailwind CSS  │    │ - Storage       │    │ - Triggers      │
│ - shadcn/ui     │    │ - Real-time     │    │ - Migrations    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (routes)/          # Route groups
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout component
├── components/            # React components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── range-editor/     # Range editing components
│   ├── anki/             # Anki system components
│   └── scenario/         # Scenario training components
├── lib/                  # Core utilities and services
│   ├── services/         # Business logic services
│   ├── database/         # Database schemas and migrations
│   ├── supabase.ts      # Supabase client configuration
│   └── utils.ts         # Shared utilities
├── types/               # TypeScript type definitions
├── hooks/              # Custom React hooks
└── utils/              # Utility functions
```

## Core Modules

### 1. Range Editor (`/range-editor`)
- **Purpose**: Visual poker range editing with advanced features
- **Key Components**:
  - `RangeTable`: 13x13 poker hand grid
  - `ActionPanel`: Action definition and color management
  - `MixedColorManager`: Percentage-based strategy support
- **Technologies**: React DnD, HTML5 Canvas

### 2. Scenario Training (`/trainer`)
- **Purpose**: Interactive poker scenario practice
- **Key Components**:
  - `ScenarioBuilder`: Visual scenario creation
  - `PracticeSession`: Real-time decision practice
  - `PerformanceTracker`: Progress analytics
- **Technologies**: React Flow, Chart.js

### 3. Anki System (`/anki`)
- **Purpose**: Spaced repetition learning system
- **Key Components**:
  - `CardManager`: CRUD operations for cards
  - `StudySession`: Review session interface
  - `SM2Algorithm`: Spaced repetition scheduling
- **Technologies**: Custom algorithm implementation

### 4. Analytics (`/stats`)
- **Purpose**: Performance tracking and statistics
- **Key Components**:
  - `SessionHistory`: Historical data view
  - `ProgressCharts`: Visual progress indicators
  - `Heatmap`: Activity visualization
- **Technologies**: Recharts, D3.js

## Data Flow

### 1. Client-Side State Management
```typescript
// Global state using React Context
const AppContext = createContext<AppState>()

// Local component state using hooks
const [cards, setCards] = useState<AnkiCard[]>([])

// Server state using custom hooks
const { data, loading, error } = useAnkiCards()
```

### 2. API Layer
```typescript
// Service layer for data operations
class AnkiService {
  static async getCards(deckId: string): Promise<AnkiCard[]>
  static async createCard(card: AnkiCardInsert): Promise<AnkiCard>
  static async updateCard(id: string, updates: Partial<AnkiCard>): Promise<void>
}
```

### 3. Database Layer
```sql
-- Example table structure
CREATE TABLE anki_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES anki_decks(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Key Design Patterns

### 1. Component Composition
```typescript
// Composable UI components
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

### 2. Custom Hooks
```typescript
// Encapsulated business logic
export function useAnkiCards(deckId?: string) {
  const [cards, setCards] = useState<AnkiCard[]>([])
  const [loading, setLoading] = useState(true)
  
  const actions = useMemo(() => ({
    loadCards: async () => { /* ... */ },
    createCard: async (card: AnkiCardInsert) => { /* ... */ },
    updateCard: async (id: string, updates: Partial<AnkiCard>) => { /* ... */ }
  }), [])
  
  return { cards, loading, actions }
}
```

### 3. Service Layer
```typescript
// Centralized business logic
export class ScenarioService {
  static async loadScenario(id: string): Promise<Scenario> {
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }
}
```

## Performance Considerations

### 1. Code Splitting
```typescript
// Lazy loading for large components
const RangeEditor = lazy(() => import('@/components/range-editor/core-editor'))

// Route-level splitting with Next.js
export default function RangePage() {
  return <RangeEditor />
}
```

### 2. Memoization
```typescript
// Expensive calculations
const expensiveValue = useMemo(() => {
  return calculateComplexValue(props.data)
}, [props.data])

// Component memoization
export const ExpensiveComponent = memo(({ data }) => {
  return <ComplexVisualization data={data} />
})
```

### 3. Virtual Scrolling
```typescript
// Large lists optimization
<VirtualizedList
  items={largeDataSet}
  itemHeight={50}
  renderItem={({ item, index }) => <ListItem data={item} />}
/>
```

## Security

### 1. Row Level Security (RLS)
```sql
-- Database-level security
ALTER TABLE anki_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own cards"
ON anki_cards FOR ALL
TO authenticated
USING (auth.uid() = user_id);
```

### 2. Type Safety
```typescript
// Strict TypeScript configuration
interface AnkiCard {
  id: string
  front: string
  back: string
  tags: string[]
  createdAt: Date
}

// No 'any' types allowed
function processCard(card: AnkiCard): ProcessedCard {
  return {
    id: card.id,
    content: `${card.front} / ${card.back}`
  }
}
```

### 3. Input Validation
```typescript
// Runtime validation
import { z } from 'zod'

const CardSchema = z.object({
  front: z.string().min(1).max(1000),
  back: z.string().min(1).max(1000),
  tags: z.array(z.string()).max(10)
})

export function validateCard(data: unknown): AnkiCard {
  return CardSchema.parse(data)
}
```

## Testing Strategy

### 1. Unit Tests
```typescript
// Component testing
import { render, screen } from '@testing-library/react'
import { AnkiCard } from '@/components/anki/anki-card'

test('renders card content', () => {
  render(<AnkiCard front="Question" back="Answer" />)
  expect(screen.getByText('Question')).toBeInTheDocument()
})
```

### 2. Integration Tests
```typescript
// Service testing
import { AnkiService } from '@/lib/services/anki-service'

test('creates and retrieves card', async () => {
  const card = await AnkiService.createCard({
    front: 'Test question',
    back: 'Test answer'
  })
  
  const retrieved = await AnkiService.getCard(card.id)
  expect(retrieved.front).toBe('Test question')
})
```

## Deployment

### 1. Build Process
```bash
# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### 2. Environment Configuration
```typescript
// Environment variables
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!
  }
}
```

### 3. CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - run: npm run type-check
      - uses: vercel/action@v1
```

## Monitoring

### 1. Logging
```typescript
// Structured logging
import { logger } from '@/utils/logger'

logger.info('Card created successfully', {
  cardId: card.id,
  deckId: deck.id,
  userId: user.id
})
```

### 2. Error Tracking
```typescript
// Error boundaries
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }
}
```

### 3. Performance Monitoring
```typescript
// Performance tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)
```

## Future Considerations

1. **Microservices**: Split large services into smaller, focused services
2. **GraphQL**: Consider GraphQL for more efficient data fetching
3. **PWA**: Add Progressive Web App capabilities for offline usage
4. **Real-time Features**: Implement real-time collaboration features
5. **Mobile App**: Consider React Native for mobile applications