const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { LLMProvider } = require('../../src/providers/base');

describe('LLMProvider', () => {
    it('stores config in constructor', () => {
        const config = { anthropicKey: 'test' };
        const provider = new LLMProvider(config);
        assert.equal(provider.config, config);
    });

    it('buildUserMessage includes diff', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildUserMessage('some diff', '');
        assert.match(msg, /some diff/);
    });

    it('buildUserMessage includes user message when provided', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildUserMessage('diff', 'check for bugs');
        assert.match(msg, /User request: check for bugs/);
        assert.match(msg, /diff/);
    });

    it('buildUserMessage omits user request prefix when message is empty', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildUserMessage('diff', '');
        assert.ok(!msg.includes('User request:'));
    });

    it('buildUserMessage omits user request prefix when message is undefined', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildUserMessage('diff');
        assert.ok(!msg.includes('User request:'));
    });

    it('validateConfig throws not implemented', () => {
        const provider = new LLMProvider({});
        assert.throws(() => provider.validateConfig(), /must be implemented/);
    });

    it('review throws not implemented', async () => {
        const provider = new LLMProvider({});
        await assert.rejects(() => provider.review('diff'), /must be implemented/);
    });

    it('buildUserMessage includes context when provided', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildUserMessage('diff', 'msg', 'my context');
        assert.match(msg, /Project Context:\n\nmy context/);
    });

    it('buildUserMessage omits context when empty string', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildUserMessage('diff', 'msg', '');
        assert.ok(!msg.includes('Project Context:'));
    });

    it('buildUserMessage omits context when undefined', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildUserMessage('diff', 'msg');
        assert.ok(!msg.includes('Project Context:'));
    });

    it('context appears before diff', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildUserMessage('diff', 'msg', 'ctx');
        const ctxIndex = msg.indexOf('Project Context:');
        const diffIndex = msg.indexOf('Pull Request Diff:');
        assert.ok(ctxIndex < diffIndex, 'context should appear before diff');
    });
});
