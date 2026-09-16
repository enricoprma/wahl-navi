import { inject, Injectable } from "@angular/core";

import { Party } from "../models/party.model";
import { Position } from "../models/position.model";
import { ElectionDataService } from "./election-data.service";

@Injectable({
  providedIn: "root",
})
export class PartyService {
  private readonly dataService = inject(ElectionDataService);
  private lookupPromise?: Promise<void>;
  private parties: Party[] = [];
  private partyById = new Map<string, Party>();
  private positionsByPartyId = new Map<string, Position[]>();
  private positionByPartyAndStatement = new Map<string, Position>();

  async getParties(): Promise<Party[]> {
    await this.initializeLookups();
    return this.parties;
  }

  async getParty(partyId: string): Promise<Party | undefined> {
    await this.initializeLookups();
    return this.partyById.get(partyId);
  }

  async getPartyPositions(partyId: string): Promise<Position[]> {
    await this.initializeLookups();
    return this.positionsByPartyId.get(partyId) ?? [];
  }

  async getPartyPosition(
    partyId: string,
    statementId: number,
  ): Promise<Position | undefined> {
    await this.initializeLookups();
    return this.positionByPartyAndStatement.get(
      this.positionKey(partyId, statementId),
    );
  }

  getPartyLogoPath(party: Party): string {
    return `logos/parties/${party.id}.svg`;
  }

  private initializeLookups(): Promise<void> {
    if (!this.lookupPromise) {
      this.lookupPromise = Promise.all([
        this.dataService.getParties(),
        this.dataService.getPositions(),
      ])
        .then(([parties, positions]) => {
          this.parties = parties;
          this.partyById = new Map(parties.map((party) => [party.id, party]));
          this.positionsByPartyId = new Map();
          this.positionByPartyAndStatement = new Map();

          for (const position of positions) {
            const partyPositions =
              this.positionsByPartyId.get(position.partyId) ?? [];
            partyPositions.push(position);
            this.positionsByPartyId.set(position.partyId, partyPositions);
            this.positionByPartyAndStatement.set(
              this.positionKey(position.partyId, position.statementId),
              position,
            );
          }
        })
        .catch((error) => {
          this.lookupPromise = undefined;
          throw error;
        });
    }

    return this.lookupPromise;
  }

  private positionKey(partyId: string, statementId: number): string {
    return `${partyId}:${statementId}`;
  }
}
