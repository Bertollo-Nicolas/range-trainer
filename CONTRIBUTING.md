# Contributing to Range Trainer

Thank you for your interest in contributing to Range Trainer! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher
- Git
- A Supabase account (for database testing)

### Setting up your development environment

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/range-trainer.git
   cd range-trainer
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```

## 🎯 How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Use the bug report template** when creating new issues
3. **Provide clear steps to reproduce** the issue
4. **Include relevant environment information** (OS, browser, Node.js version)

### Suggesting Features

1. **Check existing feature requests** to avoid duplicates
2. **Use the feature request template**
3. **Clearly describe the problem** you're trying to solve
4. **Provide examples** of how the feature would be used

### Code Contributions

#### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/improvements

#### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(range-editor): add mixed color support
fix(anki): resolve card scheduling algorithm issue
docs: update contributing guidelines
refactor(types): improve TypeScript definitions
```

## 📋 Code Standards

### TypeScript

- **No `any` types** - Use proper type definitions
- **Strict mode enabled** - Follow strict TypeScript rules
- **Export types explicitly** - Make interfaces and types reusable
- **Use JSDoc comments** for complex functions

```typescript
/**
 * Calculates the next review date using SM-2 algorithm
 * @param easeFactor - Current ease factor for the card
 * @param interval - Current interval in days
 * @param quality - Quality rating (0-5)
 * @returns Next review date and updated parameters
 */
export function calculateNextReview(
  easeFactor: number,
  interval: number,
  quality: number
): ReviewResult {
  // Implementation...
}
```

### React Components

- **Use functional components** with hooks
- **Keep components small** and focused on a single responsibility
- **Extract custom hooks** for complex logic
- **Use proper prop types** with TypeScript interfaces

```typescript
interface CardProps {
  card: AnkiCard
  onEdit: (card: AnkiCard) => void
  onDelete: (cardId: string) => void
  isSelected?: boolean
}

export function Card({ card, onEdit, onDelete, isSelected = false }: CardProps) {
  // Component implementation...
}
```

### File Organization

- **Group related files** in appropriate directories
- **Use index files** to create clean import paths
- **Keep file names descriptive** and consistent
- **Separate concerns** (components, hooks, utils, types)

### Styling

- **Use Tailwind CSS** for styling
- **Follow the existing design system** (colors, spacing, typography)
- **Prefer composition** over custom CSS when possible
- **Use CSS variables** for theme-related values

### Logging

- **Use the logger utility** instead of console.log
- **Provide context** for debugging
- **Use appropriate log levels** (debug, info, warn, error)

```typescript
import { logger } from '@/utils/logger'

// Instead of console.log
logger.info('Card generated successfully', { cardId: card.id, deckId: deck.id })

// Instead of console.error
logger.error('Failed to save card', error, 'CardService')
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Writing Tests

- **Test behavior, not implementation**
- **Use descriptive test names**
- **Follow the AAA pattern** (Arrange, Act, Assert)
- **Mock external dependencies**

```typescript
describe('calculateNextReview', () => {
  it('should increase interval for high quality ratings', () => {
    // Arrange
    const easeFactor = 2.5
    const interval = 1
    const quality = 5

    // Act
    const result = calculateNextReview(easeFactor, interval, quality)

    // Assert
    expect(result.interval).toBeGreaterThan(interval)
    expect(result.easeFactor).toBeGreaterThanOrEqual(easeFactor)
  })
})
```

## 🔍 Code Review Process

### Before Submitting a PR

1. **Run all checks locally**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   pnpm build
   ```

2. **Update documentation** if needed
3. **Add tests** for new functionality
4. **Ensure mobile responsiveness** if UI changes are involved

### PR Requirements

- **Clear description** of changes
- **Link to related issues**
- **Screenshots** for UI changes
- **All checks passing** (CI/CD)
- **No merge conflicts**

### Review Criteria

- Code follows established patterns
- TypeScript types are properly defined
- Tests cover new functionality
- Documentation is updated
- Performance considerations are addressed
- Accessibility guidelines are followed

## 🌐 Internationalization

- All user-facing text should be in English
- Code comments and documentation in English
- Variable and function names in English
- Consider internationalization for future releases

## 📱 Mobile Considerations

- Test on mobile devices (landscape orientation)
- Ensure touch-friendly interactions
- Consider performance on lower-end devices
- Maintain responsive design principles

## 🚫 What Not to Contribute

- Broken or incomplete features
- Code that doesn't follow our style guide
- Features without proper TypeScript types
- Changes that break existing functionality
- Code with security vulnerabilities

## 📞 Getting Help

- **Discord**: [Join our community](https://discord.gg/range-trainer)
- **GitHub Discussions**: For general questions
- **GitHub Issues**: For bug reports and feature requests
- **Email**: contributors@range-trainer.com

## 🏆 Recognition

Contributors will be recognized in:
- README.md acknowledgments
- Release notes for significant contributions
- GitHub contributor graphs
- Our Discord community

Thank you for contributing to Range Trainer! 🃏