export enum ToolName {
	Pen = 'pen',
	Eraser = 'eraser'
}

export class ToolManager {
	#selectedTool = $state<ToolName>(ToolName.Pen);

	get selectedTool() {
		return this.#selectedTool;
	}

	set selectedTool(toolName: ToolName) {
		this.#selectedTool = toolName;
	}
}

export const toolManager = $state(new ToolManager());
