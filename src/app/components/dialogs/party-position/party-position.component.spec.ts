import { TestBed } from "@angular/core/testing";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import {
  parties,
  positions,
  statements,
} from "../../../testing/voting-fixtures";
import { PartyPositionComponent } from "./party-position.component";

describe("PartyPositionComponent", () => {
  for (const [label, vote] of [
    ["radio_button_unchecked", undefined],
    ["radio_button_unchecked", { statementId: 10, value: null, weight: 1 }],
  ] as const) {
    it(`shows "${label}" for the corresponding vote state`, () => {
      TestBed.configureTestingModule({
        imports: [PartyPositionComponent],
        providers: [
          {
            provide: MatDialogRef,
            useValue: { close: jasmine.createSpy("close") },
          },
          {
            provide: MAT_DIALOG_DATA,
            useValue: {
              party: parties[0],
              position: positions[0],
              statement: statements[0],
              vote,
            },
          },
        ],
      });
      const fixture = TestBed.createComponent(PartyPositionComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(label);
    });
  }
});
