#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const SCAN_ROOTS = ["app", "components", "lib"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
]);

function walk(directory) {
  const absolute = path.join(ROOT, directory);
  if (!fs.existsSync(absolute)) return [];

  const results = [];
  const entries = fs.readdirSync(absolute, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(absolute, entry.name);

    if (entry.isDirectory()) {
      results.push(
        ...walk(path.relative(ROOT, fullPath))
      );
      continue;
    }

    if (
      entry.isFile() &&
      EXTENSIONS.has(path.extname(entry.name))
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

function relative(file) {
  return path
    .relative(ROOT, file)
    .split(path.sep)
    .join("/");
}

function lineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function routeFromFile(file, fileName) {
  const rel = relative(file);
  const withoutPrefix = rel
    .replace(/^app\//, "")
    .replace(new RegExp(`/${fileName.replace(".", "\\.")}$`), "");

  if (!withoutPrefix || withoutPrefix === fileName) {
    return "/";
  }

  return `/${withoutPrefix}`.replace(/\/+/g, "/");
}

function routeRegex(route) {
  const escaped = route
    .split("/")
    .map((segment) => {
      if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) {
        return ".*";
      }
      if (/^\[\.\.\.[^\]]+\]$/.test(segment)) {
        return ".+";
      }
      if (/^\[[^\]]+\]$/.test(segment)) {
        return "[^/]+";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");

  return new RegExp(`^${escaped}/?$`);
}

function normalizeUrl(value) {
  const trimmed = value.trim();

  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//")
  ) {
    return null;
  }

  return (
    trimmed.split("#")[0].split("?")[0] || "/"
  );
}

function routeExists(candidate, routePatterns) {
  return routePatterns.some((entry) =>
    entry.regex.test(candidate)
  );
}

function addIssue(collection, issue) {
  collection.push(issue);
}

function renderIssues(title, issues, limit = 500) {
  const lines = [
    "",
    "=".repeat(78),
    title,
    "=".repeat(78),
  ];

  if (issues.length === 0) {
    lines.push("Aucun résultat.");
    return lines;
  }

  for (const issue of issues.slice(0, limit)) {
    lines.push(
      `${issue.file}:${issue.line} — ${issue.message}`
    );
  }

  if (issues.length > limit) {
    lines.push(
      `... ${issues.length - limit} résultat(s) supplémentaire(s) non affiché(s).`
    );
  }

  return lines;
}

const files = SCAN_ROOTS.flatMap(walk);
const pageFiles = files.filter((file) =>
  relative(file).startsWith("app/") &&
  relative(file).endsWith("/page.tsx")
);
const apiFiles = files.filter((file) =>
  relative(file).startsWith("app/api/") &&
  relative(file).endsWith("/route.ts")
);

const pageRoutes = pageFiles.map((file) => {
  const route = routeFromFile(file, "page.tsx");
  return {
    route,
    regex: routeRegex(route),
    file: relative(file),
  };
});

const apiRoutes = apiFiles.map((file) => {
  const route = routeFromFile(file, "route.ts");
  return {
    route,
    regex: routeRegex(route),
    file: relative(file),
  };
});

const forbidden = [];
const todos = [];
const debug = [];
const typeSafety = [];
const dangerousHtml = [];
const localhost = [];
const useSearchParams = [];
const missingButtonType = [];
const blankWithoutRel = [];
const imgWithoutAlt = [];
const missingLinks = [];
const missingApis = [];
const largeFiles = [];
const clientFiles = [];
const envClient = [];

const forbiddenPatterns = [
  /Avance immédiate/gi,
  /avance-immediate/gi,
  /\bURSSAF\b/g,
  /\bUrssaf\b/g,
];

for (const file of files) {
  const rel = relative(file);
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  if (lines.length >= 1000) {
    largeFiles.push({
      file: rel,
      line: 1,
      message: `${lines.length} lignes`,
    });
  }

  if (/^\s*["']use client["'];/m.test(content)) {
    clientFiles.push(rel);
  }

  for (const pattern of forbiddenPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      addIssue(forbidden, {
        file: rel,
        line: lineNumber(content, match.index ?? 0),
        message: `mention trouvée : ${match[0]}`,
      });
    }
  }

  const scans = [
    {
      regex: /\b(?:TODO|FIXME|HACK|XXX)\b/gi,
      target: todos,
      label: "marqueur de travail",
    },
    {
      regex: /\bconsole\.(?:log|debug|warn)\s*\(/g,
      target: debug,
      label: "trace console",
    },
    {
      regex: /\bdebugger\s*;/g,
      target: debug,
      label: "instruction debugger",
    },
    {
      regex: /@ts-ignore|@ts-nocheck/g,
      target: typeSafety,
      label: "désactivation TypeScript",
    },
    {
      regex: /\bas\s+any\b|:\s*any\b|<any>/g,
      target: typeSafety,
      label: "usage explicite de any",
    },
    {
      regex: /dangerouslySetInnerHTML/g,
      target: dangerousHtml,
      label: "dangerouslySetInnerHTML",
    },
    {
      regex: /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/g,
      target: localhost,
      label: "URL locale codée en dur",
    },
  ];

  for (const scan of scans) {
    for (const match of content.matchAll(scan.regex)) {
      addIssue(scan.target, {
        file: rel,
        line: lineNumber(content, match.index ?? 0),
        message: scan.label,
      });
    }
  }

  if (content.includes("useSearchParams(")) {
    addIssue(useSearchParams, {
      file: rel,
      line: lineNumber(
        content,
        content.indexOf("useSearchParams(")
      ),
      message: content.includes("<Suspense")
        ? "useSearchParams détecté ; Suspense présent dans le même fichier"
        : "useSearchParams détecté ; vérifier la frontière Suspense",
    });
  }

  if (
    /^\s*["']use client["'];/m.test(content) &&
    /process\.env\.[A-Z0-9_]+/g.test(content)
  ) {
    for (const match of content.matchAll(
      /process\.env\.([A-Z0-9_]+)/g
    )) {
      const variable = match[1];
      if (!variable.startsWith("NEXT_PUBLIC_")) {
        addIssue(envClient, {
          file: rel,
          line: lineNumber(content, match.index ?? 0),
          message: `variable serveur utilisée dans un composant client : ${variable}`,
        });
      }
    }
  }

  for (const match of content.matchAll(
    /<button\b([^>]*)>/g
  )) {
    const attributes = match[1] || "";
    if (!/\btype\s*=/.test(attributes)) {
      addIssue(missingButtonType, {
        file: rel,
        line: lineNumber(content, match.index ?? 0),
        message: "bouton sans attribut type",
      });
    }
  }

  for (const match of content.matchAll(
    /<(?:a|Link)\b([^>]*)>/g
  )) {
    const attributes = match[1] || "";
    if (
      /target\s*=\s*["']_blank["']/.test(attributes) &&
      !/\brel\s*=/.test(attributes)
    ) {
      addIssue(blankWithoutRel, {
        file: rel,
        line: lineNumber(content, match.index ?? 0),
        message: 'target="_blank" sans rel',
      });
    }
  }

  for (const match of content.matchAll(/<img\b([^>]*)>/g)) {
    const attributes = match[1] || "";
    if (!/\balt\s*=/.test(attributes)) {
      addIssue(imgWithoutAlt, {
        file: rel,
        line: lineNumber(content, match.index ?? 0),
        message: "image sans attribut alt",
      });
    }
  }

  const linkRegexes = [
    /href\s*=\s*["']([^"']+)["']/g,
    /router\.(?:push|replace)\(\s*["']([^"']+)["']/g,
    /redirect\(\s*["']([^"']+)["']/g,
  ];

  for (const regex of linkRegexes) {
    for (const match of content.matchAll(regex)) {
      const raw = match[1];
      const normalized = normalizeUrl(raw);

      if (
        !normalized ||
        normalized.startsWith("/api/") ||
        /\.[a-z0-9]{2,5}$/i.test(normalized)
      ) {
        continue;
      }

      if (!routeExists(normalized, pageRoutes)) {
        addIssue(missingLinks, {
          file: rel,
          line: lineNumber(content, match.index ?? 0),
          message: `route interne introuvable : ${raw}`,
        });
      }
    }
  }

  for (const match of content.matchAll(
    /fetch\(\s*["'`]([^"'`$]+)["'`]/g
  )) {
    const raw = match[1];
    const normalized = normalizeUrl(raw);

    if (
      !normalized ||
      !normalized.startsWith("/api/")
    ) {
      continue;
    }

    if (!routeExists(normalized, apiRoutes)) {
      addIssue(missingApis, {
        file: rel,
        line: lineNumber(content, match.index ?? 0),
        message: `route API introuvable : ${raw}`,
      });
    }
  }
}

let gitStatus = "Git indisponible ou dossier non initialisé.";
try {
  gitStatus =
    execSync("git status --short", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || "Working tree clean.";
} catch {
  // Rapport informatif uniquement.
}

const report = [
  "AUDIT GLOBAL ARBOBOARD",
  `Généré le : ${new Date().toLocaleString("fr-FR")}`,
  `Racine : ${ROOT}`,
  "",
  "RÉSUMÉ",
  "-".repeat(78),
  `Fichiers analysés : ${files.length}`,
  `Pages Next.js : ${pageRoutes.length}`,
  `Routes API : ${apiRoutes.length}`,
  `Composants client : ${clientFiles.length}`,
  "",
  "État Git :",
  gitStatus,
  ...renderIssues(
    "1. Mentions Avance immédiate / URSSAF",
    forbidden
  ),
  ...renderIssues(
    "2. Routes internes statiques introuvables",
    missingLinks
  ),
  ...renderIssues(
    "3. Routes API statiques introuvables",
    missingApis
  ),
  ...renderIssues(
    "4. useSearchParams à contrôler",
    useSearchParams
  ),
  ...renderIssues(
    "5. Boutons sans type",
    missingButtonType
  ),
  ...renderIssues(
    '6. target="_blank" sans rel',
    blankWithoutRel
  ),
  ...renderIssues(
    "7. Images sans texte alternatif",
    imgWithoutAlt
  ),
  ...renderIssues(
    "8. Variables serveur dans des composants client",
    envClient
  ),
  ...renderIssues(
    "9. HTML potentiellement dangereux",
    dangerousHtml
  ),
  ...renderIssues(
    "10. URL localhost codées en dur",
    localhost
  ),
  ...renderIssues(
    "11. TODO / FIXME / HACK",
    todos
  ),
  ...renderIssues(
    "12. Traces console et debugger",
    debug
  ),
  ...renderIssues(
    "13. Contournements du typage",
    typeSafety
  ),
  ...renderIssues(
    "14. Fichiers de 1000 lignes ou plus",
    largeFiles
  ),
  "",
  "=".repeat(78),
  "ROUTES DE PAGES DÉTECTÉES",
  "=".repeat(78),
  ...pageRoutes
    .sort((a, b) => a.route.localeCompare(b.route))
    .map((entry) => `${entry.route} — ${entry.file}`),
  "",
  "=".repeat(78),
  "ROUTES API DÉTECTÉES",
  "=".repeat(78),
  ...apiRoutes
    .sort((a, b) => a.route.localeCompare(b.route))
    .map((entry) => `${entry.route} — ${entry.file}`),
  "",
  "FIN DU RAPPORT",
].join("\n");

const output = path.join(ROOT, "audit-arboboard.txt");
fs.writeFileSync(output, report, "utf8");

console.log(`Rapport créé : ${output}`);
console.log(`Fichiers analysés : ${files.length}`);
console.log(`Pages détectées : ${pageRoutes.length}`);
console.log(`Routes API détectées : ${apiRoutes.length}`);
console.log("");
console.log(
  "Transmettez le fichier audit-arboboard.txt pour l’analyse."
);
