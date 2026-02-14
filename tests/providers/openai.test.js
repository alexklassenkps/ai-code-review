const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { OpenAIProvider } = require('../../src/providers/openai');

afterEach(() => {
    delete global.fetch;
});

describe('OpenAIProvider', () => {
    it('includes context content in review request payload', async () => {
        let fetchCall = null;
        global.fetch = async (url, options) => {
            fetchCall = { url, options };
            return {
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: '{"summary":"ok","comments":[]}' } }],
                }),
            };
        };

        const provider = new OpenAIProvider({
            openaiKey: 'test-key',
            codexModel: 'gpt-4o',
        });

        await provider.review('diff body', 'please focus on tests', 'REVIEW_HINTS.md content');

        assert.equal(fetchCall.url, 'https://api.openai.com/v1/chat/completions');
        const payload = JSON.parse(fetchCall.options.body);
        assert.equal(payload.model, 'gpt-4o');
        assert.match(payload.messages[1].content, /Project Context:\n\nREVIEW_HINTS\.md content/);
        assert.match(payload.messages[1].content, /Pull Request Diff:\n```\ndiff body\n```/);
    });

    it('throws when openai key is missing', async () => {
        const provider = new OpenAIProvider({ codexModel: 'gpt-4o' });
        await assert.rejects(() => provider.review('diff', 'msg', 'ctx'), /openai_api_key is required/);
    });
});
