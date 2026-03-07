import { intro, log, note, outro } from "@clack/prompts";
import { getLatestRelease, renderNotes } from "../src/utils/update";

intro("release notes preview");

const latest = await getLatestRelease();

if (!latest.notes) {
	log.warn("No release notes found.");
} else {
	note(renderNotes(latest.notes), `v${latest.version} Release Notes`);
}

outro("Done.");
