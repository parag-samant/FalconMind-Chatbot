/**
 * FalconMind — Summarization Prompt Builder Tests
 */

const { buildSummarizationPrompt } = require('../../utils/summarizationPrompt');

describe('buildSummarizationPrompt', () => {
    const mockResult = { detections: [{ id: '1', severity: 'High' }], total: 1 };

    test('returns a non-empty string prompt', () => {
        const prompt = buildSummarizationPrompt('list_detections', mockResult, 'Show me alerts');
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(100);
    });

    test('includes the user query in the prompt', () => {
        const prompt = buildSummarizationPrompt('list_hosts', {}, 'List all Windows hosts');
        expect(prompt).toContain('List all Windows hosts');
    });

    test('includes the function name', () => {
        const prompt = buildSummarizationPrompt('hunt_by_hash', {}, 'Hunt this hash');
        expect(prompt).toContain('hunt_by_hash');
    });

    test('includes JSON result data', () => {
        const result = { findings: [{ severity: 'Critical', host: 'DC-01' }] };
        const prompt = buildSummarizationPrompt('list_detections', result, 'test');
        expect(prompt).toContain('Critical');
        expect(prompt).toContain('DC-01');
    });

    test('applies detection-specific analysis guidance', () => {
        const prompt = buildSummarizationPrompt('list_detections', mockResult, 'test');
        expect(prompt).toContain('Detections/Incidents');
        expect(prompt).toContain('MITRE');
    });

    test('applies hunting-specific analysis guidance', () => {
        const prompt = buildSummarizationPrompt('hunt_by_hash', {}, 'test');
        expect(prompt).toContain('Threat Hunting');
        expect(prompt).toContain('RISK LEVEL');
    });

    test('applies intel-specific analysis guidance', () => {
        const prompt = buildSummarizationPrompt('search_threat_actors', {}, 'test');
        expect(prompt).toContain('Threat Intelligence');
        expect(prompt).toContain('threat actor');
    });

    test('applies host-specific analysis guidance', () => {
        const prompt = buildSummarizationPrompt('get_host_detail', {}, 'test');
        expect(prompt).toContain('Host/Endpoint');
        expect(prompt).toContain('containment');
    });

    test('applies vulnerability-specific analysis guidance', () => {
        const prompt = buildSummarizationPrompt('get_vulnerability_posture', {}, 'test');
        expect(prompt).toContain('Vulnerabilities');
        expect(prompt).toContain('severity breakdown');
    });

    test('applies IOC-specific analysis guidance', () => {
        const prompt = buildSummarizationPrompt('create_ioc', {}, 'test');
        expect(prompt).toContain('IOC Management');
    });

    test('applies general guidance for unknown functions', () => {
        const prompt = buildSummarizationPrompt('some_unknown_function', {}, 'test');
        expect(prompt).toContain('General');
    });

    test('truncates large results to 4000 chars', () => {
        const largeResult = { data: 'x'.repeat(10000) };
        const prompt = buildSummarizationPrompt('list_detections', largeResult, 'test');
        // The JSON portion should be truncated
        expect(prompt.length).toBeLessThan(6000);
    });
});
