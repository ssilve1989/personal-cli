import {
	cancel,
	intro,
	isCancel,
	log,
	multiselect,
	outro,
} from "@clack/prompts";
import { Command } from "commander";

export function parseLsofOutput(
	raw: string,
	port: number,
): { pid: number; label: string }[] {
	return raw
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean)
		.map((pid) => ({
			pid: parseInt(pid, 10),
			label: `PID ${pid} (port ${port})`,
		}));
}

export function parsePgrepOutput(
	raw: string,
): { pid: number; label: string }[] {
	return raw
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean)
		.map((line) => {
			const [pid = "", ...rest] = line.split(" ");
			return {
				pid: parseInt(pid, 10),
				label: `${pid} — ${rest.join(" ")}`,
			};
		});
}

export function filterOwnPid(
	pids: { pid: number; label: string }[],
	myPid: number,
): { pid: number; label: string }[] {
	return pids.filter((p) => p.pid !== myPid && !Number.isNaN(p.pid));
}

export const nuke = new Command("nuke")
	.description("Kill processes by port number or name")
	.argument("<target>", "Port number or process name")
	.option("-f, --force", "Kill all matches without prompting")
	.action(async (target: string, opts: { force?: boolean }) => {
		intro("nuke");

		const port = parseInt(target, 10);
		const isPort = !Number.isNaN(port) && port >= 1 && port <= 65535;

		let pids: { pid: number; label: string }[] = [];

		if (isPort) {
			const result = await Bun.$`lsof -i :${port} -t`.nothrow().quiet().text();
			pids = parseLsofOutput(result, port);
		} else {
			const result = await Bun.$`pgrep -fl ${target}`.nothrow().quiet().text();
			pids = parsePgrepOutput(result);
		}

		// Filter out own PID
		const myPid = process.pid;
		pids = filterOwnPid(pids, myPid);

		if (pids.length === 0) {
			log.warn(
				isPort
					? `No processes found on port ${port}.`
					: `No processes matching "${target}".`,
			);
			process.exit(0);
		}

		let toKill: number[];

		if (opts.force) {
			toKill = pids.map((p) => p.pid);
		} else {
			const selected = await multiselect({
				message: "Select processes to kill",
				options: pids.map((p) => ({ value: p.pid, label: p.label })),
				required: true,
			});

			if (isCancel(selected)) {
				cancel("Cancelled.");
				process.exit(0);
			}

			toKill = selected as number[];
		}

		await Promise.allSettled(
			toKill.map(async (pid) => {
				try {
					await Bun.$`kill -9 ${pid}`.quiet();
					log.success(`Killed ${pid}`);
				} catch {
					log.error(`Failed to kill ${pid}`);
				}
			}),
		);

		outro(`Nuked ${toKill.length} process${toKill.length > 1 ? "es" : ""}.`);
	});
