import { Component, effect, inject, OnInit, signal } from '@angular/core';
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
import { Vote } from '../../models/vote.model';
import { YamlDataService } from '../../services/yaml-data.service';
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
  constructor() {
    effect(() => {
      if (this.index()) {
        localStorage.setItem('index', this.index().toString());
      }
      if (this.votes().length) {
        localStorage.setItem('votes', JSON.stringify(this.votes()));
      }
    });
  }

  private readonly router = inject(Router);
  private readonly dataService = inject(YamlDataService);
  private readonly bottomSheet = inject(MatBottomSheet);

  public statements: Statement[] = [];
  public index = signal(0);
  public votes = signal<Vote[]>([]);
  public doubleWeightEnabled = signal(false);
  public dialog = inject(MatDialog);

  async ngOnInit(): Promise<void> {
    this.statements = await this.dataService.getStatements();

    localStorage.clear();
    window.scrollTo(0, 0);
  }

  vote(answer: Vote): void {
    this.doubleWeightEnabled.set(false);
    const newVotes = this.votes();
    newVotes[this.index()] = answer;
    this.votes.set(newVotes);
    localStorage.setItem('votes', JSON.stringify(this.votes()));

    if (this.index() < this.statements.length - 1) {
      this.index.update(value => value + 1);

      if (this.votes()[this.index()]) {
        this.doubleWeightEnabled.set(this.votes()[this.index()].weight === 2);
      }
    } else {
      this.router.navigate(['results']);
    }
  }

  toggleDoubleWeight(): void {
    this.doubleWeightEnabled.update(value => !value);

    if (this.votes()[this.index()] !== null) {
      const newVotes = this.votes();
      newVotes[this.index()].weight = this.doubleWeightEnabled() ? 2 : 1;
      this.votes.set(newVotes);
    }
  }

  openInfoDialog(statement: Statement): void {
    this.dialog.open(StatementExplanationComponent, {
      data: { explanation: statement.explanation },
    });
  }

  setIndex(index: number): void {
    if (index < 0) return;
    if (index > this.statements.length - 1) {
      this.router.navigate(['results']);
      return;
    }

    this.index.set(index);
    this.doubleWeightEnabled.set(false);

    if (this.votes()[this.index()]) {
      this.doubleWeightEnabled.set(this.votes()[this.index()].weight === 2);
    }
  }

  openHelpBottomSheet(): void {
    this.bottomSheet.open(HelpComponent);
  }
}
