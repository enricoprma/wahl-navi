import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { runPython } from './python-runner.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const importerArguments = [
  'tools/export_xlsx_to_yaml.py',
  'data/example-election.xlsx',
  ...process.argv.slice(2),
];

console.log('Running election data importer...');
process.exitCode = runPython(importerArguments, { cwd: repositoryRoot });
