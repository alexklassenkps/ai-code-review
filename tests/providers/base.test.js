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

    it('buildFollowUpMessage includes thread history', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildFollowUpMessage('diff', 'some thread', 'user msg');
        assert.match(msg, /Review Thread:\n\nsome thread/);
    });

    it('buildFollowUpMessage includes context when provided', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildFollowUpMessage('diff', 'thread', 'msg', 'my context');
        assert.match(msg, /Project Context:\n\nmy context/);
    });

    it('buildFollowUpMessage omits context when empty', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildFollowUpMessage('diff', 'thread', 'msg', '');
        assert.ok(!msg.includes('Project Context:'));
    });

    it('buildFollowUpMessage puts diff before thread history', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildFollowUpMessage('diff', 'thread', 'msg');
        const diffIdx = msg.indexOf('Pull Request Diff:');
        const threadIdx = msg.indexOf('Review Thread:');
        assert.ok(diffIdx < threadIdx, 'diff should appear before thread history');
    });

    it('buildFollowUpMessage omits thread section when empty', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildFollowUpMessage('diff', '', 'msg');
        assert.ok(!msg.includes('Review Thread:'));
    });

    it('buildFollowUpMessage includes user follow-up', () => {
        const provider = new LLMProvider({});
        const msg = provider.buildFollowUpMessage('diff', 'thread', 'Can you explain?');
        assert.match(msg, /User's follow-up:\nCan you explain\?/);
    });

    it('followUp throws not implemented', async () => {
        const provider = new LLMProvider({});
        await assert.rejects(() => provider.followUp('diff', 'thread', 'msg'), /must be implemented/);
    });
});
