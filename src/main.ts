import { Plugin } from 'obsidian';
import { KanbanView, KANBAN_VIEW_TYPE } from './kanban-view';
import {Settings} from "./settings";

export default class ObsidianBasesKanbanPlugin extends Plugin {
	settings: Settings;

	async onload() {
		this.settings = await this.loadData();

		this.registerBasesView(KANBAN_VIEW_TYPE, {
			name: 'Kanban',
			icon: 'kanban-square',
			factory: (controller, scrollEl) => new KanbanView(controller, scrollEl, this),
			options: KanbanView.getViewOptions,
		});
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
	}
}
