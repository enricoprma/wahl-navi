import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideHttpClient } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";

import {
  ElectionDataLoadError,
  ElectionDataService,
} from "./election-data.service";

describe("ElectionDataService", () => {
  let service: ElectionDataService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ElectionDataService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it("loads and caches generated YAML at a relative data path", async () => {
    const firstRequest = service.getMetadata();
    const secondRequest = service.getMetadata();

    expect(secondRequest).toBe(firstRequest);
    const request = httpTesting.expectOne("data/metadata.yaml");
    request.flush(
      "datasetId: exampleton-2026-v1\nappTitle: Wahl-Navi\nlocation: Exampleton\nelectionTitle: Exampleton Election\ndisclaimer: Fictional demo\n",
    );

    await expectAsync(firstRequest).toBeResolvedTo({
      datasetId: "exampleton-2026-v1",
      appTitle: "Wahl-Navi",
      location: "Exampleton",
      electionTitle: "Exampleton Election",
      disclaimer: "Fictional demo",
    });
    await expectAsync(service.getMetadata()).toBeResolvedTo({
      datasetId: "exampleton-2026-v1",
      appTitle: "Wahl-Navi",
      location: "Exampleton",
      electionTitle: "Exampleton Election",
      disclaimer: "Fictional demo",
    });
    httpTesting.expectNone("data/metadata.yaml");
  });

  it("reports the relative path and permits a later retry after a load error", async () => {
    const failedRequest = service.getStatements();
    const request = httpTesting.expectOne("data/statements.yaml");
    request.flush("Not found", { status: 404, statusText: "Not Found" });

    await expectAsync(failedRequest).toBeRejectedWith(
      jasmine.objectContaining<ElectionDataLoadError>({
        name: "ElectionDataLoadError",
        path: "data/statements.yaml",
      }),
    );

    const retry = service.getStatements();
    httpTesting
      .expectOne("data/statements.yaml")
      .flush("- id: 1\n  text: Test\n  explanation: null\n  keywords: Test\n");
    await expectAsync(retry).toBeResolvedTo([
      { id: 1, text: "Test", explanation: null, keywords: "Test" },
    ]);
  });
});
