import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { runPython } from "./python-runner.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

console.log("Running Python importer tests...");
process.exitCode = runPython(["-m", "pytest", "tools/tests"], {
  cwd: repositoryRoot,
});
