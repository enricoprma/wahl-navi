import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AgreementResult } from '../../models/agreement-result.model';
import { Party } from '../../models/party.model';
import { Position } from '../../models/position.model';
import { Statement } from '../../models/statement.model';
import { Vote } from '../../models/vote.model';
import { YamlDataService } from '../../services/yaml-data.service';
import { PartyPositionComponent } from '../dialogs/party-position/party-position.component';

@Component({
  selector: 'app-agreement',
  imports: [
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './agreement.component.html',
  styleUrl: './agreement.component.sass',
})
export class AgreementComponent implements OnInit {
  private readonly dataService = inject(YamlDataService);
  private readonly dialog = inject(MatDialog);

  @Input({ required: true }) votes!: Vote[];
  @Input({ required: true }) agreement!: AgreementResult;

  public positions: Position[] = [];
  public statements: Statement[] = [];
  public expanded = false;
  public animationEnded = signal(false);

  async ngOnInit(): Promise<void> {
    this.positions = await this.dataService.getPositions();
    this.statements = await this.dataService.getStatements();

    const targetValue = this.agreement.percent;
    const increment = targetValue / 25;
    this.agreement.percent = 0;
    const interval = setInterval(() => {
      if (this.agreement.percent < targetValue) {
        this.agreement.percent += increment;
      } else {
        this.animationEnded.set(true);
        this.agreement.percent = targetValue;
        clearInterval(interval);
      }
    }, 50);
  }

  getPartySvgPath(party: Party): string {
    return `logos/parties/${party.id}.svg`;
  }

  getPartyPosition(statementId: number, party: Party): Position {
    return this.positions.filter(
      position =>
        position.statementId === statementId && position.partyId === party.id,
    )[0];
  }

  getPartyPositions(party: Party): Position[] {
    return this.positions.filter(position => position.partyId === party.id);
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
      data: {
        position,
        statement,
        party,
        vote: this.votes[position.statementId - 1],
      },
    });
  }
}
