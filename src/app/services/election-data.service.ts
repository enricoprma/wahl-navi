import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { parse as parseYaml } from "yaml";

import { environment } from "../../environments/environment";
import { ElectionMetadata } from "../models/election-metadata.model";
import { Party } from "../models/party.model";
import { Position } from "../models/position.model";
import { Statement } from "../models/statement.model";

/** Identifies a generated data file that could not be loaded or parsed. */
export class ElectionDataLoadError extends Error {
  constructor(
    public readonly path: string,
    cause: unknown,
  ) {
    super(`Unable to load election data from "${path}".`);
    this.name = "ElectionDataLoadError";
    this.cause = cause;
  }
}

/** Loads and caches the generated election dataset. */
@Injectable({
  providedIn: "root",
})
export class ElectionDataService {
  private readonly cache = new Map<string, Promise<unknown>>();
  private readonly basePath = environment.dataBasePath.replace(/\/$/, "");

  constructor(private readonly http: HttpClient) {}

  getMetadata(): Promise<ElectionMetadata> {
    return this.loadYaml<ElectionMetadata>("metadata.yaml");
  }

  getStatements(): Promise<Statement[]> {
    return this.loadYaml<Statement[]>("statements.yaml");
  }

  getParties(): Promise<Party[]> {
    return this.loadYaml<Party[]>("parties.yaml");
  }

  getPositions(): Promise<Position[]> {
    return this.loadYaml<Position[]>("positions.yaml");
  }

  private loadYaml<T>(fileName: string): Promise<T> {
    const existing = this.cache.get(fileName) as Promise<T> | undefined;
    if (existing) return existing;

    const path = `${this.basePath}/${fileName}`;
    const request = firstValueFrom(
      this.http.get(path, { responseType: "text" }),
    )
      .then((raw) => parseYaml(raw) as T)
      .catch((cause) => {
        this.cache.delete(fileName);
        throw new ElectionDataLoadError(path, cause);
      });

    this.cache.set(fileName, request);
    return request;
  }
}
