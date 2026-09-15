import { computed, Injectable, signal } from '@angular/core';

import { Opinion } from '../models/opinion.model';
import { Vote } from '../models/vote.model';
import { ElectionDataService } from './election-data.service';

export const VOTING_STATE_STORAGE_KEY = 'wahl-navi.voting-state';
const SCHEMA_VERSION = 1;

/** The versioned state persisted for the currently loaded election dataset. */
export interface PersistedVotingState {
  schemaVersion: 1;
  datasetId: string;
  currentStatementId: number | null;
  votes: Vote[];
  updatedAt: string;
}

/** Owns voting state, including the only local-storage entry used by Wahl-Navi. */
@Injectable({ providedIn: 'root' })
export class VotingStateService {
  private readonly state = signal<PersistedVotingState | null>(null);
  private readonly draftWeights = signal(new Map<number, 1 | 2>());
  private initialization?: Promise<void>;
  private statementIds: number[] = [];
  private statementIdSet = new Set<number>();
  private datasetId = '';

  readonly votes = computed(() => this.state()?.votes ?? []);
  readonly currentStatementId = computed(() => this.state()?.currentStatementId ?? null);

  constructor(private readonly dataService: ElectionDataService) {}

  /** Loads the dataset context and restores valid persisted state before writes occur. */
  initialize(): Promise<void> {
    if (!this.initialization) {
      this.initialization = Promise.all([
        this.dataService.getMetadata(),
        this.dataService.getStatements(),
      ]).then(([metadata, statements]) => {
        this.datasetId = metadata.datasetId;
        this.statementIds = statements.map(statement => statement.id);
        this.statementIdSet = new Set(this.statementIds);
        this.state.set(this.readStoredState() ?? this.createState(null, []));
      }).catch(error => {
        this.initialization = undefined;
        throw error;
      });
    }
    return this.initialization;
  }

  /** A skip is meaningful progress, while merely opening the questionnaire is not. */
  hasProgress(): boolean {
    return this.votes().length > 0;
  }

  getVote(statementId: number): Vote | undefined {
    return this.votes().find(vote => vote.statementId === statementId);
  }

  getWeight(statementId: number): 1 | 2 {
    return this.getVote(statementId)?.weight ?? this.draftWeights().get(statementId) ?? 1;
  }

  setCurrentStatement(statementId: number): void {
    if (!this.statementIdSet.has(statementId)) return;
    this.updateState({ currentStatementId: statementId });
  }

  /** Moves through dataset order and returns the resulting statement ID. */
  navigate(direction: -1 | 1): number | null {
    const current = this.currentStatementId();
    const currentIndex = current === null ? 0 : this.statementIds.indexOf(current);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= this.statementIds.length) return current;
    const nextId = this.statementIds[nextIndex];
    this.setCurrentStatement(nextId);
    return nextId;
  }

  /** Records an answer or skip, preserving the currently selected weight. */
  answer(statementId: number, value: Opinion | null): void {
    if (!this.statementIdSet.has(statementId)) return;
    const vote: Vote = { statementId, value, weight: this.getWeight(statementId) };
    const votes = this.votes();
    const previous = votes.findIndex(existing => existing.statementId === statementId);
    const nextVotes = previous === -1
      ? [...votes, vote]
      : votes.map((existing, index) => index === previous ? vote : existing);
    this.draftWeights.update(weights => {
      const next = new Map(weights);
      next.delete(statementId);
      return next;
    });
    this.updateState({ votes: nextVotes, currentStatementId: statementId });
  }

  /** Changes a saved vote's weight, or prepares a weight for a future answer. */
  setWeight(statementId: number, weight: 1 | 2): void {
    if (!this.statementIdSet.has(statementId)) return;
    const vote = this.getVote(statementId);
    if (!vote) {
      this.draftWeights.update(weights => new Map(weights).set(statementId, weight));
      return;
    }
    this.updateState({
      votes: this.votes().map(existing =>
        existing.statementId === statementId ? { ...existing, weight } : existing,
      ),
    });
  }

  toggleWeight(statementId: number): void {
    this.setWeight(statementId, this.getWeight(statementId) === 1 ? 2 : 1);
  }

  /** Clears only Wahl-Navi's own persisted state and keeps legacy keys untouched. */
  reset(): void {
    this.draftWeights.set(new Map());
    this.state.set(this.createState(null, []));
    try {
      localStorage.removeItem(VOTING_STATE_STORAGE_KEY);
    } catch {
      // Storage can be disabled; the fresh in-memory state remains usable.
    }
  }

  private updateState(change: Partial<Pick<PersistedVotingState, 'currentStatementId' | 'votes'>>): void {
    const current = this.state() ?? this.createState(null, []);
    const next: PersistedVotingState = {
      ...current,
      ...change,
      updatedAt: new Date().toISOString(),
    };
    this.state.set(next);
    this.writeStoredState(next);
  }

  private createState(currentStatementId: number | null, votes: Vote[]): PersistedVotingState {
    return {
      schemaVersion: SCHEMA_VERSION,
      datasetId: this.datasetId,
      currentStatementId,
      votes,
      updatedAt: new Date().toISOString(),
    };
  }

  private readStoredState(): PersistedVotingState | undefined {
    try {
      const raw = localStorage.getItem(VOTING_STATE_STORAGE_KEY);
      if (!raw) return undefined;
      const parsed: unknown = JSON.parse(raw);
      return this.isValidStoredState(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  private writeStoredState(state: PersistedVotingState): void {
    try {
      localStorage.setItem(VOTING_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage failures must not prevent an active in-memory session.
    }
  }

  private isValidStoredState(value: unknown): value is PersistedVotingState {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<PersistedVotingState>;
    if (candidate.schemaVersion !== SCHEMA_VERSION || candidate.datasetId !== this.datasetId) return false;
    if (typeof candidate.updatedAt !== 'string' || Number.isNaN(Date.parse(candidate.updatedAt))) return false;
    if (candidate.currentStatementId !== null && !this.statementIdSet.has(candidate.currentStatementId as number)) return false;
    if (!Array.isArray(candidate.votes)) return false;

    const seen = new Set<number>();
    return candidate.votes.every(vote => {
      if (!vote || typeof vote !== 'object') return false;
      const item = vote as Vote;
      if (!this.statementIdSet.has(item.statementId) || seen.has(item.statementId)) return false;
      seen.add(item.statementId);
      return (item.value === -1 || item.value === 0 || item.value === 1 || item.value === null)
        && (item.weight === 1 || item.weight === 2);
    });
  }
}
