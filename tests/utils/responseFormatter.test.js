/**
 * FalconMind — Response Formatter Tests
 */

const { format } = require('../../utils/responseFormatter');

describe('responseFormatter', () => {
    describe('format()', () => {
        test('returns error message when result is null', () => {
            const output = format('list_detections', null);
            expect(output).toContain('No data returned');
        });

        test('passes through error messages gracefully', () => {
            const result = { error: true, message: 'Scope not permitted' };
            const output = format('list_detections', result);
            expect(output).toBe('Scope not permitted');
        });

        test('passes through message-only results', () => {
            const result = { message: 'No detections found' };
            const output = format('list_detections', result);
            expect(output).toContain('No detections found');
        });
    });

    describe('formatDetections', () => {
        test('formats empty detections list', () => {
            const result = { detections: [], total: 0 };
            const output = format('list_detections', result);
            expect(output).toContain('No detections found');
        });

        test('formats detections with data', () => {
            const result = {
                detections: [{
                    composite_id: 'abc123def456ghi789',
                    severity_name: 'High',
                    status: 'new',
                    hostname: 'WORKSTATION-01',
                    tactic: 'Execution',
                    last_updated_timestamp: '2026-03-01T10:00:00Z',
                }],
                total: 1,
            };
            const output = format('list_detections', result);
            expect(output).toContain('1 alert(s) found');
            expect(output).toContain('**High**');
            expect(output).toContain('WORKSTATION-01');
            expect(output).toContain('Execution');
        });
    });

    describe('formatHosts', () => {
        test('formats hosts with data', () => {
            const result = {
                hosts: [{
                    hostname: 'SERVER-01',
                    platform_name: 'Windows',
                    os_version: 'Windows Server 2022',
                    status: 'normal',
                    last_seen: '2026-03-01T09:00:00Z',
                    device_id: 'aaaa1111bbbb2222',
                }],
                total: 1,
            };
            const output = format('list_hosts', result);
            expect(output).toContain('1 host(s) found');
            expect(output).toContain('SERVER-01');
            expect(output).toContain('Windows');
        });
    });

    describe('formatDetectionDetail', () => {
        test('formats single detection detail', () => {
            const result = {
                composite_id: 'det_12345',
                severity_name: 'Critical',
                status: 'new',
                hostname: 'DC-01',
                tactic: 'Lateral Movement',
                technique: 'T1021',
                last_updated_timestamp: '2026-03-01T10:00:00Z',
                description: 'Suspicious remote service creation',
            };
            const output = format('get_detection_detail', result);
            expect(output).toContain('Detection Detail');
            expect(output).toContain('Critical');
            expect(output).toContain('DC-01');
            expect(output).toContain('Lateral Movement');
        });

        test('handles null result', () => {
            const output = format('get_detection_detail', null);
            expect(output).toContain('No data');
        });
    });

    describe('formatHostDetail', () => {
        test('formats single host detail', () => {
            const result = {
                hostname: 'LAPTOP-42',
                platform_name: 'Mac',
                os_version: 'macOS Ventura 13.5',
                status: 'normal',
                last_seen: '2026-03-01T09:00:00Z',
                local_ip: '10.0.0.42',
                external_ip: '203.0.113.42',
                device_id: 'device_abc123',
                agent_version: '7.08.17806.0',
            };
            const output = format('get_host_detail', result);
            expect(output).toContain('Host Detail');
            expect(output).toContain('LAPTOP-42');
            expect(output).toContain('Mac');
            expect(output).toContain('10.0.0.42');
        });
    });

    describe('formatVulnerabilityPosture', () => {
        test('formats vulnerability posture', () => {
            const result = { critical: 5, high: 12, medium: 30, low: 100 };
            const output = format('get_vulnerability_posture', result);
            expect(output).toContain('Vulnerability Posture');
            expect(output).toContain('5');
            expect(output).toContain('immediate attention');
        });

        test('shows clean message when no criticals', () => {
            const result = { critical: 0, high: 3, medium: 10, low: 20 };
            const output = format('get_vulnerability_posture', result);
            expect(output).toContain('No critical');
        });
    });

    describe('formatRTRResult', () => {
        test('formats successful RTR command', () => {
            const result = { complete: true, stdout: 'PID 1234 nginx' };
            const output = format('rtr_run_command', result);
            expect(output).toContain('Command Output');
            expect(output).toContain('PID 1234');
        });

        test('formats RTR timeout', () => {
            const result = { complete: false, stderr: 'Timed out' };
            const output = format('rtr_run_command', result);
            expect(output).toContain('Timed Out');
        });
    });

    describe('generic fallback', () => {
        test('formats unknown functions as JSON', () => {
            const result = { someKey: 'someValue', nested: { a: 1 } };
            const output = format('unknown_function', result);
            expect(output).toContain('```json');
            expect(output).toContain('someKey');
        });
    });
});
