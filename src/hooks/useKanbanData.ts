import { useMemo } from 'react';
import { KanbanItem } from '../types';

export interface UseKanbanDataProps {
    data: KanbanItem[];
    groupBy: string | null;
    groupByDirection?: string;
    splitColumnsBy?: string | null;
    sortBy?: string;
    sortDirection?: 'ASC' | 'DESC';
}

export function useKanbanData({
    data,
    groupBy,
    groupByDirection,
    splitColumnsBy,
    sortBy,
    sortDirection
}: UseKanbanDataProps) {
    return useMemo(() => {
        let mode: 'matrix' | 'simple' = 'simple';

        // Determine mode
        if (splitColumnsBy) {
            mode = 'matrix';
        } else {
            mode = 'simple';
        }

        const rows: Set<string> = new Set();
        const cols: Set<string> = new Set();
        const map: Record<string, Record<string, KanbanItem[]>> = {};

        data.forEach(item => {
            let rVal = 'All';
            let cVal = 'Uncategorized';

            if (mode === 'matrix') {
                // Row = groupBy
                if (groupBy) {
                    const rRaw = item[groupBy] ?? (item.frontmatter ? item.frontmatter[groupBy] : null);
                    rVal = rRaw ? String(rRaw) : 'Uncategorized';
                }

                // Col = splitColumnsBy
                const cRaw = item[splitColumnsBy!] ?? (item.frontmatter ? item.frontmatter[splitColumnsBy!] : null);
                cVal = cRaw ? String(cRaw) : 'Uncategorized';
            } else {
                // Simple mode: Col = groupBy
                if (groupBy) {
                    const cRaw = item[groupBy] ?? (item.frontmatter ? item.frontmatter[groupBy] : null);
                    cVal = cRaw ? String(cRaw) : 'Uncategorized';
                }
            }

            rows.add(rVal);
            cols.add(cVal);

            if (!map[rVal]) map[rVal] = {};
            const rowMap = map[rVal]!;
            if (!rowMap[cVal]) rowMap[cVal] = [];
            rowMap[cVal]!.push(item);
        });

        // Helper for sorting keys
        const sortKeys = (keys: Set<string>, propName: string | null) => {
            const arr = Array.from(keys).sort(); // Default ASC alpha

            // If sorting by the grouping property itself, respect the sort direction
            if (sortBy && propName && sortBy === propName) {
                if (sortDirection === 'DESC') {
                    arr.reverse();
                }
            }
            return arr;
        };

        const sortedRows = sortKeys(rows, mode === 'matrix' ? groupBy : null);
        const colPropRef = mode === 'matrix' ? splitColumnsBy : groupBy;
        const sortedCols = sortKeys(cols, colPropRef || null);

        // Sort items within cells
        if (sortBy) {
            Object.values(map).forEach(cols => {
                Object.values(cols).forEach(items => {
                    items.sort((a, b) => {
                        const getVal = (itm: KanbanItem) => {
                            if (sortBy === 'file' || sortBy === 'name') return itm.file?.basename || itm.name || '';
                            const val = itm[sortBy] ?? (itm.frontmatter ? itm.frontmatter[sortBy] : '');
                            return val ?? '';
                        };
                        const valA = String(getVal(a));
                        const valB = String(getVal(b));

                        if (valA < valB) return sortDirection === 'DESC' ? 1 : -1;
                        if (valA > valB) return sortDirection === 'DESC' ? -1 : 1;
                        return 0;
                    });
                });
            });
        }

        return {
            matrixData: map,
            rowKeys: sortedRows,
            colKeys: sortedCols,
            usageMode: mode
        };
    }, [data, groupBy, splitColumnsBy, groupByDirection, sortBy, sortDirection]);
}
