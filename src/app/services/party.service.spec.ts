import { TestBed } from '@angular/core/testing';

import { Party } from '../models/party.model';
import { Position } from '../models/position.model';
import { ElectionDataService } from './election-data.service';
import { PartyService } from './party.service';

describe('PartyService', () => {
  let service: PartyService;
  const parties: Party[] = [
    {
      id: 'early-birds',
      name: 'Early Bird Party',
      shortName: 'EBP',
      color: '#F59E0B',
      description: 'Practical optimists.',
    },
    {
      id: 'night-owls',
      name: 'Night Owl Alliance',
      shortName: 'NOA',
      color: '#4338CA',
      description: 'Useful after sunset.',
    },
  ];
  const positions: Position[] = [
    { partyId: 'early-birds', statementId: 1, opinion: 1, justification: null },
    { partyId: 'early-birds', statementId: 2, opinion: 0, justification: null },
    { partyId: 'night-owls', statementId: 1, opinion: -1, justification: null },
  ];
  const dataService = {
    getParties: jasmine.createSpy('getParties'),
    getPositions: jasmine.createSpy('getPositions'),
  };

  beforeEach(() => {
    dataService.getParties.calls.reset();
    dataService.getPositions.calls.reset();
    dataService.getParties.and.resolveTo(parties);
    dataService.getPositions.and.resolveTo(positions);
    TestBed.configureTestingModule({
      providers: [
        PartyService,
        { provide: ElectionDataService, useValue: dataService },
      ],
    });
    service = TestBed.inject(PartyService);
  });

  it('looks up parties and positions by stable IDs using one loaded index', async () => {
    await expectAsync(service.getParty('early-birds')).toBeResolvedTo(parties[0]);
    await expectAsync(service.getPartyPosition('early-birds', 2)).toBeResolvedTo(
      positions[1],
    );
    await expectAsync(service.getParty('missing')).toBeResolvedTo(undefined);
    expect(dataService.getParties).toHaveBeenCalledTimes(1);
    expect(dataService.getPositions).toHaveBeenCalledTimes(1);
  });

  it('returns all positions for one party and a relative logo path', async () => {
    await expectAsync(service.getPartyPositions('early-birds')).toBeResolvedTo([
      positions[0],
      positions[1],
    ]);
    expect(service.getPartyLogoPath(parties[0])).toBe(
      'logos/parties/early-birds.svg',
    );
  });
});
