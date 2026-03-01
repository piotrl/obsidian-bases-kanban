import type { KanbanItem } from '../types';

export function mapBasesData(
    entries: any[], 
    config: { 
        groupBy: string | null, 
        splitColumnsBy: string | null, 
        sortBy: string | null 
    }
): KanbanItem[] {
    const { groupBy, splitColumnsBy, sortBy } = config;

    return entries.map(entry => {
        const file = entry.file; 
        if (!file) {
             // Fallback if entry is just the file itself or raw data
             return { id: crypto.randomUUID(), name: "Unknown" } as KanbanItem;
        }

        const mappedItem: KanbanItem = {
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
}
