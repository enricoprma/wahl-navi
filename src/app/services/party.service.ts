import { inject, Injectable } from '@angular/core';

import { Party } from '../models/party.model';
import { Position } from '../models/position.model';
import { YamlDataService } from './yaml-data.service';

@Injectable({
  providedIn: 'root',
})
export class PartyService {
  private readonly dataService = inject(YamlDataService);
  private readonly logoDirectory = 'logos/parties';

  private positions?: Position[];

  getPartySvgPath(party: Party): string {
    return `${this.logoDirectory}/${party.id}.svg`;
  }

  async getPartyPosition(
    statementId: number,
    party: Party,
  ): Promise<Position | undefined> {
    if (!this.positions) this.positions = await this.dataService.getPositions();
    return this.positions.find(
      position =>
        position.statementId === statementId && position.partyId === party.id,
    );
  }

  async getPartyPositions(party: Party): Promise<Position[]> {
    if (!this.positions) this.positions = await this.dataService.getPositions();
    return this.positions.filter(position => position.partyId === party.id);
  }
}
