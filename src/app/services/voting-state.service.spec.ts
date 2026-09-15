import { TestBed } from '@angular/core/testing';

import { ElectionDataService } from './election-data.service';
import {
  PersistedVotingState,
  VOTING_STATE_STORAGE_KEY,
  VotingStateService,
} from './voting-state.service';

describe('VotingStateService', () => {
  let service: VotingStateService;
  const dataService = {
    getMetadata: jasmine.createSpy('getMetadata'),
    getStatements: jasmine.createSpy('getStatements'),
  };

  const validState = (overrides: Partial<PersistedVotingState> = {}): PersistedVotingState => ({
    schemaVersion: 1,
    datasetId: 'exampleton-2026-v1',
    currentStatementId: 10,
    votes: [{ statementId: 10, value: 1, weight: 2 }],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    dataService.getMetadata.calls.reset();
    dataService.getStatements.calls.reset();
    dataService.getMetadata.and.resolveTo({ datasetId: 'exampleton-2026-v1' });
    dataService.getStatements.and.resolveTo([
      { id: 10, text: 'First', explanation: null, keywords: 'first' },
      { id: 42, text: 'Second', explanation: null, keywords: 'second' },
    ]);
    TestBed.configureTestingModule({
      providers: [
        VotingStateService,
        { provide: ElectionDataService, useValue: dataService },
      ],
    });
    service = TestBed.inject(VotingStateService);
  });

  it('restores namespaced votes, weights, and the first statement ID without an initial save', async () => {
    const stored = validState({ currentStatementId: 10 });
    localStorage.setItem(VOTING_STATE_STORAGE_KEY, JSON.stringify(stored));

    await service.initialize();

    expect(service.currentStatementId()).toBe(10);
    expect(service.votes()).toEqual(stored.votes);
    expect(localStorage.getItem(VOTING_STATE_STORAGE_KEY)).toBe(JSON.stringify(stored));
  });

  it('persists answers and weights by non-contiguous statement ID', async () => {
    await service.initialize();
    service.setCurrentStatement(42);
    service.toggleWeight(42);
    expect(service.votes()).toEqual([]);

    service.answer(42, null);
    service.setWeight(42, 1);

    expect(service.votes()).toEqual([{ statementId: 42, value: null, weight: 1 }]);
    expect(JSON.parse(localStorage.getItem(VOTING_STATE_STORAGE_KEY) ?? '').votes).toEqual(service.votes());
    expect(service.hasProgress()).toBeTrue();
  });

  it('rejects corrupt, incompatible, mismatched, and invalid persisted state', async () => {
    localStorage.setItem(VOTING_STATE_STORAGE_KEY, '{not json');
    await service.initialize();
    expect(service.hasProgress()).toBeFalse();

    TestBed.resetTestingModule();
    localStorage.setItem(VOTING_STATE_STORAGE_KEY, JSON.stringify(validState({ schemaVersion: 2 as 1 })));
    TestBed.configureTestingModule({ providers: [VotingStateService, { provide: ElectionDataService, useValue: dataService }] });
    service = TestBed.inject(VotingStateService);
    await service.initialize();
    expect(service.hasProgress()).toBeFalse();
  });

  it('keeps legacy and unrelated keys when reset removes only the namespaced record', async () => {
    localStorage.setItem('votes', 'legacy votes');
    localStorage.setItem('index', 'legacy index');
    localStorage.setItem('other-app', 'keep me');
    await service.initialize();
    service.answer(10, -1);

    service.reset();

    expect(localStorage.getItem(VOTING_STATE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('votes')).toBe('legacy votes');
    expect(localStorage.getItem('index')).toBe('legacy index');
    expect(localStorage.getItem('other-app')).toBe('keep me');
  });

  it('continues in memory when storage is unavailable', async () => {
    const setItem = spyOn(localStorage, 'setItem').and.throwError('disabled');
    await service.initialize();

    service.answer(10, 0);

    expect(service.votes()).toEqual([{ statementId: 10, value: 0, weight: 1 }]);
    setItem.and.callThrough();
  });
});
