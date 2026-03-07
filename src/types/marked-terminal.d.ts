import type { MarkedExtension } from "marked";

declare module "marked-terminal" {
	export interface TerminalRendererOptions {
		showSectionPrefix?: boolean | undefined;
	}

	export function markedTerminal(
		options?: TerminalRendererOptions,
		highlightOptions?: unknown,
	): MarkedExtension;
}
