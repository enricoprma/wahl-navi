import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { AgreementResult } from '../../models/agreement-result.model';
import { Opinion } from '../../models/opinion.model';
import { Party } from '../../models/party.model';
import { Position } from '../../models/position.model';
import { Statement } from '../../models/statement.model';
import { Vote } from '../../models/vote.model';
import { ElectionDataService } from '../../services/election-data.service';
import { MatchingService } from '../../services/matching.service';
import { PartyService } from '../../services/party.service';
import { VotingStateService } from '../../services/voting-state.service';
import { AgreementComponent } from '../agreement/agreement.component';
import { OverviewComponent } from '../overview/overview.component';

@Component({
  selector: 'app-evaluation',
  templateUrl: './evaluation.component.html',
  styleUrl: './evaluation.component.sass',
  imports: [
    MatGridListModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    AgreementComponent,
    MatTabsModule,
    MatTooltipModule,
    OverviewComponent,
  ],
})
export class EvaluationComponent {
  private readonly dataService = inject(ElectionDataService);
  private readonly partyService = inject(PartyService);
  private readonly matchingService = inject(MatchingService);
  private readonly votingState = inject(VotingStateService);
  public readonly router = inject(Router);

  public parties: Party[] = [];
  public positions: Position[] = [];
  public statements: Statement[] = [];
  public readonly votes = this.votingState.votes;
  public agreements: AgreementResult[] = [];
  public location = '';
  public errorMessage = '';

  async ngOnInit(): Promise<void> {
    try {
      const [metadata, parties, positions, statements] = await Promise.all([
        this.dataService.getMetadata(),
        this.partyService.getParties(),
        this.dataService.getPositions(),
        this.dataService.getStatements(),
        this.votingState.initialize(),
      ]);

      // Initialization may be retried here after a transient failure in the guard.
      if (!this.votingState.hasProgress()) {
        await this.router.navigate(['/']);
        return;
      }

      this.location = metadata.location;
      this.parties = parties;
      this.positions = positions;
      this.statements = statements;

      this.calculateAndSortAgreements();
    } catch {
      this.errorMessage = 'Election data could not be loaded. Please try again later.';
    }
  }

  /** Changes one answer and recalculates agreements. */
  changeVote(statementId: number, value: Opinion | null): void {
    this.votingState.answer(statementId, value);
    this.calculateAndSortAgreements();
  }

  /** Changes one answer's matching weight. */
  changeVoteWeight(statementId: number, weight: 1 | 2): void {
    this.votingState.setWeight(statementId, weight);
    this.calculateAndSortAgreements();
  }

  getVote(statementId: number): Vote | undefined {
    return this.votingState.getVote(statementId);
  }

  getWeight(statementId: number): 1 | 2 {
    return this.votingState.getWeight(statementId);
  }

  calculateAndSortAgreements(): void {
    this.agreements = this.matchingService.calculateAgreements(
      this.votes(),
      this.parties,
      this.positions,
    );
  }
}
