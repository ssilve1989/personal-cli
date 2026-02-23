import { Command } from "commander";
import { prune } from "./prune";
import { sync } from "./sync";
import { rebase } from "./rebase";
import { amend } from "./amend";
import { start } from "./start";
import { deploy } from "./deploy";

export const git = new Command("git")
  .description("Git utilities")
  .addCommand(prune)
  .addCommand(sync)
  .addCommand(rebase)
  .addCommand(amend)
  .addCommand(start)
  .addCommand(deploy);
