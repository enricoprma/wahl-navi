import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { ElectionDataService } from "../../services/election-data.service";
import {
  VOTING_STATE_STORAGE_KEY as KEY,
  VotingStateService,
} from "../../services/voting-state.service";
import {
  electionDataStub,
  mockVotingStorage,
  savedState,
} from "../../testing/voting-fixtures";
import { VotingComponent } from "./voting.component";

describe("VotingComponent", () => {
  let fixture: ComponentFixture<VotingComponent>;
  let component: VotingComponent;
  let state: VotingStateService;
  let storage: Map<string, string>;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    storage = mockVotingStorage();
    TestBed.configureTestingModule({
      imports: [VotingComponent],
      providers: [
        provideRouter([]),
        { provide: ElectionDataService, useValue: electionDataStub() },
      ],
    });
    state = TestBed.inject(VotingStateService);
    navigate = spyOn(TestBed.inject(Router), "navigate").and.resolveTo(true);
    spyOn(window, "scrollTo");
    fixture = TestBed.createComponent(VotingComponent);
    component = fixture.componentInstance;
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it("changes weight before answering without selecting Skip, and preserves it in the answer", async () => {
    await render();
    const button = fixture.nativeElement.querySelector(
      '[aria-label="Normal weight. Change answer weight"]',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(component.doubleWeightEnabled()).toBeTrue();
    expect(state.votes()).toEqual([]);
    expect(fixture.nativeElement.querySelector("button.was-chosen")).toBeNull();
    expect(JSON.parse(storage.get(KEY)!).draftWeights).toEqual([
      { statementId: 10, weight: 2 },
    ]);
    (
      fixture.nativeElement.querySelector(
        '[aria-label="Agree"]',
      ) as HTMLButtonElement
    ).click();
    expect(state.getVote(10)).toEqual({ statementId: 10, value: 1, weight: 2 });
    expect(state.currentStatementId()).toBe(42);
  });

  for (const [id, index] of [
    [10, 0],
    [42, 1],
  ]) {
    it(`resumes at persisted statement ${id}, including its draft weight`, async () => {
      storage.set(
        KEY,
        JSON.stringify(
          savedState({
            currentStatementId: id,
            draftWeights: [{ statementId: id, weight: 2 }],
          }),
        ),
      );
      await render();
      expect(component.index()).toBe(index);
      expect(component.doubleWeightEnabled()).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain(`Statement ${id}`);
      component.setIndex(index + 1);
      component.setIndex(index);
      expect(component.doubleWeightEnabled()).toBeTrue();
      expect(state.votes()).toEqual([]);
    });
  }

  it("answers the final statement and navigates to results without resetting progress", async () => {
    storage.set(KEY, JSON.stringify(savedState({ currentStatementId: 99 })));
    await render();
    component.vote(null);
    expect(navigate).toHaveBeenCalledOnceWith(["results"]);
    expect(state.getVote(99)?.value).toBeNull();
    expect(state.currentStatementId()).toBe(99);
    expect(state.hasProgress()).toBeTrue();
    expect(JSON.parse(storage.get(KEY)!).votes).toEqual([
      { statementId: 99, value: null, weight: 1 },
    ]);
  });

  it("navigates across non-contiguous IDs without answering and ignores out-of-range moves", async () => {
    await render();
    component.setIndex(-1);
    expect(component.index()).toBe(0);
    component.setIndex(1);
    expect(state.currentStatementId()).toBe(42);
    component.setIndex(2);
    component.setIndex(3);
    expect(component.index()).toBe(2);
    component.setIndex(0);
    expect(state.currentStatementId()).toBe(10);
    expect(state.votes()).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
  });
});
