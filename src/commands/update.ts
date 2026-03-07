import { chmodSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	cancel,
	confirm,
	intro,
	isCancel,
	log,
	note,
	outro,
	spinner,
} from "@clack/prompts";
import { Command } from "commander";
import pkg from "../../package.json" with { type: "json" };
import {
	getDownloadUrl,
	getLatestRelease,
	getPlatformSlug,
	isUpdateAvailable,
	renderNotes,
} from "../utils/update";

export const update = new Command("update")
	.description("Update scli to the latest version")
	.option("--check", "Check for updates without installing")
	.action(async (opts: { check?: boolean }) => {
		intro("update");

		const s = spinner();
		s.start("Checking for latest release…");

		let latest: Awaited<ReturnType<typeof getLatestRelease>>;
		try {
			latest = await getLatestRelease();
		} catch (err) {
			s.stop("Failed to reach GitHub.");
			log.error(String(err));
			process.exit(1);
		}

		const current = pkg.version;
		const hasUpdate = isUpdateAvailable(current, latest.version);

		if (!hasUpdate) {
			s.stop(`Already up to date (v${current}).`);
			outro("Nothing to do.");
			return;
		}

		s.stop(`New version available: v${latest.version} (current: v${current})`);

		if (latest.notes) {
			note(renderNotes(latest.notes), "Release Notes");
		}

		if (opts.check) {
			log.info(`Run \`scli update\` to install v${latest.version}.`);
			outro("Done.");
			return;
		}

		const confirmed = await confirm({
			message: `Install v${latest.version}?`,
		});

		if (isCancel(confirmed) || !confirmed) {
			cancel("Update cancelled.");
			process.exit(0);
		}

		let slug: string;
		try {
			slug = getPlatformSlug();
		} catch (err) {
			log.error(String(err));
			process.exit(1);
		}

		const url = getDownloadUrl(latest.tag, slug);
		s.start(`Downloading ${url}…`);

		let response: Response;
		try {
			response = await fetch(url);
		} catch (err) {
			s.stop("Download failed.");
			log.error(String(err));
			process.exit(1);
		}

		if (!response.ok) {
			s.stop(`Download failed: ${response.status} ${response.statusText}`);
			process.exit(1);
		}

		const buffer = await response.arrayBuffer();
		s.stop("Download complete.");

		const tmpPath = join(tmpdir(), `scli-update-${Date.now()}`);
		writeFileSync(tmpPath, Buffer.from(buffer));
		chmodSync(tmpPath, 0o755);

		try {
			renameSync(tmpPath, process.execPath);
		} catch {
			// rename across devices fails on some systems — fall back to copy+delete
			const dest = Bun.file(process.execPath);
			await Bun.write(dest, Bun.file(tmpPath));
			chmodSync(process.execPath, 0o755);
			try {
				unlinkSync(tmpPath);
			} catch {
				/* ignore */
			}
		}

		outro(
			`Updated to v${latest.version}. Restart scli to use the new version.`,
		);
	});
