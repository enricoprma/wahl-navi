import { electionDataStub, mockVotingStorage, savedState } from '../testing/voting-fixtures';
import { ElectionDataService } from './election-data.service';
import { VOTING_STATE_STORAGE_KEY as KEY, VotingStateService } from './voting-state.service';

describe('VotingStateService', () => {
  let service: VotingStateService;
  let data: jasmine.SpyObj<ElectionDataService>;
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = mockVotingStorage();
    data = electionDataStub();
    service = new VotingStateService(data);
  });

  it('restores the first statement, answers and weights without an initial save', async () => {
    const stored = savedState({ votes: [{ statementId: 10, value: 1, weight: 2 }] });
    storage.set(KEY, JSON.stringify(stored));
    await service.initialize();
    expect(service.currentStatementId()).toBe(10);
    expect(service.votes()).toEqual(stored.votes);
    expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  });

  it('migrates valid version-1 progress without losing answers or the resume position', async () => {
    const { draftWeights, ...oldState } = savedState({
      currentStatementId: 42, votes: [{ statementId: 10, value: null, weight: 2 }],
    });
    storage.set(KEY, JSON.stringify({ ...oldState, schemaVersion: 1 }));
    await service.initialize();
    expect(service.currentStatementId()).toBe(42);
    expect(service.votes()).toEqual(oldState.votes);
    service.setWeight(42, 2);
    expect(JSON.parse(storage.get(KEY)!).schemaVersion).toBe(2);
    const restored = new VotingStateService(data);
    await restored.initialize();
    expect(restored.votes()).toEqual(oldState.votes);
    expect(restored.getWeight(42)).toBe(2);
  });

  it('persists draft weights, restores them, and consumes them only when answered', async () => {
    await service.initialize();
    service.setCurrentStatement(42);
    service.toggleWeight(42);
    expect(service.votes()).toEqual([]);
    const restored = new VotingStateService(data);
    await restored.initialize();
    expect(restored.currentStatementId()).toBe(42);
    expect(restored.getWeight(42)).toBe(2);
    restored.answer(42, null);
    expect(restored.votes()).toEqual([{ statementId: 42, value: null, weight: 2 }]);
    expect(JSON.parse(storage.get(KEY)!).draftWeights).toEqual([]);
  });

  it('counts later navigation, draft double weights, and explicit skips as progress', async () => {
    await service.initialize();
    expect(service.hasProgress()).toBeFalse();
    service.setCurrentStatement(10);
    expect(service.hasProgress()).toBeFalse();
    service.navigate(1);
    expect(service.currentStatementId()).toBe(42);
    expect(service.hasProgress()).toBeTrue();
    service.navigate(-1);
    expect(service.hasProgress()).toBeFalse();
    service.toggleWeight(10);
    expect(service.hasProgress()).toBeTrue();
    service.toggleWeight(10);
    expect(service.hasProgress()).toBeFalse();
    service.answer(10, null);
    expect(service.hasProgress()).toBeTrue();
  });

  it('changes answers and weights without moving the saved resume position', async () => {
    await service.initialize();
    service.setCurrentStatement(99);
    service.answer(10, 1);
    service.setWeight(10, 2);
    service.answer(10, -1);
    expect(service.currentStatementId()).toBe(99);
    expect(JSON.parse(storage.get(KEY)!).currentStatementId).toBe(99);
  });

  const invalidRecords: [string, () => string][] = [
    ['corrupt JSON', () => '{not json'],
    ['unsupported schema', () => JSON.stringify({ ...savedState(), schemaVersion: 3 })],
    ['mismatched dataset', () => JSON.stringify(savedState({ datasetId: 'other' }))],
    ['unknown current statement', () => JSON.stringify(savedState({ currentStatementId: 100 }))],
    ['invalid timestamp', () => JSON.stringify(savedState({ updatedAt: 'invalid' }))],
    ['missing draft weights', () => JSON.stringify({ ...savedState(), draftWeights: undefined })],
    ['invalid opinion', () => JSON.stringify({ ...savedState(), votes: [{ statementId: 10, value: 3, weight: 1 }] })],
    ['invalid vote weight', () => JSON.stringify({ ...savedState(), votes: [{ statementId: 10, value: 1, weight: 3 }] })],
    ['unknown vote ID', () => JSON.stringify(savedState({ votes: [{ statementId: 100, value: 1, weight: 1 }] }))],
    ['duplicate votes', () => JSON.stringify(savedState({ votes: Array(2).fill({ statementId: 10, value: 1, weight: 1 }) }))],
    ['invalid draft weight', () => JSON.stringify({ ...savedState(), draftWeights: [{ statementId: 42, weight: 3 }] })],
    ['unknown draft ID', () => JSON.stringify(savedState({ draftWeights: [{ statementId: 100, weight: 2 }] }))],
    ['duplicate drafts', () => JSON.stringify(savedState({ draftWeights: Array(2).fill({ statementId: 42, weight: 2 }) }))],
    ['a draft overlapping a vote', () => JSON.stringify(savedState({ votes: [{ statementId: 10, value: 0, weight: 1 }], draftWeights: [{ statementId: 10, weight: 2 }] }))],
  ];
  for (const [name, record] of invalidRecords) {
    it(`rejects ${name}`, async () => {
      storage.set(KEY, record());
      await service.initialize();
      expect(service.hasProgress()).toBeFalse();
      expect(service.votes()).toEqual([]);
      expect(service.currentStatementId()).toBeNull();
    });
  }

  it('removes only the namespaced record on reset, leaving legacy and unrelated keys untouched', async () => {
    storage.set('votes', 'legacy votes');
    storage.set('index', 'legacy index');
    storage.set('other-app', 'keep me');
    await service.initialize();
    service.answer(10, -1);
    service.setWeight(42, 2);
    service.reset();
    expect([...storage.entries()]).toEqual([
      ['votes', 'legacy votes'], ['index', 'legacy index'], ['other-app', 'keep me'],
    ]);
    expect(service.hasProgress()).toBeFalse();
    expect(service.getWeight(42)).toBe(1);
  });

  it('retains usable in-memory state when storage reads, writes and removal fail', async () => {
    (Storage.prototype.getItem as jasmine.Spy).and.throwError('disabled');
    (Storage.prototype.setItem as jasmine.Spy).and.throwError('disabled');
    (Storage.prototype.removeItem as jasmine.Spy).and.throwError('disabled');
    await service.initialize();
    service.setWeight(10, 2);
    service.answer(10, 0);
    expect(service.votes()).toEqual([{ statementId: 10, value: 0, weight: 2 }]);
    service.reset();
    expect(service.hasProgress()).toBeFalse();
  });
});
