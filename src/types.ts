import { TFile } from 'obsidian';

export interface KanbanItem {
    id: string;
    file?: TFile;
    name: string;
    [key: string]: any;
}
