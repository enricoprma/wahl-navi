import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { parse as parseYaml } from 'yaml';

import { environment } from '../../environments/environment';
import { ElectionMetadata } from '../models/election-metadata.model';
import { Party } from '../models/party.model';
import { Position } from '../models/position.model';
import { Statement } from '../models/statement.model';

@Injectable({
  providedIn: 'root',
})
export class YamlDataService {
  private metadata?: ElectionMetadata;
  private statements?: Statement[];
  private positions?: Position[];
  private parties?: Party[];

  private readonly baseUrl = environment.dataBasePath.replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  /** Returns parsed metadata and caches the result. */
  async getMetadata(): Promise<ElectionMetadata> {
    if (this.metadata) return this.metadata;
    this.metadata = await this.loadYaml<ElectionMetadata>('metadata.yaml');
    return this.metadata;
  }

  /** Returns parsed statements and caches the result. */
  async getStatements(): Promise<Statement[]> {
    if (this.statements) return this.statements;
    this.statements = await this.loadYaml<Statement[]>('statements.yaml');
    return this.statements;
  }

  async getPositions(): Promise<Position[]> {
    if (this.positions) return this.positions;
    this.positions = await this.loadYaml<Position[]>('positions.yaml');
    return this.positions;
  }

  async getParties(): Promise<Party[]> {
    if (this.parties) return this.parties;
    this.parties = await this.loadYaml<Party[]>('parties.yaml');
    return this.parties;
  }

  private async loadYaml<T>(fileName: string): Promise<T> {
    const raw = await firstValueFrom(
      this.http.get(`${this.baseUrl}/${fileName}`, { responseType: 'text' }),
    );
    return parseYaml(raw) as T;
  }
}
