import { intro, log, outro, spinner } from "@clack/prompts";
import { Command } from "commander";
import { getShellError } from "../../utils/errors";
import { getCurrentBranch, getDefaultBranch } from "../../utils/git";

export const sync = new Command("sync")
	.description("Sync default branch and return to current branch")
	.action(async () => {
		intro("git sync");

		const s = spinner();
		try {
			const defaultBranch = await getDefaultBranch();
			const currentBranch = await getCurrentBranch();

			if (currentBranch === defaultBranch) {
				s.start("Pulling latest changes...");
				await Bun.$`git pull`.quiet();
				s.stop(`${defaultBranch} is up to date`);
			} else {
				s.start(`Switching to ${defaultBranch} and pulling...`);
				await Bun.$`git checkout ${defaultBranch}`.quiet();
				await Bun.$`git pull`.quiet();
				s.stop(`${defaultBranch} is up to date`);

				s.start(`Switching back to ${currentBranch}...`);
				await Bun.$`git checkout ${currentBranch}`.quiet();
				s.stop(`Back on ${currentBranch}`);
			}

			outro("Synced!");
		} catch (e: unknown) {
			s.stop("Failed");
			log.error(getShellError(e));
			process.exit(1);
		}
	});
