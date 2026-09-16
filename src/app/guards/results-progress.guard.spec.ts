import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ElectionDataService } from '../services/election-data.service';
import { VOTING_STATE_STORAGE_KEY as KEY } from '../services/voting-state.service';
import { electionDataStub, mockVotingStorage, savedState } from '../testing/voting-fixtures';
import { resultsProgressGuard } from './results-progress.guard';

@Component({ template: '' })
class RouteTarget {}

describe('resultsProgressGuard', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = mockVotingStorage();
    TestBed.configureTestingModule({
      providers: [
        { provide: ElectionDataService, useValue: electionDataStub() },
        provideRouter([
          { path: '', component: RouteTarget },
          { path: 'results', component: RouteTarget, canActivate: [resultsProgressGuard] },
        ]),
      ],
    });
  });

  for (const stored of [undefined, savedState()]) {
    it('redirects to start without meaningful progress', async () => {
      if (stored) storage.set(KEY, JSON.stringify(stored));
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/results');
      expect(TestBed.inject(Router).url).toBe('/');
    });
  }

  it('lets the results component report dataset-load failures rather than redirecting as an empty session', async () => {
    const data = TestBed.inject(ElectionDataService) as jasmine.SpyObj<ElectionDataService>;
    data.getMetadata.and.rejectWith(new Error('Data unavailable'));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/results');
    expect(TestBed.inject(Router).url).toBe('/results');
  });

  for (const [name, stored] of [
    ['navigation-only', savedState({ currentStatementId: 42 })],
    ['draft-only', savedState({ draftWeights: [{ statementId: 10, weight: 2 }] })],
    ['all-skipped', savedState({ votes: [{ statementId: 10, value: null, weight: 1 }] })],
  ] as const) {
    it(`allows restored ${name} progress`, async () => {
      storage.set(KEY, JSON.stringify(stored));
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/results');
      expect(TestBed.inject(Router).url).toBe('/results');
    });
  }
});
