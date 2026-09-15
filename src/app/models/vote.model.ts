import { Opinion } from './opinion.model';

/** Represents a user's answer to a statement. */
export interface Vote {
  /** Stable ID of the statement this vote refers to. */
  statementId: number;

  /** Selected opinion, or null when the statement was skipped. */
  value: Opinion | null;

  /** Explicit matching weight for this answer. */
  weight: 1 | 2;
}
