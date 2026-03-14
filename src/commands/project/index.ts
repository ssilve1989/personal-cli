import { Command } from "commander";
import { addFeature } from "./add";
import { newProject } from "./new";

export const project = new Command("project")
	.description("Project utilities")
	.addCommand(newProject)
	.addCommand(addFeature);
