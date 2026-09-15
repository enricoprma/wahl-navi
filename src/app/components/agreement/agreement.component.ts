import { Component, inject, Input, OnChanges, OnDestroy, OnInit, signal, SimpleChanges } from '@angular/core';
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
import { ElectionDataService } from '../../services/election-data.service';
import { PartyService } from '../../services/party.service';
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
export class AgreementComponent implements OnInit, OnChanges, OnDestroy {
  private readonly dataService = inject(ElectionDataService);
  private readonly partyService = inject(PartyService);
  private readonly dialog = inject(MatDialog);
  private animationTimer?: ReturnType<typeof setInterval>;

  @Input({ required: true }) votes!: Vote[];
  @Input({ required: true }) agreement!: AgreementResult;

  public positions: Position[] = [];
  private statementsById = new Map<number, Statement>();
  public expanded = false;
  public animationEnded = signal(false);
  public displayPercent = signal(0);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['agreement'] && !changes['agreement'].firstChange) {
      this.animateTo(this.agreement.percent);
    }
  }

  async ngOnInit(): Promise<void> {
    const [positions, statements] = await Promise.all([
      this.partyService.getPartyPositions(this.agreement.party.id),
      this.dataService.getStatements(),
    ]);
    this.positions = positions;
    this.statementsById = new Map(
      statements.map(statement => [statement.id, statement]),
    );

    this.animateTo(this.agreement.percent);
  }

  private animateTo(targetValue: number): void {
    this.clearAnimationTimer();
    this.animationEnded.set(false);
    this.displayPercent.set(0);
    if (targetValue === 0) {
      this.animationEnded.set(true);
      return;
    }
    const increment = targetValue / 25;
    this.animationTimer = setInterval(() => {
      if (this.displayPercent() < targetValue) {
        this.displayPercent.update(value => value + increment);
      } else {
        this.animationEnded.set(true);
        this.displayPercent.set(targetValue);
        this.clearAnimationTimer();
      }
    }, 50);
  }

  ngOnDestroy(): void {
    this.clearAnimationTimer();
  }

  getPartyLogoPath(party: Party): string {
    return this.partyService.getPartyLogoPath(party);
  }

  getStatement(statementId: number): Statement | undefined {
    return this.statementsById.get(statementId);
  }

  getVote(statementId: number): Vote | undefined {
    return this.votes.find(vote => vote.statementId === statementId);
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
        vote: this.getVote(position.statementId) ?? {
          statementId: position.statementId,
          value: null,
          weight: 1,
        },
      },
    });
  }

  private clearAnimationTimer(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = undefined;
    }
  }
}
