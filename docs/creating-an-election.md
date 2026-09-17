# Creating an election

[Project overview](../README.md) · [Developer guide](development.md)

Follow the [quick start](../README.md#quick-start) to install dependencies first. Run all commands below from the repository root.

## Contents

- [Create a dataset directory](#1-create-a-dataset-directory)
- [Configure the active dataset](#2-configure-the-active-dataset)
- [Fill the workbook](#3-fill-the-workbook)
- [Add party logos](#4-add-party-logos)
- [Validate the dataset](#5-validate-the-dataset)
- [Export generated runtime data](#6-export-generated-runtime-data)
- [Preview locally](#7-preview-locally)
- [Create a production build](#8-create-a-production-build)

You do not need to modify the Angular application or the build scripts to create another Wahl-Navi instance.

Wahl-Navi uses **one configured election dataset per build**. A dataset consists of:

1. an Excel workbook
2. one SVG logo for every party

The repository contains Exampleton only as a ready-to-run fictional example.

## 1. Create a dataset directory

The bundled example follows this structure:

```text
data/
└── exampleton/
    ├── election.xlsx
    └── logos/
        ├── early-birds.svg
        ├── free-wifi.svg
        ├── green-benches.svg
        ├── night-owls.svg
        └── pigeon-pragmatists.svg
```

For a new election, copy that structure or create an equivalent directory:

```text
data/
└── my-election/
    ├── election.xlsx
    └── logos/
        ├── party-one.svg
        ├── party-two.svg
        └── party-three.svg
```

## 2. Configure the active dataset

`wahl-navi.config.json` selects the dataset used by the normal npm workflows.

The repository is configured for Exampleton by default:

```json
{
  "workbook": "data/exampleton/election.xlsx",
  "logos": "data/exampleton/logos"
}
```

To work on another election, only change these paths:

```json
{
  "workbook": "data/my-election/election.xlsx",
  "logos": "data/my-election/logos"
}
```

The generic scripts contain no Exampleton-specific workbook or logo path.

## 3. Fill the workbook

The workbook contains four required sheets. Sheet names and column headers are case-sensitive.

| Sheet        | Required columns                                       |
| ------------ | ------------------------------------------------------ |
| `Metadata`   | `key`, `value`                                         |
| `Statements` | `id`, `text`, `explanation`, `keywords`                |
| `Positions`  | `statement_id`, `party_id`, `opinion`, `justification` |
| `Parties`    | `id`, `name`, `short_name`, `color`, `description`     |

All listed columns must exist. Every field must be nonblank except `Statements.explanation` and `Positions.justification`. Include at least one statement and one party; completely empty rows are ignored.

### Metadata

`Metadata` must contain:

- `datasetId`
- `appTitle`
- `location`
- `electionTitle`
- `disclaimer`

`datasetId` identifies the election dataset and is also used when restoring locally persisted voting state. Use a new stable ID when creating a different election or an incompatible dataset revision.

### Statements

Each statement needs a unique, stable integer `id`. The importer sorts statements by ascending ID, which determines their questionnaire order regardless of workbook row order.

`text` and `keywords` must be nonblank. `keywords` is used as the shorter statement label in comparison views. `explanation` may be blank.

### Parties

Each party needs a unique, stable `id`. All party fields, including `name`, `short_name`, and `description`, must be nonblank.

Party IDs:

- use lowercase letters and numbers
- may contain single hyphens between groups of letters or numbers, but cannot start or end with a hyphen
- are used by positions and logo filenames

Party colors must use `#RRGGBB` values, including the leading `#`, for example `#1A2B3C`.

### Positions

Every party must have exactly one position for every statement.

`opinion` must be one of:

```text
agree
neutral
disagree
```

`statement_id`, `party_id`, and `opinion` must be nonblank. `justification` may be blank. HTTP(S) Markdown links such as `[More information](https://example.com)` are supported in statement explanations and position justifications.

The importer rejects missing or duplicate relationships and incomplete party/statement matrices.

## 4. Add party logos

Every party needs one SVG file.

The filename must match the party ID exactly:

```text
Party ID: green-benches
Logo:     green-benches.svg
```

For example:

```text
data/my-election/logos/
├── party-one.svg
├── party-two.svg
└── party-three.svg
```

Validation fails when a required logo is missing, empty, or uses the wrong filename casing.

## 5. Validate the dataset

Run:

```bash
npm run data:check
```

This validates the configured workbook and party logos **without writing generated files**.

Validation covers, among other things:

- required workbook sheets and columns
- metadata
- statement and party IDs
- duplicate IDs
- references between statements, parties, and positions
- valid opinions
- party colors
- the complete party/statement position matrix
- required text fields
- required party logos

Validation errors include useful context where possible and return a non-zero exit code.

For additional output:

```bash
npm run data:check -- --verbose
```

## 6. Export generated runtime data

Run:

```bash
npm run data:export
```

The configured source dataset is transformed into the files consumed by the Angular application:

```text
data/<dataset>/election.xlsx
data/<dataset>/logos/
          │
          ▼
   validator / exporter
          │
          ├── public/data/
          │   ├── metadata.yaml
          │   ├── statements.yaml
          │   ├── positions.yaml
          │   └── parties.yaml
          │
          └── public/logos/parties/
              └── <party-id>.svg
```

`public/data/` and `public/logos/parties/` are generated outputs and are ignored by Git.

Edit the source dataset under `data/`, not the generated files under `public/`.

When the active dataset changes, generated party SVGs that are no longer required are removed during export.

## 7. Preview locally

Run:

```bash
npm start
```

The `prestart` lifecycle automatically exports the configured dataset before Angular starts, so normal development does not require a separate manual export step.

If you edit the workbook or logos while the development server is running, run `npm run data:export`. After exporting, reload the browser page if it has not reloaded automatically. Election data is cached for the current application session.

## 8. Create a production build

Run:

```bash
npm run build
```

The `prebuild` lifecycle automatically exports the configured dataset before Angular creates the production bundle.

Deploy the contents of:

```text
dist/wahl-navi/browser/
```

to any static web host.

For a non-root deployment, pass a trailing-slash base href:

```bash
npm run build -- --base-href /my-election/
```

Wahl-Navi uses hash routing, so application routes such as `#/vote` and `#/results` do not require server-side SPA rewrite rules.

Wahl-Navi is a standard statically hosted Angular application. It does not require a backend and does not include a service worker or PWA runtime.
