/**
 * Classes d'erreurs spécialisées pour le système FSRS
 */

export class FSRSError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FSRSError';
  }
}

export class CardNotFoundError extends FSRSError {
  constructor(cardId: string) {
    super(`Card not found: ${cardId}`, 'CARD_NOT_FOUND');
    this.name = 'CardNotFoundError';
  }
}

export class DeckNotFoundError extends FSRSError {
  constructor(deckId: string) {
    super(`Deck not found: ${deckId}`, 'DECK_NOT_FOUND');
    this.name = 'DeckNotFoundError';
  }
}

export class SessionActiveError extends FSRSError {
  constructor() {
    super('A study session is already active', 'SESSION_ACTIVE');
    this.name = 'SessionActiveError';
  }
}

export class CardSuspendedError extends FSRSError {
  constructor(cardId: string) {
    super(`Cannot operate on suspended card: ${cardId}`, 'CARD_SUSPENDED');
    this.name = 'CardSuspendedError';
  }
}

export class CardBuriedError extends FSRSError {
  constructor(cardId: string) {
    super(`Cannot operate on buried card: ${cardId}`, 'CARD_BURIED');
    this.name = 'CardBuriedError';
  }
}

export class DatabaseError extends FSRSError {
  constructor(message: string, public originalError?: Error) {
    super(`Database error: ${message}`, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends FSRSError {
  constructor(field: string, value: any) {
    super(`Invalid value for ${field}: ${value}`, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Utilitaire pour wrapper les erreurs Supabase
 */
export function wrapDatabaseError(error: any, context: string): DatabaseError {
  return new DatabaseError(`${context}: ${error.message || error}`, error);
}

/**
 * Utilitaire pour valider les grades FSRS
 */
export function validateGrade(grade: number): void {
  if (grade < 1 || grade > 4) {
    throw new ValidationError('grade', grade);
  }
}

/**
 * Utilitaire pour valider les paramètres de deck
 */
export function validateDeckSettings(settings: any): void {
  if (settings.newCardsPerDay && settings.newCardsPerDay < 0) {
    throw new ValidationError('newCardsPerDay', settings.newCardsPerDay);
  }
  
  if (settings.maxReviewsPerDay && settings.maxReviewsPerDay < 0) {
    throw new ValidationError('maxReviewsPerDay', settings.maxReviewsPerDay);
  }
  
  if (settings.requestRetention && (settings.requestRetention < 0 || settings.requestRetention > 1)) {
    throw new ValidationError('requestRetention', settings.requestRetention);
  }
}