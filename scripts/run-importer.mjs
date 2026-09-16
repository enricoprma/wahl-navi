import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runPython } from "./python-runner.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

function readConfiguration() {
  const configPath = resolve(repositoryRoot, "wahl-navi.config.json");

  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${configPath}: ${error.message}`);
  }

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("wahl-navi.config.json must contain a JSON object.");
  }

  for (const key of ["workbook", "logos"]) {
    if (typeof config[key] !== "string" || !config[key].trim()) {
      throw new Error(
        `wahl-navi.config.json: "${key}" must be a nonempty path.`,
      );
    }
  }

  return {
    workbook: resolve(repositoryRoot, config.workbook),
    logos: resolve(repositoryRoot, config.logos),
  };
}

function requirePath(path, kind) {
  let stats;
  try {
    stats = statSync(path);
  } catch (error) {
    throw new Error(`Cannot access ${kind}: ${path}: ${error.message}`);
  }

  const valid = kind === "workbook" ? stats.isFile() : stats.isDirectory();
  if (!valid) {
    throw new Error(
      `Expected ${kind === "workbook" ? "a file" : "a directory"}: ${path}`,
    );
  }
}

try {
  const flags = process.argv.slice(2);

  for (const flag of flags) {
    if (!["--check", "--verbose"].includes(flag)) {
      throw new Error(
        `Unsupported argument "${flag}". Use --check or --verbose. ` +
          "Select dataset paths in wahl-navi.config.json.",
      );
    }
  }

  const config = readConfiguration();
  requirePath(config.workbook, "workbook");
  requirePath(config.logos, "logos directory");

  console.log(`Election workbook: ${config.workbook}`);
  console.log(`Party logos: ${config.logos}`);

  process.exitCode = runPython(
    [
      resolve(repositoryRoot, "tools/export_xlsx_to_yaml.py"),
      config.workbook,
      "--logos",
      config.logos,
      "--output",
      resolve(repositoryRoot, "public/data"),
      "--logos-output",
      resolve(repositoryRoot, "public/logos/parties"),
      ...flags,
    ],
    { cwd: repositoryRoot },
  );
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}