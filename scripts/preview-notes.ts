import * as prompts from "@clack/prompts";
import { getLatestRelease, renderNotes } from "../src/utils/update";

prompts.intro("release notes preview");

const latest = await getLatestRelease();

if (!latest.notes) {
	prompts.log.warn("No release notes found.");
} else {
	prompts.note(renderNotes(latest.notes), `v${latest.version} Release Notes`);
}

prompts.outro("Done.");
