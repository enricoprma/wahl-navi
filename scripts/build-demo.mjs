import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { runPython } from './python-runner.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

function parseBaseHref(argumentsToParse) {
  if (argumentsToParse.length === 0) return undefined;

  if (argumentsToParse.length === 1 && argumentsToParse[0].startsWith('--base-href=')) {
    return argumentsToParse[0].slice('--base-href='.length);
  }
  if (argumentsToParse.length === 2 && argumentsToParse[0] === '--base-href') {
    return argumentsToParse[1];
  }

  throw new Error('Usage: npm run build -- [--base-href /deployment-path/]');
}

let baseHref;
try {
  baseHref = parseBaseHref(process.argv.slice(2));
  if (baseHref !== undefined && baseHref.length === 0) {
    throw new Error('The base href must not be empty.');
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 2;
}

if (process.exitCode) {
  // Do not start a partial build after invalid build arguments.
} else {
  console.log('Exporting election data...');
  const importExitCode = runPython(
    ['tools/export_xlsx_to_yaml.py', 'data/example-election.xlsx'],
    { cwd: repositoryRoot },
  );

  if (importExitCode !== 0) {
    console.error('Error: Angular build was not started because data import failed.');
    process.exitCode = importExitCode;
  } else {
    const angularCli = resolve(
      repositoryRoot,
      'node_modules',
      '@angular',
      'cli',
      'bin',
      'ng.js',
    );

    if (!existsSync(angularCli)) {
      console.error('Error: Angular CLI is not installed. Run npm ci first.');
      process.exitCode = 1;
    } else {
      const angularArguments = ['build', '--configuration', 'production'];
      if (baseHref !== undefined) {
        angularArguments.push('--base-href', baseHref);
      }

      console.log('Building Angular application...');
      const buildResult = spawnSync(process.execPath, [angularCli, ...angularArguments], {
        cwd: repositoryRoot,
        stdio: 'inherit',
      });
      if (buildResult.error) {
        console.error(`Error: could not start Angular build: ${buildResult.error.message}`);
        process.exitCode = 1;
      } else {
        process.exitCode = Number.isInteger(buildResult.status) ? buildResult.status : 1;
      }
    }
  }
}
