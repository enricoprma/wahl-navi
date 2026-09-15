import { Component, inject, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { Party } from '../../models/party.model';
import { Position } from '../../models/position.model';
import { Statement } from '../../models/statement.model';
import { Vote } from '../../models/vote.model';
import { PartyPositionComponent } from '../dialogs/party-position/party-position.component';

@Component({
  selector: 'app-overview',
  imports: [MatIconModule, MatButtonModule, MatTooltip],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.sass',
})
export class OverviewComponent implements OnInit {
  private readonly dialog = inject(MatDialog);

  @Input({ required: true }) statement!: Statement;
  @Input({ required: true }) vote!: Vote;
  @Input({ required: true }) parties!: Party[];
  @Input({ required: true }) positions!: Position[];

  public expanded = false;

  ngOnInit(): void {
    this.shuffle(this.parties);
  }

  getPartyPosition(statementId: number, party: Party): Position {
    return this.positions.filter(
      position =>
        position.statementId === statementId && position.partyId === party.id,
    )[0];
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
    });
  }

  shuffle(array: unknown[]): void {
    let currentIndex = array.length;

    while (currentIndex !== 0) {
      const randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
  }
}
