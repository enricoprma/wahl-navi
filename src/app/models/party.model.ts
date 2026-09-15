/** Represents a political party in an election dataset. */
export interface Party {
  /** Stable, URL-friendly identifier used for relationships and assets. */
  id: string;

  /** Full party name. */
  name: string;

  /** Short name or abbreviation. */
  shortName: string;

  /** Hex color used for presentation. */
  color: string;

  /** Short description of the party's platform. */
  description: string;
}
