import assert from 'node:assert';
import { test } from 'node:test';

// Mock types for KanbanItem
interface KanbanItem {
    id: string;
    file?: any;
    name: string;
    [key: string]: any;
}

// @ts-ignore
import { mapBasesData } from '../src/utils/dataMapping.ts';

test('mapBasesData generates a valid UUID when file is missing', () => {
    const entries = [{ file: null }];
    const config = { groupBy: null, splitColumnsBy: null, sortBy: null };
    const result = mapBasesData(entries, config);

    assert.strictEqual(result.length, 1);
    const id = result[0].id;
    assert.ok(id);

    // UUID v4 regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert.ok(uuidRegex.test(id), `ID ${id} should be a valid UUID v4`);
});
