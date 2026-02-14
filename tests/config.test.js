const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { getConfig } = require('../src/config');

const ENV_KEYS = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'DEFAULT_PROVIDER',
    'CLAUDE_MODEL',
    'CODEX_MODEL',
    'PLATFORM',
    'PLATFORM_TOKEN',
    'PLATFORM_URL',
    'FORGEJO_TOKEN',
    'FORGEJO_URL',
    'CONTEXT_FILES',
    'INPUT_PLATFORM_TOKEN',
    'INPUT_PLATFORM_URL',
    'INPUT_FORGEJO_TOKEN',
    'INPUT_FORGEJO_URL',
    'INPUT_CONTEXT_FILES',
    'platform_token',
    'platform_url',
    'openai_api_key',
];

describe('getConfig', () => {
    let originalEnv = {};

    beforeEach(() => {
        originalEnv = {};
        for (const key of ENV_KEYS) {
            originalEnv[key] = process.env[key];
            delete process.env[key];
        }
    });

    afterEach(() => {
        for (const key of ENV_KEYS) {
            if (originalEnv[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = originalEnv[key];
            }
        }
    });

    it('uses Forgejo env variables when inputs are not provided', () => {
        process.env.FORGEJO_TOKEN = 'token-from-env';
        process.env.FORGEJO_URL = 'https://forgejo.example.com/';
        process.env.CONTEXT_FILES = 'ARCH.md, REVIEW_HINTS.md';

        const config = getConfig();

        assert.equal(config.platformToken, 'token-from-env');
        assert.equal(config.platformUrl, 'https://forgejo.example.com');
        assert.deepEqual(config.contextFiles, ['ARCH.md', 'REVIEW_HINTS.md']);
    });

    it('prefers action inputs over env variables', () => {
        process.env.FORGEJO_TOKEN = 'token-from-env';
        process.env.FORGEJO_URL = 'https://forgejo.example.com/';
        process.env.INPUT_PLATFORM_TOKEN = 'token-from-input';
        process.env.INPUT_PLATFORM_URL = 'https://input.example.com/';

        const config = getConfig();

        assert.equal(config.platformToken, 'token-from-input');
        assert.equal(config.platformUrl, 'https://input.example.com');
    });

    it('accepts lowercase env variable names', () => {
        process.env.platform_token = 'token-lowercase';
        process.env.platform_url = 'https://lowercase.example.com/';
        process.env.openai_api_key = 'openai-lowercase';

        const config = getConfig();

        assert.equal(config.platformToken, 'token-lowercase');
        assert.equal(config.platformUrl, 'https://lowercase.example.com');
        assert.equal(config.openaiKey, 'openai-lowercase');
    });
});
