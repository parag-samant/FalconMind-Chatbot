/**
 * FalconMind — Confirmation Store Tests
 */

// Mock config before requiring the module
jest.mock('../../config', () => ({
    confirmationTtlMs: 100, // Very short TTL for testing
}));

const { storePending, consumePending, discardPending } = require('../../utils/confirmationStore');

describe('confirmationStore', () => {
    test('storePending returns a valid UUID', () => {
        const id = storePending({
            functionName: 'contain_host',
            args: { device_id: 'abc123' },
            humanDescription: 'contain host abc123',
        });

        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBe(36); // UUID v4 format
    });

    test('consumePending returns the stored entry and removes it', () => {
        const id = storePending({
            functionName: 'delete_ioc',
            args: { ioc_ids: ['id1'] },
            humanDescription: 'delete 1 IOC',
        });

        const entry = consumePending(id);
        expect(entry).not.toBeNull();
        expect(entry.functionName).toBe('delete_ioc');
        expect(entry.args.ioc_ids).toEqual(['id1']);

        // Second consume should return null (already consumed)
        const again = consumePending(id);
        expect(again).toBeNull();
    });

    test('consumePending returns null for unknown ID', () => {
        const result = consumePending('non-existent-id');
        expect(result).toBeNull();
    });

    test('discardPending removes the entry', () => {
        const id = storePending({
            functionName: 'contain_host',
            args: { device_id: 'xyz' },
            humanDescription: 'discard test',
        });

        discardPending(id);
        const result = consumePending(id);
        expect(result).toBeNull();
    });

    test('expired entries return null', async () => {
        const id = storePending({
            functionName: 'contain_host',
            args: { device_id: 'expired' },
            humanDescription: 'will expire',
        });

        // Wait for TTL to expire (100ms configured above)
        await new Promise(r => setTimeout(r, 150));

        const result = consumePending(id);
        expect(result).toBeNull();
    });
});
