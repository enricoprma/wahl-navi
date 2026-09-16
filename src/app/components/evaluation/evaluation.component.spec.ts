import {
  ComponentFixture,
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter, Router } from "@angular/router";
import { MatTabGroup } from "@angular/material/tabs";
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
import { EvaluationComponent } from "./evaluation.component";

describe("EvaluationComponent", () => {
  let fixture: ComponentFixture<EvaluationComponent>;
  let component: EvaluationComponent;
  let state: VotingStateService;
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = mockVotingStorage();
    TestBed.configureTestingModule({
      imports: [EvaluationComponent],
      providers: [
        provideRouter([]),
        { provide: ElectionDataService, useValue: electionDataStub() },
      ],
    });
    state = TestBed.inject(VotingStateService);
    fixture = TestBed.createComponent(EvaluationComponent);
    component = fixture.componentInstance;
  });

  function render(): void {
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    flushMicrotasks();
    tick(1500);
    fixture.detectChanges();
  }

  it("displays a dataset-load error instead of interpreting it as missing votes", fakeAsync(() => {
    const data = TestBed.inject(
      ElectionDataService,
    ) as jasmine.SpyObj<ElectionDataService>;
    data.getMetadata.and.rejectWith(new Error("Data unavailable"));
    render();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain("Election data could not be loaded");
  }));

  it("rechecks progress after successful initialization, including retries after guard load errors", fakeAsync(() => {
    const navigate = spyOn(TestBed.inject(Router), "navigate").and.resolveTo(
      true,
    );
    render();
    expect(navigate).toHaveBeenCalledOnceWith(["/"]);
    expect(component.agreements).toEqual([]);
  }));

  it("restores results and persists answer/weight edits without changing the resume position", fakeAsync(() => {
    storage.set(
      KEY,
      JSON.stringify(
        savedState({
          currentStatementId: 99,
          votes: [
            { statementId: 10, value: 1, weight: 2 },
            { statementId: 42, value: -1, weight: 1 },
          ],
        }),
      ),
    );
    render();
    expect(component.agreements[0].percent).toBe(67);
    expect(
      fixture.nativeElement.querySelector("app-agreement h2").textContent,
    ).toContain("67.0%");

    component.changeVote(10, -1);
    render();
    expect(component.agreements[0].party.id).toBe("night-owls");
    expect(component.agreements[0].percent).toBe(100);
    expect(
      fixture.nativeElement.querySelector("app-agreement h2").textContent,
    ).toContain("100.0%");
    expect(JSON.parse(storage.get(KEY)!).votes[0]).toEqual({
      statementId: 10,
      value: -1,
      weight: 2,
    });

    component.changeVote(10, 1);
    component.changeVoteWeight(42, 2);
    render();
    expect(component.agreements.map((result) => result.percent)).toEqual([
      50, 50,
    ]);
    expect(
      fixture.nativeElement.querySelector("app-agreement h2").textContent,
    ).toContain("50.0%");
    expect(state.currentStatementId()).toBe(99);
    expect(JSON.parse(storage.get(KEY)!).currentStatementId).toBe(99);
    expect(JSON.parse(storage.get(KEY)!).votes[1].weight).toBe(2);
  }));

  it("renders unanswered and explicitly skipped statements as no answer and lets a draft weight be used on a new answer", fakeAsync(() => {
    storage.set(
      KEY,
      JSON.stringify(
        savedState({
          currentStatementId: 99,
          votes: [{ statementId: 10, value: null, weight: 1 }],
        }),
      ),
    );
    render();
    expect(component.getVote(42)).toBeUndefined();
    expect(component.agreements.map((result) => result.percent)).toEqual([
      0, 0,
    ]);
    const tabs = fixture.debugElement.query(By.directive(MatTabGroup))
      .componentInstance as MatTabGroup;
    tabs.selectedIndex = 1;
    render();
    expect(fixture.nativeElement.textContent).toContain(
      "radio_button_unchecked",
    );
    const noAnswerButton = fixture.nativeElement.querySelector(
      'button[aria-label="Current answer: No answer. Change answer"]',
    );
    expect(noAnswerButton).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('button[aria-label*="Skipped"]'),
    ).toBeNull();

    component.changeVoteWeight(42, 2);
    expect(component.getWeight(42)).toBe(2);
    expect(component.getVote(42)).toBeUndefined();
    expect(JSON.parse(storage.get(KEY)!).draftWeights).toEqual([
      { statementId: 42, weight: 2 },
    ]);
    component.changeVote(42, 1);
    expect(component.getVote(42)).toEqual({
      statementId: 42,
      value: 1,
      weight: 2,
    });
    expect(state.currentStatementId()).toBe(99);
    render();
  }));
});
