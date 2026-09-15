import { Component, inject, signal } from '@angular/core';
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
  public readonly router = inject(Router);

  public parties: Party[] = [];
  public positions: Position[] = [];
  public statements: Statement[] = [];
  public votes = signal<Vote[]>([]);
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
      ]);

      this.location = metadata.location;
      this.parties = parties;
      this.positions = positions;
      this.statements = statements;

      const storedVotes = localStorage.getItem('votes');
      if (storedVotes) this.votes.set(JSON.parse(storedVotes));

      this.votes.set(statements.map(statement => this.getVote(statement.id)));
      this.calculateAndSortAgreements();
    } catch {
      this.errorMessage = 'Election data could not be loaded. Please try again later.';
    }
  }

  /** Changes one answer and recalculates agreements. */
  changeVote(statementId: number, value: Opinion | null): void {
    this.votes.update(votes =>
      votes.map(vote =>
        vote.statementId === statementId ? { ...vote, value } : vote,
      ),
    );
    localStorage.setItem('votes', JSON.stringify(this.votes()));

    this.calculateAndSortAgreements();
  }

  /** Changes one answer's matching weight. */
  changeVoteWeight(statementId: number, weight: 1 | 2): void {
    this.votes.update(votes =>
      votes.map(vote =>
        vote.statementId === statementId ? { ...vote, weight } : vote,
      ),
    );
    localStorage.setItem('votes', JSON.stringify(this.votes()));

    this.calculateAndSortAgreements();
  }

  getVote(statementId: number): Vote {
    return (
      this.votes().find(vote => vote?.statementId === statementId) ?? {
        statementId,
        value: null,
        weight: 1,
      }
    );
  }

  calculateAndSortAgreements(): void {
    this.agreements = this.matchingService.calculateAgreements(
      this.votes(),
      this.parties,
      this.positions,
    );
  }
}
