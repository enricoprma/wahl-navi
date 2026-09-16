import { Component, inject } from "@angular/core";
import { A11yModule } from "@angular/cdk/a11y";
import { MatButtonModule } from "@angular/material/button";
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";

import { Opinion } from "../../../models/opinion.model";
import { Party } from "../../../models/party.model";
import { Position } from "../../../models/position.model";
import { Statement } from "../../../models/statement.model";
import { Vote } from "../../../models/vote.model";

interface PartyPositionDialogData {
  statement: Statement;
  party: Party;
  position: Position;
  vote?: Vote;
}

@Component({
  selector: "app-party-position",
  imports: [
    A11yModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
  ],
  templateUrl: "./party-position.component.html",
  styleUrl: "./party-position.component.sass",
})
export class PartyPositionComponent {
  readonly dialogRef = inject(MatDialogRef<PartyPositionComponent>);
  private readonly data = inject<PartyPositionDialogData>(MAT_DIALOG_DATA);

  public readonly statement = this.data.statement;
  public readonly party = this.data.party;
  public readonly position = this.data.position;
  public readonly vote = this.data.vote;

  convertOpinionToString(opinion: Opinion): string {
    switch (opinion) {
      case -1:
        return "Disagree";
      case 0:
        return "Neutral";
      case 1:
        return "Agree";
    }
  }
}
