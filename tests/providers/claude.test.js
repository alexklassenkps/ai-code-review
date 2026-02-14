const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { ClaudeProvider } = require('../../src/providers/claude');

afterEach(() => {
    delete global.fetch;
});

describe('ClaudeProvider', () => {
    it('includes context content in review request payload', async () => {
        let fetchCall = null;
        global.fetch = async (url, options) => {
            fetchCall = { url, options };
            return {
                ok: true,
                json: async () => ({
                    content: [{ text: '{"summary":"ok","comments":[]}' }],
                }),
            };
        };

        const provider = new ClaudeProvider({
            anthropicKey: 'test-key',
            claudeModel: 'claude-sonnet-4-5-20250929',
        });

        await provider.review('diff body', 'please focus on tests', 'ARCH.md content');

        assert.equal(fetchCall.url, 'https://api.anthropic.com/v1/messages');
        const payload = JSON.parse(fetchCall.options.body);
        assert.equal(payload.model, 'claude-sonnet-4-5-20250929');
        assert.match(payload.messages[0].content, /Project Context:\n\nARCH\.md content/);
        assert.match(payload.messages[0].content, /Pull Request Diff:\n```\ndiff body\n```/);
    });

    it('throws when anthropic key is missing', async () => {
        const provider = new ClaudeProvider({ claudeModel: 'claude-sonnet-4-5-20250929' });
        await assert.rejects(() => provider.review('diff', 'msg', 'ctx'), /anthropic_api_key is required/);
    });
});
