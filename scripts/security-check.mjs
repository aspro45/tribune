import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const blockedNames = new Set([
  ".env",
  ".env.local",
  ".vault-password",
  "vault.enc.json",
  "wallets.json",
  "projects.json",
]);

const secretPatterns = [
  { name: "raw private key", re: /\b0x[a-fA-F0-9]{64}\b/ },
  { name: "mnemonic assignment", re: /\b(mnemonic|seed[_ -]?phrase)\s*[:=]/i },
  { name: "private key assignment", re: /\b(private[_ -]?key|PRIVATE_KEY)\s*[:=]/ },
  { name: "vault password assignment", re: /\b(vault[_ -]?password|VAULT_PASSWORD)\s*[:=]/ },
];

const skipDirs = new Set([".git", "node_modules", ".vercel", "output"]);
const findings = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full).replaceAll("\\", "/");
    const st = statSync(full);

    if (st.isDirectory()) {
      if (!skipDirs.has(name)) walk(full);
      continue;
    }

    if (blockedNames.has(name)) {
      findings.push(`${rel}: forbidden local-secret filename`);
      continue;
    }

    if (st.size > 1_000_000 || /\.(png|jpg|jpeg|webp|gif|ico)$/i.test(name)) continue;

    const text = readFileSync(full, "utf8");
    for (const pattern of secretPatterns) {
      if (pattern.re.test(text)) {
        const allowed =
          rel === "scripts/security-check.mjs" ||
          rel === "SECURITY.md" ||
          rel === "README.md" ||
          rel === "deployment.json";
        if (!allowed) findings.push(`${rel}: possible ${pattern.name}`);
      }
    }
  }
}

walk(root);

if (findings.length) {
  console.error("Security scan failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Security scan passed: no private keys, mnemonics, vaults, or env secrets found.");
