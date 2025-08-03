# 🧠 FSRS Anki System - Documentation

## Vue d'ensemble

Le système FSRS (Free Spaced Repetition Scheduler) est une implémentation complète de l'algorithme de répétition espacée moderne qui remplace l'ancien algorithme SM-2. Il offre des performances supérieures grâce à une modélisation plus précise de la mémoire humaine.

## 🏗️ Architecture

### Modules principaux

- **`AnkiEngine`** - API principale et point d'entrée
- **`ReviewEngine`** - Gestion des sessions et révisions
- **`FSRSService`** - Wrapper autour de ts-fsrs
- **`StorageAdapter`** - Persistance avec Supabase
- **`card-model.ts`** - Types et interfaces

### Flux de données

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ AnkiEngine  │───▶│ ReviewEngine │───▶│ FSRSService │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ React Hook  │    │ StorageAdapter│    │   ts-fsrs   │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐    ┌──────────────┐
│ UI Component│    │   Supabase   │
└─────────────┘    └──────────────┘
```

## 🚀 Utilisation

### 1. Initialisation

```typescript
import { createAnkiEngine, Grade } from '@/lib/anki'

// Créer une instance du moteur
const engine = createAnkiEngine({
  newCardsPerDay: 20,
  maxReviewsPerDay: 200,
  requestRetention: 0.9
})
```

### 2. Gestion des cartes

```typescript
// Créer une carte
const card = await engine.createCard({
  deckId: 'deck-uuid',
  front: 'Qu\'est-ce que FSRS ?',
  back: 'Free Spaced Repetition Scheduler',
  tags: ['algorithmie', 'mémoire']
})

// Obtenir les cartes dues
const dueCards = await engine.getDueCards('deck-uuid')

// Réviser une carte
const result = await engine.reviewCard(card.id, Grade.Good, 5000)
```

### 3. Sessions d'étude

```typescript
// Démarrer une session
const session = await engine.startStudySession('deck-uuid')

// Réviser des cartes
for (const dueCard of dueCards) {
  const grade = await getUserResponse() // Interface utilisateur
  await engine.reviewCard(dueCard.card.id, grade)
}

// Terminer la session
const completedSession = await engine.endStudySession()
```

### 4. Hook React

```typescript
import { useAnkiEngine } from '@/hooks/use-anki-engine'

function StudyComponent({ deckId }) {
  const {
    dueCards,
    currentCard,
    sessionStats,
    actions,
    loading,
    error
  } = useAnkiEngine({ deckId, autoStart: true })

  const handleReview = (grade: Grade) => {
    actions.reviewCard(grade, responseTime)
  }

  // Rendu...
}
```

## 📊 Grades FSRS

Le système utilise 4 grades standardisés :

| Grade | Valeur | Description | Intervalle typique |
|-------|--------|-------------|-------------------|
| Again | 1 | Échec total | < 1 minute |
| Hard | 2 | Difficile | < 6 minutes |
| Good | 3 | Correct | < 10 minutes |
| Easy | 4 | Facile | 4+ jours |

## 🎯 Types principaux

### FSRSCard

```typescript
interface FSRSCard {
  id: string
  deckId: string
  front: string
  back: string
  tags: string[]
  
  // État FSRS
  fsrsCard: Card         // Objet ts-fsrs
  state: State          // New, Learning, Review, Relearning
  due: Date
  lastReview?: Date
  
  // Métadonnées
  suspended: boolean
  buried: boolean
  leechCount: number
}
```

### StudySession

```typescript
interface StudySession {
  id: string
  deckId?: string
  startTime: Date
  endTime?: Date
  
  // Statistiques
  cardsReviewed: number
  newCards: number
  reviewCards: number
  
  // Performance
  againCount: number
  hardCount: number
  goodCount: number
  easyCount: number
}
```

## 🔧 Configuration

### Paramètres de deck

```typescript
interface DeckSettings {
  // Limites quotidiennes
  newCardsPerDay: number        // Défaut: 20
  maxReviewsPerDay: number      // Défaut: 200
  
  // Paramètres FSRS
  requestRetention: number      // 0.9 (90% de rétention)
  maximumInterval: number       // 36500 jours (100 ans)
  
  // Apprentissage
  learningSteps: number[]       // [1, 10] minutes
  graduatingInterval: number    // 1 jour
  easyInterval: number          // 4 jours
  
  // Réapprentissage
  lapseSteps: number[]          // [10] minutes
  leechThreshold: number        // 8 échecs
}
```

## 🛡️ Gestion d'erreurs

Le système utilise des erreurs typées pour une gestion robuste :

```typescript
import { 
  CardNotFoundError, 
  SessionActiveError, 
  CardSuspendedError 
} from '@/lib/anki/errors'

try {
  await engine.reviewCard(cardId, Grade.Good)
} catch (error) {
  if (error instanceof CardNotFoundError) {
    console.log('Carte introuvable')
  } else if (error instanceof CardSuspendedError) {
    console.log('Carte suspendue')
  }
}
```

## 📈 Statistiques et analyse

### Statistiques de carte

```typescript
const stats = await fsrsService.calculateCardStats(card, reviews)
// Retourne: difficulté, stabilité, rétention, etc.
```

### Statistiques de deck

```typescript
const deckStats = await engine.getDeckStats(deckId)
// Retourne: total, dues, nouvelles, distribution
```

### Prédictions de charge

```typescript
const workload = await engine.predictWorkload(deckId, 30)
// Prévision pour les 30 prochains jours
```

## 🚦 Migration depuis l'ancien système

1. **Base de données** : Appliquer `20250102_anki_fsrs_clean.sql`
2. **Code** : Remplacer `useAnkiCards` par `useAnkiEngine`
3. **Composants** : Utiliser `FSRSStudySession`
4. **Service** : Migrer depuis `AnkiService` vers `AnkiEngine`

## 🎮 Composants UI

### FSRSStudySession

Composant complet pour les sessions d'étude avec :
- Interface de révision moderne
- Statistiques en temps réel
- Gestion automatique des sessions
- Boutons de grade colorés

```typescript
<FSRSStudySession 
  deckId={selectedDeck.id}
  onSessionEnd={handleSessionEnd}
/>
```

## 🔮 Avantages FSRS vs SM-2

| Aspect | SM-2 | FSRS |
|--------|------|------|
| **Précision** | Basique | Avancée (17 paramètres) |
| **Adaptabilité** | Statique | Dynamique |
| **Performance** | ~85% | ~90%+ de rétention |
| **Algorithme** | 1987 | 2023 (moderne) |
| **Données** | Limitées | Millions de révisions |

## 🛠️ Développement

### Tests

```bash
npm run test:anki     # Tests unitaires
npm run test:fsrs     # Tests d'intégration
```

### Build

```bash
npm run build        # Vérification TypeScript
npm run lint         # Linting ESLint
```

### Debug

Le système inclut des logs détaillés :

```typescript
// Activer les logs de debug
localStorage.setItem('debug', 'anki:*')
```

---

## 📚 Ressources

- [ts-fsrs Documentation](https://github.com/open-spaced-repetition/ts-fsrs)
- [FSRS Algorithm Paper](https://github.com/open-spaced-repetition/fsrs4anki/wiki/ABC-of-FSRS)
- [Spaced Repetition Research](https://supermemo.guru/wiki/Spaced_repetition)

**🎯 Le système FSRS est maintenant prêt pour une expérience d'apprentissage espacé de nouvelle génération !**