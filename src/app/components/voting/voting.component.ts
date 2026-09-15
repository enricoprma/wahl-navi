import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { Statement } from '../../models/statement.model';
import { Opinion } from '../../models/opinion.model';
import { ElectionDataService } from '../../services/election-data.service';
import { VotingStateService } from '../../services/voting-state.service';
import { HelpComponent } from '../dialogs/help/help.component';
import { StatementExplanationComponent } from '../dialogs/statement-explanation/statement-explanation.component';

@Component({
  selector: 'app-voting',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatBadgeModule,
    MatBottomSheetModule,
  ],
  templateUrl: './voting.component.html',
  styleUrl: './voting.component.sass',
})
export class VotingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dataService = inject(ElectionDataService);
  private readonly votingState = inject(VotingStateService);
  private readonly bottomSheet = inject(MatBottomSheet);

  public statements: Statement[] = [];
  public index = signal(0);
  public readonly votes = this.votingState.votes;
  public readonly doubleWeightEnabled = computed(() => {
    const statement = this.statements[this.index()];
    return statement ? this.votingState.getWeight(statement.id) === 2 : false;
  });
  public errorMessage = '';
  public dialog = inject(MatDialog);

  async ngOnInit(): Promise<void> {
    try {
      const [statements] = await Promise.all([
        this.dataService.getStatements(),
        this.votingState.initialize(),
      ]);
      this.statements = statements;
      const restoredId = this.votingState.currentStatementId();
      const restoredIndex = restoredId === null
        ? -1
        : this.statements.findIndex(statement => statement.id === restoredId);
      this.index.set(restoredIndex >= 0 ? restoredIndex : 0);
      if (restoredIndex < 0 && this.statements.length) {
        this.votingState.setCurrentStatement(this.statements[0].id);
      }
      window.scrollTo(0, 0);
    } catch {
      this.errorMessage = 'Election data could not be loaded. Please return to the start page and try again.';
    }
  }

  vote(value: Opinion | null): void {
    const statement = this.statements[this.index()];
    if (!statement) return;
    this.votingState.answer(statement.id, value);
    if (this.index() === this.statements.length - 1) {
      this.router.navigate(['results']);
      return;
    }
    this.setIndex(this.index() + 1);
  }

  getVote(statementId: number) {
    return this.votingState.getVote(statementId);
  }

  isSkipped(statementId: number): boolean {
    return this.getVote(statementId)?.value === null;
  }

  toggleDoubleWeight(): void {
    const statement = this.statements[this.index()];
    if (statement) this.votingState.toggleWeight(statement.id);
  }

  openInfoDialog(statement: Statement): void {
    this.dialog.open(StatementExplanationComponent, {
      data: { explanation: statement.explanation },
    });
  }

  setIndex(index: number): void {
    if (index < 0 || index >= this.statements.length) return;

    this.index.set(index);
    this.votingState.setCurrentStatement(this.statements[index].id);
  }

  openHelpBottomSheet(): void {
    this.bottomSheet.open(HelpComponent);
  }
}
