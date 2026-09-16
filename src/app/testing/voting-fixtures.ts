import { ElectionDataService } from "../services/election-data.service";
import { PersistedVotingState } from "../services/voting-state.service";
import { Party } from "../models/party.model";
import { Position } from "../models/position.model";

export const statements = [10, 42, 99].map((id) => ({
  id,
  text: `Statement ${id}`,
  keywords: `Topic ${id}`,
  explanation: null,
}));
export const parties: Party[] = [
  {
    id: "early-birds",
    name: "First Party",
    shortName: "FP",
    color: "#123456",
    description: "",
  },
  {
    id: "night-owls",
    name: "Second Party",
    shortName: "SP",
    color: "#654321",
    description: "",
  },
];
export const positions: Position[] = parties.flatMap((party, index) =>
  statements.map((statement) => ({
    partyId: party.id,
    statementId: statement.id,
    opinion: index === 0 ? (1 as const) : (-1 as const),
    justification: null,
  })),
);

export function electionDataStub(): jasmine.SpyObj<ElectionDataService> {
  const data = jasmine.createSpyObj<ElectionDataService>(
    "ElectionDataService",
    ["getMetadata", "getStatements", "getParties", "getPositions"],
  );
  data.getMetadata.and.resolveTo({
    datasetId: "test-election",
    appTitle: "Wahl-Navi",
    location: "Exampleton",
    electionTitle: "Test Election",
    disclaimer: "Fictional data",
  });
  data.getStatements.and.resolveTo(statements);
  data.getParties.and.resolveTo(parties);
  data.getPositions.and.resolveTo(positions);
  return data;
}

export function savedState(
  overrides: Partial<PersistedVotingState> = {},
): PersistedVotingState {
  return {
    schemaVersion: 2,
    datasetId: "test-election",
    currentStatementId: 10,
    votes: [],
    draftWeights: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Each spec gets isolated browser storage without touching actual stored sessions. */
export function mockVotingStorage(): Map<string, string> {
  const records = new Map<string, string>();
  spyOn(Storage.prototype, "getItem").and.callFake(
    (key) => records.get(key) ?? null,
  );
  spyOn(Storage.prototype, "setItem").and.callFake((key, value) => {
    records.set(key, value);
  });
  spyOn(Storage.prototype, "removeItem").and.callFake((key) => {
    records.delete(key);
  });
  return records;
}
