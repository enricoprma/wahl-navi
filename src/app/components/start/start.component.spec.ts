import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { of } from "rxjs";
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
import { StartComponent } from "./start.component";

describe("StartComponent", () => {
  let fixture: ComponentFixture<StartComponent>;
  let state: VotingStateService;
  let storage: Map<string, string>;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    storage = mockVotingStorage();
    TestBed.configureTestingModule({
      imports: [StartComponent],
      providers: [
        provideRouter([]),
        { provide: ElectionDataService, useValue: electionDataStub() },
      ],
    });
    state = TestBed.inject(VotingStateService);
    navigate = spyOn(TestBed.inject(Router), "navigate").and.resolveTo(true);
    fixture = TestBed.createComponent(StartComponent);
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it("shows Start for an untouched first statement", async () => {
    storage.set(KEY, JSON.stringify(savedState()));
    await render();
    const labels = [...fixture.nativeElement.querySelectorAll("button")].map(
      (button: any) => button.textContent.trim(),
    );
    expect(labels).toEqual(["Start"]);
  });

  it("shows Continue for navigation-only progress and preserves it when continuing or canceling restart", async () => {
    storage.set(KEY, JSON.stringify(savedState({ currentStatementId: 42 })));
    await render();
    expect(fixture.nativeElement.textContent).toContain("Continue");
    expect(fixture.nativeElement.textContent).toContain("Start over");
    fixture.componentInstance.continue();
    expect(navigate).toHaveBeenCalledOnceWith(["vote"]);
    expect(state.currentStatementId()).toBe(42);
    navigate.calls.reset();
    const before = storage.get(KEY);
    const open = spyOn(
      fixture.debugElement.injector.get(MatDialog),
      "open",
    ).and.returnValue({
      afterClosed: () => of(false),
    } as any);
    fixture.componentInstance.startOver();
    expect(open).toHaveBeenCalledTimes(1);
    expect(storage.get(KEY)).toBe(before);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("offers Continue for a saved draft and removes that progress on confirmed restart", async () => {
    storage.set(
      KEY,
      JSON.stringify(
        savedState({ draftWeights: [{ statementId: 10, weight: 2 }] }),
      ),
    );
    await render();
    expect(fixture.componentInstance.hasSavedProgress).toBeTrue();
    const open = spyOn(
      fixture.debugElement.injector.get(MatDialog),
      "open",
    ).and.returnValue({
      afterClosed: () => of(true),
    } as any);
    fixture.componentInstance.startOver();
    expect(open).toHaveBeenCalledTimes(1);
    expect(state.hasProgress()).toBeFalse();
    expect(state.currentStatementId()).toBeNull();
    expect(storage.has(KEY)).toBeFalse();
    expect(navigate).toHaveBeenCalledOnceWith(["vote"]);
  });
});
