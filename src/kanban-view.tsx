import * as React from 'react';
import { Root, createRoot } from 'react-dom/client';
import {
	BasesView,
	QueryController,
    TFile,
    ViewOption
} from 'obsidian';
import { KanbanBoard } from './components/KanbanBoard';
import type ObsidianBasesKanbanPlugin from './main';

export const KANBAN_VIEW_TYPE = 'kanban';

export class KanbanView extends BasesView {
    readonly type = KANBAN_VIEW_TYPE;
    plugin: ObsidianBasesKanbanPlugin;
    root: Root | null = null;
    containerEl: HTMLElement;

    constructor(controller: QueryController, scrollEl: HTMLElement, plugin: ObsidianBasesKanbanPlugin) {
        super(controller);
        this.plugin = plugin;
        this.containerEl = scrollEl.createDiv({ cls: 'bases-kanban-container' });
    }

    get groupByConfig(): { property: string, direction: string } | null {
        const groupByConfig = this.config && this.config!.groupBy;
        if (!groupByConfig) return null;
        
        return groupByConfig;
    }

    get groupByProp(): string | null {
        return this.groupByConfig?.property || null;
    }

    get splitColumnsByProp(): string | null {
        const configVal = (this.config && this.config.get('splitColumnsBy'));        
        
        if (configVal && typeof configVal === 'object') {
             return (configVal as any).property ? (configVal as any).property : null;
        }
        
        return (configVal as string) || null;
    }

    onOpen() {
        this.renderView();
    }

    onDataUpdated() {
        this.renderView();
    }
    
    // Force re-render on resize if needed, though React handles responsive layout
    onResize() {
        // ...
    }

    renderView() {
        if (!this.root) {
            this.root = createRoot(this.containerEl);
        }
        
        // BasesQueryResult extraction
        let entries: any[] = [];
        
        // The data object from BasesView (BasesQueryResult) contains groupedData
        if (this.data) {
             console.log('KanbanView: Data received', this.data);
             // @ts-ignore - inspecting internal structure based on docs
             if (this.data.groupedData) {
                 // @ts-ignore
                 for (const group of this.data.groupedData) {
                     if (group.entries) {
                         entries.push(...group.entries);
                     }
                 }
             } else if (Array.isArray(this.data)) {
                 entries = this.data;
             }
        } else {
             console.log('KanbanView: No data');
        }

        const groupBy = this.groupByProp;
        const groupByConfig = this.groupByConfig;
        const splitColumnsBy = this.splitColumnsByProp;
        
        console.log('KanbanView: Config', { groupBy, splitColumnsBy, groupByConfig });

        const sortBy = this.config?.get('sortBy') as string;
        const sortDirection = this.config?.get('sortDirection') as 'ASC' | 'DESC';

        // Map entries to a format compatible with KanbanBoard
        const mappedData = entries.map(entry => {
            // entry is typically a BasesEntry
            // it has .file (TFile) and .getValue(propId)
            
            const file = entry.file; 
            if (!file) {
                 // Fallback if entry is just the file itself or raw data
                 return { id: Math.random().toString(), name: "Unknown" };
            }

            const mappedItem: any = {
                id: file.path,
                file: file,
                name: file.basename,
                // Pass original entry for advanced usage if needed
                _entry: entry 
            };
            
            const injectProp = (prop: string) => {
                let foundValue = false;
                // Try using getValue if available (BasesEntry)
                if (typeof entry.getValue === 'function') {
                    try {
                        const val = entry.getValue(prop);
                        // Value items according to docs have .isEmpty() and .toString()
                        if (val && typeof val.isEmpty === 'function') {
                            if (!val.isEmpty()) {
                                mappedItem[prop] = val.toString();
                            } else {
                                mappedItem[prop] = null;
                            }
                            foundValue = true;
                        } else if (val !== undefined && val !== null) {
                            // Fallback if it returns a primitive or unexpected object
                            mappedItem[prop] = String(val);
                            foundValue = true;
                        }
                    } catch (err) {
                        // console.warn(`KanbanView: Error getting value for ${prop}`, err);
                    }
                } 
                
                if (!foundValue && entry.frontmatter) {
                    // Fallback to frontmatter if available directly
                    // Handle 'note.Status' -> 'Status' mapping for direct frontmatter access
                    const propName = prop.includes('.') ? prop.split('.').pop()! : prop;
                    mappedItem[prop] = entry.frontmatter[propName] || entry.frontmatter[prop];
                    if (mappedItem[prop] !== undefined) foundValue = true;
                }
            };

            // Inject the group by property value so KanbanBoard can find it
            if (groupBy) injectProp(groupBy);
            if (splitColumnsBy) injectProp(splitColumnsBy);
            if (sortBy) injectProp(sortBy);

            return mappedItem;
        });

        this.root.render(
            <KanbanBoard
                data={mappedData}
                groupBy={groupBy}
                groupByDirection={groupByConfig?.direction}
                splitColumnsBy={splitColumnsBy}
                onCardUpdate={this.handleCardUpdate}
                onCardClick={this.handleCardClick}
                onCardAdd={this.handleCardAdd}
                sortBy={sortBy}
                sortDirection={sortDirection}
            />
        );
    }

    handleCardAdd = (rowVal: string, colVal: string) => {
        const groupBy = this.groupByProp;
        const splitColumnsBy = this.splitColumnsByProp;
        
        const propsToSet: Record<string, any> = {};
        // 'All' is the default row name in simple mode, 'Uncategorized' is default for missing values
        const isValidVal = (val: string) => val && val !== 'Uncategorized' && val !== 'All';

        if (splitColumnsBy) {
            // Matrix Mode
            if (isValidVal(colVal)) propsToSet[splitColumnsBy] = colVal;
            if (isValidVal(rowVal) && groupBy) propsToSet[groupBy] = rowVal;
        } else {
            // Simple Mode - colVal is the grouping value
            if (isValidVal(colVal) && groupBy) propsToSet[groupBy] = colVal;
        }

        this.createFileForView("New note", (frontmatter: any) => {
            for (const [key, value] of Object.entries(propsToSet)) {
                // Remove prefix if present (e.g. 'note.Status' -> 'Status')
                const frontmatterKey = key.includes('.') ? key.split('.').pop()! : key;
                frontmatter[frontmatterKey] = value;
            }
        });
    }
    
    handleCardClick = (item: any, event: React.MouseEvent | React.PointerEvent) => {
        if (!(item.file instanceof TFile)) return;
        const file = item.file as TFile;

        // Middle Click (Aux click, button 1) or Command/Ctrl + Click
        if (event.type === 'auxclick' || (event.button === 1) || (event.metaKey || event.ctrlKey)) {
             // Open in new tab (background or foreground depends on obsidian settings typically, but split gives new tab)
             this.plugin.app.workspace.getLeaf('tab').openFile(file);
             return;
        }

        // Context menu (Right click)
        if (event.type === 'contextmenu') {
            const nativeEvent = event.nativeEvent as MouseEvent;
            // Import Menu dynamically to avoid import issues or use global
            const { Menu } = require('obsidian');
            const menu = new Menu();
            
            // @ts-ignore - leaf is available on ItemView/BasesView usually, maybe protected or named differently in BasesView
            this.plugin.app.workspace.trigger('file-menu', menu, file, 'kanban-context-menu', this.leaf);
            menu.showAtPosition({ x: nativeEvent.clientX, y: nativeEvent.clientY });
            
            event.preventDefault();
            return;
        }

        // Standard Left Click
        if (event.type === 'click' && event.button === 0) {
             this.plugin.app.workspace.getLeaf('split').openFile(file);
        }
    }

    handleCardUpdate = async (item: any, updates: { [key: string]: string }) => {
        const file = item.file; // data items in Bases are typically augmented TFiles or have .file property
        
        if (file instanceof TFile) {
             try {
                await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
                    for (const [propKey, newVal] of Object.entries(updates)) {
                         // Naive parsing to get the actual frontmatter key (remove 'note.' prefix)
                         const frontmatterKey = propKey.includes('.') ? propKey.split('.').pop()! : propKey;
                         
                         if (newVal === 'Uncategorized' || newVal === null) {
                             delete frontmatter[frontmatterKey];
                         } else {
                             frontmatter[frontmatterKey] = newVal;
                         }
                    }
                });
             } catch (e) {
                 console.error("Failed to update frontmatter", e);
             }
        }
    }

    static getViewOptions(): ViewOption[] {
        return [
            {
                key: 'splitColumnsBy',
                displayName: 'Split columns by',
                type: 'property', 
            }
        ] as any;
    }
}
