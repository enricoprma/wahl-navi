import { Party } from "./party.model";

/**
 * Represents the agreement result between a user and a party.
 */
export interface AgreementResult {
  party: Party;
  percent: number;
}