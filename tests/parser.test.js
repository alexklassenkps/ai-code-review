const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseReviewResponse } = require('../src/parser');

describe('parseReviewResponse', () => {
    it('parses clean JSON', () => {
        const input = '{"summary": "Looks good", "comments": []}';
        const result = parseReviewResponse(input);
        assert.equal(result.summary, 'Looks good');
        assert.deepEqual(result.comments, []);
    });

    it('strips markdown json fences', () => {
        const input = '```json\n{"summary": "Test"}\n```';
        const result = parseReviewResponse(input);
        assert.equal(result.summary, 'Test');
    });

    it('strips plain markdown fences', () => {
        const input = '```\n{"summary": "Test"}\n```';
        const result = parseReviewResponse(input);
        assert.equal(result.summary, 'Test');
    });

    it('handles leading/trailing whitespace', () => {
        const input = '  \n  {"summary": "Test"}  \n  ';
        const result = parseReviewResponse(input);
        assert.equal(result.summary, 'Test');
    });

    it('throws on malformed JSON', () => {
        assert.throws(() => parseReviewResponse('not json at all'), {
            name: 'SyntaxError',
        });
    });

    it('parses response with comments array', () => {
        const input = JSON.stringify({
            summary: 'Found issues',
            comments: [
                { path: 'src/index.js', line: 10, severity: 'warning', message: 'Unused variable' },
            ],
        });
        const result = parseReviewResponse(input);
        assert.equal(result.comments.length, 1);
        assert.equal(result.comments[0].severity, 'warning');
    });
});
