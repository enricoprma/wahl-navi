# Wahl-Navi

Wahl-Navi is a data-driven Angular election-orientation app that compares user
responses with party positions stored as YAML.

This portfolio edition uses entirely fictional parties, statements, positions,
and original placeholder logos. The included dataset describes the fictional
Exampleton City Council Election 2026.

## Development

Requirements:

- Node.js and npm
- Python 3 only when exporting a compatible workbook

Install dependencies and start the Angular development server:

```bash
npm install
npm start
```

The application is then available at `http://localhost:4200/`.

## Production build

```bash
npm run build
```

Build output is written to `dist/wahl-navi/`.

## Data contracts

The application loads these files from `public/data/`:

- `metadata.yaml`
- `statements.yaml`
- `positions.yaml`
- `parties.yaml`

Party relationships and logo filenames use stable party IDs. Statement
relationships use stable numeric statement IDs. Election copy belongs in
`metadata.yaml`; Angular environments contain build settings only.

The workbook importer remains in `tools/export_xlsx_to_yaml.py`. Its validation
and CLI hardening are planned for a later refactor phase.

## Routes

The app uses hash-based routing for static hosting:

- `#/vote`
- `#/results`

## License

See [LICENSE](LICENSE).
