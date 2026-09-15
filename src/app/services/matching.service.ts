import { Injectable } from '@angular/core';

import { AgreementResult } from '../models/agreement-result.model';
import { Party } from '../models/party.model';
import { Position } from '../models/position.model';
import { Vote } from '../models/vote.model';

/** Calculates consistently rounded, descending agreement results. */
@Injectable({
  providedIn: 'root',
})
export class MatchingService {
  calculateAgreements(
    votes: Vote[],
    parties: Party[],
    positions: Position[],
  ): AgreementResult[] {
    const positionsByPartyAndStatement = new Map<string, Position>();
    for (const position of positions) {
      positionsByPartyAndStatement.set(
        this.positionKey(position.partyId, position.statementId),
        position,
      );
    }

    return parties
      .map(party => {
        let matchedWeight = 0;
        let answeredWeight = 0;

        for (const vote of votes) {
          if (vote.value === null) continue;

          answeredWeight += vote.weight;
          const position = positionsByPartyAndStatement.get(
            this.positionKey(party.id, vote.statementId),
          );
          if (position?.opinion === vote.value) {
            matchedWeight += vote.weight;
          }
        }

        return {
          party,
          percent:
            answeredWeight === 0
              ? 0
              : Math.round((matchedWeight / answeredWeight) * 100),
        };
      })
      .sort((first, second) => second.percent - first.percent);
  }

  private positionKey(partyId: string, statementId: number): string {
    return `${partyId}:${statementId}`;
  }
}
