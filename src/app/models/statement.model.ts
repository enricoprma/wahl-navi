/** Represents an election statement presented to the user. */
export interface Statement {
  /** Stable identifier for the statement. */
  id: number;

  /** Full statement text. */
  text: string;

  /** Optional background information. */
  explanation: string | null;

  /** Short label used in compact views. */
  keywords: string;
}
