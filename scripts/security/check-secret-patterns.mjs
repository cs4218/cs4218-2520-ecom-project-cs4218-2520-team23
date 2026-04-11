import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_ROOTS = [
	"controllers",
	"models",
	"routes",
	"middlewares",
	"helpers",
	"config",
	"client/src",
	".github/workflows",
];

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	"coverage",
	"test-results",
	"playwright-report",
	"blob-report",
	"_site",
]);

const FILE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".json", ".yml", ".yaml"]);

const FILE_NAME_EXCLUDES = [".example", ".test.", ".spec."];

const RULES = [
	{
		id: "private-key",
		pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
		message: "Private key material detected.",
	},
	{
		id: "aws-access-key",
		pattern: /\bAKIA[0-9A-Z]{16}\b/g,
		message: "Possible AWS access key ID detected.",
	},
	{
		id: "generic-api-key",
		pattern:
			/\b(?:api[_-]?key|private[_-]?key|access[_-]?token|secret(?:_?key)?)\b\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/gi,
		message: "Possible hardcoded secret token detected.",
	},
	{
		id: "github-pat",
		pattern: /\bghp_[A-Za-z0-9]{30,}\b/g,
		message: "Possible GitHub personal access token detected.",
	},
];

function shouldSkipDirectory(dirName) {
	return SKIP_DIRS.has(dirName);
}

function shouldSkipFile(filePath) {
	const lower = filePath.toLowerCase();
	return FILE_NAME_EXCLUDES.some((token) => lower.includes(token));
}

function walkDirectory(dirPath, files = []) {
	if (!fs.existsSync(dirPath)) {
		return files;
	}

	const entries = fs.readdirSync(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);

		if (entry.isDirectory()) {
			if (shouldSkipDirectory(entry.name)) {
				continue;
			}
			walkDirectory(fullPath, files);
			continue;
		}

		const ext = path.extname(entry.name);
		if (FILE_EXTENSIONS.has(ext) && !shouldSkipFile(fullPath)) {
			files.push(fullPath);
		}
	}

	return files;
}

function getLineNumber(source, index) {
	return source.slice(0, index).split("\n").length;
}

function collectFindings(filePath) {
	const content = fs.readFileSync(filePath, "utf8");
	const findings = [];

	for (const rule of RULES) {
		rule.pattern.lastIndex = 0;
		let match = rule.pattern.exec(content);

		while (match) {
			findings.push({
				ruleId: rule.id,
				message: rule.message,
				line: getLineNumber(content, match.index),
			});
			match = rule.pattern.exec(content);
		}
	}

	return findings;
}

function toRelative(filePath) {
	return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function main() {
	const filesToScan = [];

	for (const root of SCAN_ROOTS) {
		walkDirectory(path.join(ROOT, root), filesToScan);
	}

	const findings = [];

	for (const filePath of filesToScan) {
		const fileFindings = collectFindings(filePath);
		if (fileFindings.length > 0) {
			findings.push({ filePath, findings: fileFindings });
		}
	}

	if (findings.length === 0) {
		console.log("Secret pattern scan passed: no hardcoded secret patterns found.");
		process.exit(0);
	}

	console.error("Secret pattern scan failed with possible credential leaks:\n");
	for (const result of findings) {
		console.error(`${toRelative(result.filePath)}:`);
		for (const finding of result.findings) {
			console.error(`  [${finding.ruleId}] line ${finding.line}: ${finding.message}`);
		}
		console.error("");
	}

	process.exit(1);
}

main();
