const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { detectTrigger } = require('../src/trigger');

describe('detectTrigger', () => {
    it('detects @Claude mention', () => {
        const result = detectTrigger('@Claude please review this');
        assert.equal(result.provider, 'claude');
        assert.equal(result.message, 'please review this');
    });

    it('detects @Codex mention', () => {
        const result = detectTrigger('@Codex check for bugs');
        assert.equal(result.provider, 'codex');
        assert.equal(result.message, 'check for bugs');
    });

    it('is case insensitive', () => {
        const result = detectTrigger('@CLAUDE review');
        assert.equal(result.provider, 'claude');
    });

    it('respects word boundaries', () => {
        const result = detectTrigger('@Claudebot is not a trigger');
        assert.equal(result, null);
    });

    it('returns null for no mention', () => {
        const result = detectTrigger('just a regular comment');
        assert.equal(result, null);
    });

    it('returns null for empty input', () => {
        const result = detectTrigger('');
        assert.equal(result, null);
    });

    it('prefers Claude when both are mentioned', () => {
        const result = detectTrigger('@Claude and @Codex review');
        assert.equal(result.provider, 'claude');
    });

    it('strips the trigger mention from the message', () => {
        const result = detectTrigger('Hey @claude what do you think?');
        assert.equal(result.provider, 'claude');
        // replace + trim leaves double space in the middle (expected behavior)
        assert.equal(result.message, 'Hey  what do you think?');
    });
});
