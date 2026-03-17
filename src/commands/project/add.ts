import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
	cancel,
	intro,
	isCancel,
	log,
	outro,
	select,
	spinner,
} from "@clack/prompts";
import { Command } from "commander";
import { getShellError } from "../../utils/errors";
import {
	generateCommitlintRc,
	generateLefthookYml,
	generateReleaseRc,
	generateReleaseYml,
	generateRenovateJson,
	type ProjectConfig,
} from "./new";

type AddConfig = Pick<ProjectConfig, "pm">;

type FeatureName = "lefthook" | "standard-release" | "renovate";

type FeatureHandler = {
	description: string;
	run: (config: AddConfig, cwd: string) => Promise<void>;
};

async function addLefthook(config: AddConfig, cwd: string): Promise<void> {
	const path = join(cwd, "lefthook.yml");
	if (await Bun.file(path).exists()) {
		log.warn("lefthook.yml already exists — skipped");
	} else {
		await Bun.write(path, generateLefthookYml(config));
	}

	if (config.pm === "bun") {
		await Bun.$`bun add -d lefthook`.cwd(cwd).quiet();
		await Bun.$`bunx lefthook install`.cwd(cwd).quiet();
	} else {
		await Bun.$`pnpm add -D lefthook`.cwd(cwd).quiet();
		await Bun.$`pnpm dlx lefthook install`.cwd(cwd).quiet();
	}
}

async function addStandardRelease(
	config: AddConfig,
	cwd: string,
): Promise<void> {
	const releaseRcPath = join(cwd, ".releaserc.json");
	const commitlintPath = join(cwd, ".commitlintrc.json");
	const workflowsDir = join(cwd, ".github", "workflows");
	const releaseYmlPath = join(workflowsDir, "release.yml");

	if (await Bun.file(releaseRcPath).exists()) {
		log.warn(".releaserc.json already exists — skipped");
	} else {
		await Bun.write(releaseRcPath, generateReleaseRc());
	}

	if (await Bun.file(commitlintPath).exists()) {
		log.warn(".commitlintrc.json already exists — skipped");
	} else {
		await Bun.write(commitlintPath, generateCommitlintRc());
	}

	if (await Bun.file(releaseYmlPath).exists()) {
		log.warn(".github/workflows/release.yml already exists — skipped");
	} else {
		mkdirSync(workflowsDir, { recursive: true });
		await Bun.write(releaseYmlPath, generateReleaseYml(config));
	}

	const packages = [
		"@commitlint/cli",
		"@commitlint/config-conventional",
		"@semantic-release/changelog",
		"@semantic-release/git",
		"conventional-changelog-conventionalcommits",
	];

	if (config.pm === "bun") {
		await Bun.$`bun add -d ${packages}`.cwd(cwd).quiet();
	} else {
		await Bun.$`pnpm add -D ${packages}`.cwd(cwd).quiet();
	}
}

async function addRenovate(_config: AddConfig, cwd: string): Promise<void> {
	const path = join(cwd, "renovate.json");
	if (await Bun.file(path).exists()) {
		log.warn("renovate.json already exists — skipped");
	} else {
		await Bun.write(path, generateRenovateJson());
	}
}

const features: Record<FeatureName, FeatureHandler> = {
	lefthook: {
		description: "Git hooks via lefthook",
		run: addLefthook,
	},
	"standard-release": {
		description: "Semantic versioning with semantic-release and commitlint",
		run: addStandardRelease,
	},
	renovate: {
		description: "Automated dependency updates via Renovate",
		run: addRenovate,
	},
};

function isFeatureName(name: string): name is FeatureName {
	return name in features;
}

async function detectPm(): Promise<AddConfig["pm"]> {
	const cwd = process.cwd();

	if (await Bun.file(join(cwd, "bun.lockb")).exists()) return "bun";
	if (await Bun.file(join(cwd, "bun.lock")).exists()) return "bun";
	if (await Bun.file(join(cwd, "pnpm-lock.yaml")).exists()) return "pnpm";

	const pkgFile = Bun.file(join(cwd, "package.json"));
	if (await pkgFile.exists()) {
		const pkg = (await pkgFile.json()) as { packageManager?: string };
		if (pkg.packageManager?.startsWith("pnpm")) return "pnpm";
		if (pkg.packageManager?.startsWith("bun")) return "bun";
	}

	const pm = await select({
		message: "Could not detect package manager. Which are you using?",
		options: [
			{ value: "bun", label: "Bun" },
			{ value: "pnpm", label: "pnpm" },
		],
	});

	if (isCancel(pm)) {
		cancel("Cancelled.");
		process.exit(0);
	}

	return pm as "bun" | "pnpm";
}

export const addFeature = new Command("add")
	.description(
		`Add a feature to an existing project. Features: ${Object.keys(features).join(", ")}`,
	)
	.argument("<feature>", "Feature to add")
	.action(async (featureName: string) => {
		intro("project add");

		if (!isFeatureName(featureName)) {
			log.error(
				`Unknown feature "${featureName}". Valid options: ${Object.keys(features).join(", ")}`,
			);
			process.exit(1);
		}

		const config: AddConfig = { pm: await detectPm() };

		const s = spinner();
		s.start(`Adding ${featureName}...`);

		try {
			await features[featureName].run(config, process.cwd());
			s.stop("Done!");
		} catch (e: unknown) {
			s.stop("Failed");
			log.error(getShellError(e));
			process.exit(1);
		}

		outro(`${featureName} added successfully.`);
	});
