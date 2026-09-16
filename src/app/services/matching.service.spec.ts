import { Party } from "../models/party.model";
import { Position } from "../models/position.model";
import { Vote } from "../models/vote.model";
import { MatchingService } from "./matching.service";

describe("MatchingService", () => {
  const service = new MatchingService();
  const parties: Party[] = [
    {
      id: "early-birds",
      name: "Early Bird Party",
      shortName: "EBP",
      color: "#F59E0B",
      description: "",
    },
    {
      id: "night-owls",
      name: "Night Owl Alliance",
      shortName: "NOA",
      color: "#4338CA",
      description: "",
    },
  ];
  const positions: Position[] = [
    { partyId: "early-birds", statementId: 1, opinion: 1, justification: null },
    {
      partyId: "early-birds",
      statementId: 2,
      opinion: -1,
      justification: null,
    },
    { partyId: "night-owls", statementId: 1, opinion: -1, justification: null },
    { partyId: "night-owls", statementId: 2, opinion: -1, justification: null },
  ];

  it("awards full credit for exact matches and excludes unanswered statements", () => {
    const votes: Vote[] = [
      { statementId: 1, value: 1, weight: 1 },
      { statementId: 2, value: null, weight: 2 },
    ];

    expect(service.calculateAgreements(votes, parties, positions)).toEqual([
      { party: parties[0], percent: 100 },
      { party: parties[1], percent: 0 },
    ]);
  });

  it("applies double weighting before calculating the percentage", () => {
    const votes: Vote[] = [
      { statementId: 1, value: 1, weight: 2 },
      { statementId: 2, value: -1, weight: 1 },
    ];

    expect(service.calculateAgreements(votes, parties, positions)[0]).toEqual({
      party: parties[0],
      percent: 100,
    });
    expect(
      service.calculateAgreements(votes, parties, positions)[1].percent,
    ).toBe(33);
  });

  it("returns zero safely when every vote is unanswered", () => {
    const votes: Vote[] = [{ statementId: 1, value: null, weight: 2 }];

    expect(
      service
        .calculateAgreements(votes, parties, positions)
        .map((result) => result.percent),
    ).toEqual([0, 0]);
  });

  it("rounds once and orders results descending by the rounded percentage", () => {
    const votes: Vote[] = [
      { statementId: 1, value: 1, weight: 1 },
      { statementId: 2, value: 1, weight: 2 },
    ];

    expect(service.calculateAgreements(votes, parties, positions)).toEqual([
      { party: parties[0], percent: 33 },
      { party: parties[1], percent: 0 },
    ]);
  });
});
