const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { getProvider, registerProvider } = require('../../src/providers/registry');
const { ClaudeProvider } = require('../../src/providers/claude');
const { OpenAIProvider } = require('../../src/providers/openai');

describe('providers/registry', () => {
    it('returns ClaudeProvider for "claude"', () => {
        const provider = getProvider('claude', { anthropicKey: 'test' });
        assert.ok(provider instanceof ClaudeProvider);
    });

    it('returns OpenAIProvider for "codex"', () => {
        const provider = getProvider('codex', { openaiKey: 'test' });
        assert.ok(provider instanceof OpenAIProvider);
    });

    it('throws for unknown provider', () => {
        assert.throws(() => getProvider('unknown', {}), /Unknown provider: "unknown"/);
    });

    it('registerProvider adds a new provider', () => {
        class CustomProvider {
            constructor(config) { this.config = config; }
        }
        registerProvider('custom', CustomProvider);
        const provider = getProvider('custom', { foo: 'bar' });
        assert.ok(provider instanceof CustomProvider);
        // Clean up — remove custom registration
        registerProvider('custom', undefined);
    });
});
