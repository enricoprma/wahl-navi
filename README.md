# Wahl-Navi

Wahl-Navi is a data-driven Angular election-orientation app that compares user
responses with party positions maintained in Excel and exported to YAML.

This portfolio edition uses entirely fictional parties, statements, positions,
and original placeholder logos. The included dataset describes the fictional
Exampleton City Council Election 2026.

## Development

Requirements:

- Node.js and npm
- Python 3.10 or newer for the data importer

Install dependencies and start the Angular development server:

```bash
npm install
npm start
```

The application is then available at `http://localhost:4200/`.

Install the importer and test dependencies when working with election data:

```bash
python -m pip install -r requirements-dev.txt
```

On Windows, `py -3` can be used instead of `python` when only the Python
launcher is available.

## Production build

```bash
npm run build
```

Build output is written to `dist/wahl-navi/`.

The build first validates and exports `data/example-election.xlsx`; Angular is
not started when the import fails, and the failing exit code is returned. The
workflow discovers Python 3 using `py -3`, `python`, or `python3`, so it works
with the normal Windows launcher as well as common macOS and Linux setups.

To publish below a path such as `https://example.org/wahl-navi/`, provide a
trailing-slash base href:

```bash
npm run build -- --base-href /wahl-navi/
```

Wahl-Navi uses hash routing, so static hosts do not need rewrite rules for
`#/vote` and `#/results`. Deploy the complete contents of
`dist/wahl-navi/browser/` to the selected document root or subpath.

## Data pipeline

The committed example workbook at `data/example-election.xlsx` is the source
of truth for the fictional Exampleton dataset. The importer validates that
workbook and generates the files consumed by the Angular application:

```text
data/example-election.xlsx
        |
        v
tools/export_xlsx_to_yaml.py
        |
        v
public/data/*.yaml
```

The generated files are:

- `metadata.yaml`
- `statements.yaml`
- `positions.yaml`
- `parties.yaml`

Edit the workbook and regenerate these files rather than editing generated YAML
by hand.

### Workbook format

The workbook uses four required sheets with exact, case-sensitive names and
column headers:

| Sheet | Required columns |
| --- | --- |
| `Metadata` | `key`, `value` |
| `Statements` | `id`, `text`, `explanation`, `keywords` |
| `Positions` | `statement_id`, `party_id`, `opinion`, `justification` |
| `Parties` | `id`, `name`, `short_name`, `color`, `description` |

`Metadata` must define `datasetId`, `appTitle`, `location`, `electionTitle`,
and `disclaimer`. Party IDs use lowercase letters, numbers, and single hyphens.
Party colors use six-digit hex values. Position opinions must be `agree`,
`neutral`, or `disagree`.

`explanation` and `justification` are optional. Blank cells become YAML `null`
values and never `.nan`. All other text fields are required.

Party relationships and logo filenames use stable party IDs. Statement
relationships use stable numeric statement IDs. Election copy belongs in
`metadata.yaml`; Angular environments contain build settings only.

### Validate and export

Validate the example workbook without changing generated files:

```bash
python tools/export_xlsx_to_yaml.py data/example-election.xlsx --check
```

Generate YAML in the default repository location, `public/data/`:

```bash
python tools/export_xlsx_to_yaml.py data/example-election.xlsx
```

Use `--verbose` to show the workbook path, dataset ID, validated record counts,
optional blanks, converted links, and operating mode. Use `--output
<directory>` to write to a different location. The default output path is
resolved from the repository, so it does not depend on the current working
directory.

The importer rejects missing sheets or columns, duplicate IDs, unknown
references, invalid opinions or colors, duplicate positions, incomplete
party-position matrices, and empty required text fields. Errors identify the
sheet and row where possible. Validation failures return a non-zero exit code.

Markdown links in the form `[label](https://example.com)` are converted to safe
anchors. Only HTTP and HTTPS URLs are linked, normal text is escaped, and raw
spreadsheet HTML is not trusted.

Output ordering and formatting are deterministic: exporting an unchanged
workbook produces unchanged YAML.

### Importer tests

Run the importer test suite from the repository root:

```bash
python -m pytest tools/tests
```

The tests create temporary workbooks and cover successful export, missing-value
normalization, safe link conversion, check mode, and each supported validation
failure. They do not overwrite `public/data/`.

## Routes

The app uses hash-based routing for static hosting:

- `#/vote`
- `#/results`

## License

See [LICENSE](LICENSE).
