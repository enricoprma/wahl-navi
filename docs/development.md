# Development

[Project overview](../README.md) · [Creating an election](creating-an-election.md)

Follow the [quick start](../README.md#quick-start) to install dependencies. Run all commands below from the repository root. For workbook requirements and deployment instructions, see the election guide.

## Contents

- [Architecture](#architecture)
- [Persistence](#persistence)
- [Data pipeline](#data-pipeline)
- [Repository structure](#repository-structure)
- [npm workflows](#npm-workflows)
- [Importer CLI](#importer-cli)
- [Testing and CI](#testing-and-ci)
- [Tech stack](#tech-stack)

## Architecture

### `ElectionDataService`

Loads and caches the generated YAML dataset used by the application.

### `PartyService`

Provides the authoritative party and party-position lookups based on stable IDs.

### `MatchingService`

Calculates agreement from the supplied votes, parties, and positions independently from the UI and data-loading services.

### Angular components

Present the questionnaire, results, party details, and full comparison overview.

### `VotingStateService`

Owns questionnaire progress and persistence. Loads dataset metadata and statement IDs through `ElectionDataService` to validate restored state.

`EvaluationComponent` loads the data and passes votes, parties, and positions to `MatchingService`. See the [agreement calculation](../README.md#agreement-calculation) for the scoring rules.

## Persistence

Voting progress is stored in the browser under the namespaced key:

```text
wahl-navi.voting-state
```

The persisted payload is versioned and contains:

- the active dataset ID
- the current statement ID
- votes
- draft weights
- the update time

On startup, Wahl-Navi restores only valid state for the active dataset. The current persistence schema is version 2. Valid version-1 records are migrated in memory by adding empty draft weights, then saved as version 2 on the next user change.

Malformed records, unsupported schema versions, mismatched dataset IDs, and invalid statement references are ignored safely. Saved progress does not expire based on age; `updatedAt` is validated as a timestamp but is not an expiry time. Change `datasetId` when revising statement meanings or making other incompatible dataset changes.

Restarting the questionnaire removes only Wahl-Navi's own storage entry; it does not clear unrelated browser storage.

No voting state is sent to a backend.

## Data pipeline

The Excel workbook is the human-editable source of truth for election content.

The Python importer:

- validates workbook structure
- validates IDs and cross-references
- validates the full position matrix
- normalizes optional blank cells
- converts supported HTTP(S) Markdown links to safe anchors
- rejects invalid input with a non-zero exit code
- produces deterministic YAML
- checks that each required logo exists, has the exact filename, and contains nonempty readable data
- copies the files without validating SVG markup
- copies accepted logo files to the runtime asset directory

Generated YAML should never contain spreadsheet `.nan` values.

## Repository structure

```text
data/                      Source election datasets
docs/                      Election setup and developer guides
public/data/               Generated YAML; ignored by Git
public/logos/parties/       Generated runtime logos; ignored by Git
scripts/                   Cross-platform npm/Python helpers
src/app/components/         Questionnaire, results, dialogs, and overview UI
src/app/guards/             Route guards
src/app/models/             Election and voting domain models
src/app/services/           Data, party, matching, and voting-state services
src/app/testing/            Shared Angular test fixtures
tools/                     Python importer
tools/tests/                Importer pytest suite
.github/workflows/          Continuous integration
wahl-navi.config.json       Active dataset configuration
```

## npm workflows

| Command                | Purpose                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm start`            | Export the dataset and start the development server.                                                                   |
| `npm run watch`        | Export the dataset and start an Angular development watch build.                                                       |
| `npm run data:check`   | Validate the workbook and logos without generating files.                                                              |
| `npm run data:export`  | Regenerate runtime YAML and party logos.                                                                               |
| `npm run build`        | Export the dataset and create a production build.                                                                      |
| `npm run test:data`    | Run Python importer tests.                                                                                             |
| `npm run format:check` | Check formatting.                                                                                                      |
| `npm run format`       | Apply formatting to the source/configuration files covered by the npm script.                                          |
| `npm run lint`         | Run ESLint.                                                                                                            |
| `npm test`             | Run Angular tests in headless Chrome.                                                                                  |
| `npm run check`        | Run importer tests, dataset validation, formatting checks, lint, Angular tests, and a production build, in that order. |

The start, watch, and build lifecycle hooks export the dataset once before Angular starts. After editing the workbook or logos during a running session, run `npm run data:export` again or restart the command.

## Importer CLI

The npm workflows are the recommended interface for normal use.

The Python importer can also be called directly when working on the data pipeline itself. These examples use Bash line continuation; in PowerShell, put each command on a single line.

```bash
python tools/export_xlsx_to_yaml.py \
  data/exampleton/election.xlsx \
  --logos data/exampleton/logos \
  --output public/data \
  --logos-output public/logos/parties
```

Validation-only mode:

```bash
python tools/export_xlsx_to_yaml.py \
  data/exampleton/election.xlsx \
  --logos data/exampleton/logos \
  --check
```

Add `--verbose` for paths, dataset information, record counts, optional blanks, converted links, logo information, and operating mode.

On Windows, `py -3` can be used instead of `python`.

## Testing and CI

The importer test suite creates temporary workbooks and logo directories so validation and export behavior can be tested without modifying the configured dataset.

The Angular suite focuses on application behavior such as:

- voting and navigation
- weighting
- persistence and restoration
- skipped versus unanswered statements
- safe result-route handling
- editing answers from results
- overview and party-position behavior

GitHub Actions runs the same core quality checks used by `npm run check`.

`npm test` and `npm run check` need a Chrome/Chromium executable. If it is not detected automatically, set `CHROME_BIN` before running the command:

```bash
export CHROME_BIN=/path/to/chromium
npm test
```

In PowerShell:

```powershell
$env:CHROME_BIN = 'C:\path\to\chrome.exe'
npm test
```

## Tech stack

- Angular 19
- Angular Material
- Bootstrap
- Sass
- RxJS
- TypeScript
- Python 3.10+
- pandas
- openpyxl
- PyYAML
- Jasmine / Karma
- pytest
- ESLint
- Prettier
- GitHub Actions
