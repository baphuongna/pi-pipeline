import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerPiPipeline } from "./src/extension/register.ts";

export default function (pi: ExtensionAPI): void {
	registerPiPipeline(pi);
}
