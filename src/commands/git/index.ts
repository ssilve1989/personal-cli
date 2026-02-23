import { Command } from "commander";
import { prune } from "./prune";

export const git = new Command("git")
  .description("Git utilities")
  .addCommand(prune);
