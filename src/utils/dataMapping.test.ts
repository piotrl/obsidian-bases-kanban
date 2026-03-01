import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapBasesData } from './dataMapping.ts';

describe('mapBasesData', () => {
    it('should map entries correctly with getValue', () => {
        const entries = [
            {
                file: { path: 'test1.md', basename: 'test1' },
                getValue: (prop: string) => ({
                    isEmpty: () => false,
                    toString: () => `Value of ${prop}`
                })
            }
        ];
        const config = { groupBy: 'Status', splitColumnsBy: null, sortBy: null };
        const result = mapBasesData(entries, config);

        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, 'test1.md');
        assert.strictEqual(result[0].name, 'test1');
        assert.strictEqual(result[0].Status, 'Value of Status');
    });

    it('should fall back to frontmatter if getValue throws an error', () => {
        const entries = [
            {
                file: { path: 'test2.md', basename: 'test2' },
                getValue: (prop: string) => {
                    throw new Error('Some error');
                },
                frontmatter: {
                    Status: 'Frontmatter Status'
                }
            }
        ];
        const config = { groupBy: 'Status', splitColumnsBy: null, sortBy: null };
        const result = mapBasesData(entries, config);

        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, 'test2.md');
        assert.strictEqual(result[0].Status, 'Frontmatter Status');
    });

    it('should fall back to frontmatter if getValue returns null/undefined', () => {
        const entries = [
            {
                file: { path: 'test3.md', basename: 'test3' },
                getValue: (prop: string) => null,
                frontmatter: {
                    Status: 'Frontmatter Status'
                }
            }
        ];
        const config = { groupBy: 'Status', splitColumnsBy: null, sortBy: null };
        const result = mapBasesData(entries, config);

        assert.strictEqual(result[0].Status, 'Frontmatter Status');
    });

    it('should handle nested property names in frontmatter fallback', () => {
        const entries = [
            {
                file: { path: 'test4.md', basename: 'test4' },
                frontmatter: {
                    Status: 'Nested Status'
                }
            }
        ];
        // Bases uses 'note.Status' sometimes for the property name
        const config = { groupBy: 'note.Status', splitColumnsBy: null, sortBy: null };
        const result = mapBasesData(entries, config);

        // 'note.Status' fallback should look for 'Status' in frontmatter
        assert.strictEqual(result[0]['note.Status'], 'Nested Status');
    });

    it('should handle nested property names with direct fallback in frontmatter', () => {
        const entries = [
            {
                file: { path: 'test5.md', basename: 'test5' },
                frontmatter: {
                    'note.Status': 'Direct Nested Status'
                }
            }
        ];
        const config = { groupBy: 'note.Status', splitColumnsBy: null, sortBy: null };
        const result = mapBasesData(entries, config);

        assert.strictEqual(result[0]['note.Status'], 'Direct Nested Status');
    });
});
