import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_ROOTS = ["controllers", "models", "routes", "middlewares", "helpers", "config", "client/src"];

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	"coverage",
	"test-results",
	"playwright-report",
	"blob-report",
	"_site",
]);

const FILE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

const RULES = [
	{
		id: "no-eval",
		pattern: /\beval\s*\(/g,
		message: "Avoid eval() usage in first-party code.",
	},
	{
		id: "no-new-function",
		pattern: /\bnew\s+Function\s*\(/g,
		message: "Avoid dynamic code execution via new Function().",
	},
	{
		id: "no-dangerously-set-inner-html",
		pattern: /dangerouslySetInnerHTML/g,
		message: "Avoid dangerouslySetInnerHTML unless explicitly reviewed.",
	},
	{
		id: "no-inner-html-assignment",
		pattern: /\.innerHTML\s*=/g,
		message: "Avoid direct innerHTML assignment in first-party code.",
	},
];

function shouldSkipDirectory(dirName) {
	return SKIP_DIRS.has(dirName);
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
		if (FILE_EXTENSIONS.has(ext)) {
			files.push(fullPath);
		}
	}

	return files;
}

function getLineNumber(source, index) {
	return source.slice(0, index).split("\n").length;
}

function collectViolations(filePath) {
	const content = fs.readFileSync(filePath, "utf8");
	const violations = [];

	for (const rule of RULES) {
		rule.pattern.lastIndex = 0;
		let match = rule.pattern.exec(content);

		while (match) {
			violations.push({
				ruleId: rule.id,
				message: rule.message,
				line: getLineNumber(content, match.index),
			});
			match = rule.pattern.exec(content);
		}
	}

	return violations;
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
		const violations = collectViolations(filePath);
		if (violations.length > 0) {
			findings.push({ filePath, violations });
		}
	}

	if (findings.length === 0) {
		console.log("Static security scan passed: no blocked patterns found.");
		process.exit(0);
	}

	console.error("Static security scan failed with blocked patterns:\n");
	for (const finding of findings) {
		console.error(`${toRelative(finding.filePath)}:`);
		for (const violation of finding.violations) {
			console.error(`  [${violation.ruleId}] line ${violation.line}: ${violation.message}`);
		}
		console.error("");
	}

	process.exit(1);
}

main();
