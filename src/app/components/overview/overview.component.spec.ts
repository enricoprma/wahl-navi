import { TestBed } from "@angular/core/testing";
import { MatDialog } from "@angular/material/dialog";
import { ElectionDataService } from "../../services/election-data.service";
import {
  electionDataStub,
  parties,
  positions,
  statements,
} from "../../testing/voting-fixtures";
import { OverviewComponent } from "./overview.component";

describe("OverviewComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [
        { provide: ElectionDataService, useValue: electionDataStub() },
      ],
    });
  });

  it("distinguishes an unanswered statement from an explicit skip, not including dialog data", async () => {
    const fixture = TestBed.createComponent(OverviewComponent);
    fixture.componentRef.setInput("statement", statements[0]);
    fixture.componentRef.setInput("parties", parties);
    fixture.componentRef.setInput("vote", undefined);
    fixture.componentInstance.expanded = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      "radio_button_unchecked",
    );
    const open = spyOn(TestBed.inject(MatDialog), "open");
    fixture.componentInstance.openPositionDialog(
      positions[0],
      statements[0],
      parties[0],
    );
    expect(open.calls.mostRecent().args[1]?.data).toEqual({
      position: positions[0],
      statement: statements[0],
      party: parties[0],
      vote: undefined,
    });
    fixture.componentRef.setInput("vote", {
      statementId: 10,
      value: null,
      weight: 1,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      "radio_button_unchecked",
    );
  });
});
