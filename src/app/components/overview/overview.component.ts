import { Component, inject, Input, OnInit } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltip } from "@angular/material/tooltip";

import { Party } from "../../models/party.model";
import { Position } from "../../models/position.model";
import { Statement } from "../../models/statement.model";
import { Vote } from "../../models/vote.model";
import { PartyService } from "../../services/party.service";
import { PartyPositionComponent } from "../dialogs/party-position/party-position.component";

@Component({
  selector: "app-overview",
  imports: [MatIconModule, MatButtonModule, MatTooltip],
  templateUrl: "./overview.component.html",
  styleUrl: "./overview.component.sass",
})
export class OverviewComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly partyService = inject(PartyService);

  @Input({ required: true }) statement!: Statement;
  @Input({ required: true }) vote: Vote | undefined;
  @Input({ required: true }) parties!: Party[];

  public expanded = false;
  private positionsByPartyId = new Map<string, Position>();

  async ngOnInit(): Promise<void> {
    const positions = await Promise.all(
      this.parties.map((party) =>
        this.partyService.getPartyPosition(party.id, this.statement.id),
      ),
    );
    this.positionsByPartyId = new Map(
      positions
        .filter((position): position is Position => position !== undefined)
        .map((position) => [position.partyId, position]),
    );
  }

  getPartyPosition(partyId: string): Position | undefined {
    return this.positionsByPartyId.get(partyId);
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  openPositionDialog(
    position: Position,
    statement: Statement,
    party: Party,
  ): void {
    this.dialog.open(PartyPositionComponent, {
      data: { position, statement, party, vote: this.vote },
      width: "min(92vw, 42rem)",
      maxWidth: "92vw",
      ariaLabel: `${party.name} position`,
      autoFocus: "first-tabbable",
      restoreFocus: true,
    });
  }
}
