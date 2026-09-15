import { Opinion } from './opinion.model';

/** Represents a party's position on a statement. */
export interface Position {
  /** Stable ID of the statement this position refers to. */
  statementId: number;

  /** Stable ID of the party this position belongs to. */
  partyId: string;

  /** Party opinion: -1 = disagree, 0 = neutral, 1 = agree. */
  opinion: Opinion;

  /** Optional explanation of the party's position. */
  justification: string | null;
}
