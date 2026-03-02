/**
 * FalconMind — System Prompt Tests
 */

const { getSystemPrompt } = require('../../services/ai/systemPrompt');

describe('Unified System Prompt', () => {
    test('returns a full variant prompt', () => {
        const prompt = getSystemPrompt('full');
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(5000);
        expect(prompt).toContain('FalconMind');
        expect(prompt).toContain('CrowdStrike');
    });

    test('returns a compact variant prompt', () => {
        const prompt = getSystemPrompt('compact');
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(1000);
        expect(prompt.length).toBeLessThan(getSystemPrompt('full').length);
        expect(prompt).toContain('FalconMind');
    });

    test('full prompt contains IR methodology', () => {
        const prompt = getSystemPrompt('full');
        expect(prompt).toContain('INCIDENT RESPONSE');
        expect(prompt).toContain('DETECT');
        expect(prompt).toContain('CONTAIN');
    });

    test('compact prompt contains function catalog', () => {
        const prompt = getSystemPrompt('compact');
        expect(prompt).toContain('list_detections');
        expect(prompt).toContain('hunt_by_hash');
        expect(prompt).toContain('contain_host');
    });

    test('both variants contain FQL reference', () => {
        const full = getSystemPrompt('full');
        const compact = getSystemPrompt('compact');
        expect(full).toContain('FQL');
        expect(compact).toContain('FQL');
    });

    test('both variants include current date', () => {
        const today = new Date().toISOString().split('T')[0];
        const full = getSystemPrompt('full');
        const compact = getSystemPrompt('compact');
        expect(full).toContain(today);
        expect(compact).toContain(today);
    });

    test('defaults to full variant when no argument', () => {
        const defaultPrompt = getSystemPrompt();
        const fullPrompt = getSystemPrompt('full');
        expect(defaultPrompt).toBe(fullPrompt);
    });
});
