import { Command } from "commander";
import { git } from "./commands/git";

const program = new Command("scli")
  .description("Steve's CLI toolkit")
  .version("0.1.0")
  .addCommand(git);

program.parse();
