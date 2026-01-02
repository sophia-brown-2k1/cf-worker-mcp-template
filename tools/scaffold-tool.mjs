#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const TEMPLATE_PATH = path.resolve("tools/template/tool.ts");
const REGISTRY_PATH = path.resolve("src/mcp-tools/registry.ts");
const TOOLS_DIR = path.resolve("src/mcp-tools");

const [rawName, ...descParts] = process.argv.slice(2);
const description = descParts.join(" ").trim() || "TODO: describe the tool";

if (!rawName) {
  console.error(
    "Usage: node tools/scaffold-tool.mjs <tool-name> [description]"
  );
  process.exit(1);
}

const toKebab = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const toPascal = (value) =>
  value
    .replace(/[-_\s]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ""))
    .replace(/^(.)/, (m) => m.toUpperCase());

const toolName = toKebab(rawName);
const pascalName = toPascal(toolName);
const toolFile = `${toolName}.ts`;

const toolDefName = `${pascalName}ToolDef`;
const toolHandlerName = `handle${pascalName}Tool`;

async function ensureRegistryMarkers(content) {
  const required = [
    "TOOL_IMPORTS_START",
    "TOOL_IMPORTS_END",
    "TOOL_LIST_START",
    "TOOL_LIST_END",
    "TOOL_REGISTER_START",
    "TOOL_REGISTER_END",
  ];
  for (const marker of required) {
    if (!content.includes(marker)) {
      throw new Error(`Missing registry marker: ${marker}`);
    }
  }
}

function insertBetween(content, startMarker, endMarker, insertLine) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Invalid registry markers: ${startMarker} / ${endMarker}`);
  }
  const before = content.slice(0, end);
  if (before.includes(insertLine)) return content;
  const insertionPoint = end;
  const prefix = content.slice(0, insertionPoint);
  const suffix = content.slice(insertionPoint);
  const insert = `${insertLine}\n`;
  return `${prefix}${insert}${suffix}`;
}

async function main() {
  await fs.mkdir(TOOLS_DIR, { recursive: true });

  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  const toolContent = template
    .replaceAll("__TOOL_NAME__", toolName)
    .replaceAll("__TOOL_DESCRIPTION__", description)
    .replaceAll("__TOOL_NAME_PASCAL__", pascalName)
    .replaceAll("__TOOL_DEF_NAME__", toolDefName)
    .replaceAll("__TOOL_HANDLER_NAME__", toolHandlerName);

  const toolPath = path.join(TOOLS_DIR, toolFile);
  try {
    await fs.access(toolPath);
    throw new Error(`Tool already exists: ${toolPath}`);
  } catch {
    // ok
  }

  await fs.writeFile(toolPath, toolContent, "utf8");

  let registry = await fs.readFile(REGISTRY_PATH, "utf8");
  await ensureRegistryMarkers(registry);

  const importLine = `import { ${toolHandlerName}, ${toolDefName} } from "./${toolName}";`;
  registry = insertBetween(
    registry,
    "TOOL_IMPORTS_START",
    "TOOL_IMPORTS_END",
    importLine
  );

  const listLine = `  ${toolDefName},`;
  registry = insertBetween(
    registry,
    "TOOL_LIST_START",
    "TOOL_LIST_END",
    listLine
  );

  const handlerLine = `  ${toolName}: ${toolHandlerName},`;
  registry = insertBetween(
    registry,
    "TOOL_REGISTER_START",
    "TOOL_REGISTER_END",
    handlerLine
  );

  await fs.writeFile(REGISTRY_PATH, registry, "utf8");

  console.log(`Created tool: ${toolName}`);
  console.log(`- ${toolPath}`);
  console.log(`- updated ${REGISTRY_PATH}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
