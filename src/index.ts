import { Command } from "commander";
import pkg from "../package.json" with { type: "json" };
import { git } from "./commands/git";
import { nuke } from "./commands/nuke";
import { setup } from "./commands/setup";

const program = new Command("scli")
	.description("Steve's CLI toolkit")
	.version(pkg.version)
	.addCommand(git)
	.addCommand(nuke)
	.addCommand(setup);

program.parse();
