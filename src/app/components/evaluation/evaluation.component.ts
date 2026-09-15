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
import { YamlDataService } from '../../services/yaml-data.service';
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
  private readonly dataService = inject(YamlDataService);
  public readonly router = inject(Router);

  public parties: Party[] = [];
  public positions: Position[] = [];
  public statements: Statement[] = [];
  public votes = signal<Vote[]>([]);
  public agreements: AgreementResult[] = [];
  public location = '';

  async ngOnInit(): Promise<void> {
    const [metadata, parties, positions, statements] = await Promise.all([
      this.dataService.getMetadata(),
      this.dataService.getParties(),
      this.dataService.getPositions(),
      this.dataService.getStatements(),
    ]);

    this.location = metadata.location;
    this.parties = parties;
    this.positions = positions;
    this.statements = statements;

    this.shuffle(this.parties);

    const storedVotes = localStorage.getItem('votes');
    if (storedVotes) this.votes.set(JSON.parse(storedVotes));

    // Preserve the current behavior of materializing skipped array entries.
    const newVotes = this.votes();
    for (let index = 0; index < newVotes.length; index++) {
      if (newVotes[index] === null) {
        newVotes[index] = {
          statementId: index + 1,
          value: null,
          weight: 1,
        };
      }
    }
    this.votes.set(newVotes);

    this.calculateAndSortAgreements();
  }

  /** Changes one answer and recalculates agreements. */
  changeVote(index: number, value: Opinion | null): void {
    const newVote = this.votes()[index];
    newVote.value = value;

    const newVotes = this.votes();
    newVotes[index] = newVote;
    this.votes.set(newVotes);
    localStorage.setItem('votes', JSON.stringify(this.votes()));

    this.calculateAndSortAgreements();
  }

  /** Changes one answer's matching weight. */
  changeVoteWeight(index: number, weight: 1 | 2): void {
    const newVote = this.votes()[index];
    newVote.weight = weight;

    const newVotes = this.votes();
    newVotes[index] = newVote;
    this.votes.set(newVotes);
    localStorage.setItem('votes', JSON.stringify(this.votes()));

    this.calculateAndSortAgreements();
  }

  getPartyPosition(statementId: number, party: Party): Position {
    return this.positions.filter(
      position =>
        position.statementId === statementId && position.partyId === party.id,
    )[0];
  }

  calculateAndSortAgreements(): void {
    this.agreements = this.calculateAgreements(
      this.votes(),
      this.positions,
      this.parties,
    ).sort((first, second) => second.percent - first.percent);
  }

  /** Calculates agreement between the user's votes and each party. */
  private calculateAgreements(
    votes: Vote[],
    positions: Position[],
    parties: Party[],
  ): AgreementResult[] {
    return parties.map(party => {
      const partyPositions = new Map<number, Position>();
      positions
        .filter(position => position.partyId === party.id)
        .forEach(position =>
          partyPositions.set(position.statementId, position),
        );

      let matches = 0;
      let totalWeight = 0;

      for (const vote of votes) {
        if (vote.value === null) continue;

        const position = partyPositions.get(vote.statementId);
        totalWeight += vote.weight;

        if (position && position.opinion === vote.value) {
          matches += vote.weight;
        }
      }

      const percent =
        totalWeight > 0 ? Math.round((matches / totalWeight) * 100) : 0;
      return { party, percent };
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
