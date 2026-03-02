/**
 * FalconMind — AI Factory Tests
 */

// Mock all dependencies before requiring
jest.mock('../../config', () => ({
    aiProvider: 'groq',
    openai: { apiKey: 'test-key', model: 'gpt-4o-mini', maxTokens: 2048 },
    gemini: { apiKey: 'test-key', model: 'gemini-2.5-flash', maxTokens: 8192 },
    groq: { apiKey: 'test-key', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama3-70b', maxTokens: 8192 },
    ollama: { baseUrl: 'http://localhost:11434/v1', model: 'hermes3', enableTools: true },
}));

// Mock the chat services to avoid real API calls
jest.mock('../../services/ollama/chat', () => ({
    chat: jest.fn(),
    summarizeResult: jest.fn(),
}));
jest.mock('../../services/groq/chat', () => ({
    chat: jest.fn(),
    summarizeResult: jest.fn(),
}));
jest.mock('../../services/openai/chat', () => ({
    chat: jest.fn(),
    summarizeResult: jest.fn(),
}));
jest.mock('../../services/gemini/chat', () => ({
    chat: jest.fn(),
    summarizeResult: jest.fn(),
}));

const { getProvider } = require('../../services/ai/factory');

describe('AI Provider Factory', () => {
    test('returns an object with expected interface', () => {
        const provider = getProvider();
        expect(provider).toHaveProperty('chat');
        expect(provider).toHaveProperty('summarizeResult');
        expect(provider).toHaveProperty('providerName');
        expect(provider).toHaveProperty('model');
        expect(typeof provider.chat).toBe('function');
        expect(typeof provider.summarizeResult).toBe('function');
    });

    test('returns Groq as the provider (configured in mock)', () => {
        const provider = getProvider();
        expect(provider.providerName).toBe('Groq');
        expect(provider.model).toBe('llama3-70b');
    });
});
