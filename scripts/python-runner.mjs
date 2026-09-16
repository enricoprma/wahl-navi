import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIN_PYTHON_VERSION = {
  major: 3,
  minor: 10,
};

function getWindowsPythonCandidates() {
  const installRoot = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'Programs', 'Python')
    : undefined;
  if (!installRoot || !existsSync(installRoot)) return [];

  try {
    return readdirSync(installRoot)
      .filter((directory) => /^Python\d+$/.test(directory))
      .sort(
        (a, b) =>
          Number(b.slice('Python'.length)) -
          Number(a.slice('Python'.length)),
      )
      .map((directory) => ({
        command: join(installRoot, directory, 'python.exe'),
        arguments: [],
      }))
      .filter(({ command }) => existsSync(command));
  } catch {
    return [];
  }
}

const pythonCandidates = process.platform === 'win32'
  ? [
      { command: 'py', arguments: ['-3'] },
      ...getWindowsPythonCandidates(),
      { command: 'python', arguments: [] },
      { command: 'python3', arguments: [] },
    ]
  : [
      { command: 'python3', arguments: [] },
      { command: 'python', arguments: [] },
    ];

export function findPython() {
  for (const candidate of pythonCandidates) {
    const version = getPythonVersion(
      candidate.command,
      candidate.arguments,
    );

    if (version && isSupportedPython(version)) {
      return {
        ...candidate,
        version,
      };
    }
  }

  return undefined;
}

function isSupportedPython(version) {
  return version.major > MIN_PYTHON_VERSION.major
    || (version.major === MIN_PYTHON_VERSION.major && version.minor >= MIN_PYTHON_VERSION.minor);
}

function getPythonVersion(command, commandArguments) {
  const result = spawnSync(
    command,
    [...commandArguments, '--version'],
    {
      encoding: 'utf8',
    },
  );

  if (result.error || result.status !== 0) {
    return undefined;
  }

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  const match = output.match(/Python\s+(\d+)\.(\d+)(?:\.(\d+))?/);

  if (!match) {
    return undefined;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3] ?? 0),
  };
}

export function runPython(argumentsToRun, options = {}) {
  const python = findPython();
  if (!python) {
    console.error(`Error: Python ${MIN_PYTHON_VERSION.major}.${MIN_PYTHON_VERSION.minor} or newer was not found.`);
    return 1;
  }

  console.log(`Using Python ${python.version.major}.${python.version.minor}.${python.version.patch}: ${python.command}`,);
  const result = spawnSync(
    python.command,
    [...python.arguments, ...argumentsToRun],
    { stdio: 'inherit', ...options },
  );

  if (result.error) {
    console.error(`Error: could not start Python: ${result.error.message}`);
    return 1;
  }
  return Number.isInteger(result.status) ? result.status : 1;
}
