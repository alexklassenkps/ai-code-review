const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isAIReviewComment, buildThreadFromComments, findThreadAIComment, MAX_THREAD_ENTRIES } = require('../src/conversation');

describe('isAIReviewComment', () => {
    it('returns true for critical', () => {
        assert.ok(isAIReviewComment('🔴 **CRITICAL**: SQL injection vulnerability'));
    });

    it('returns true for warning', () => {
        assert.ok(isAIReviewComment('🟡 **WARNING**: Missing null check'));
    });

    it('returns true for suggestion', () => {
        assert.ok(isAIReviewComment('🔵 **SUGGESTION**: Consider using a map here'));
    });

    it('returns true for praise', () => {
        assert.ok(isAIReviewComment('🟢 **PRAISE**: Great error handling'));
    });

    it('returns false for regular comment', () => {
        assert.ok(!isAIReviewComment('This looks fine to me'));
    });

    it('returns false for empty string', () => {
        assert.ok(!isAIReviewComment(''));
    });

    it('returns false for partial match', () => {
        assert.ok(!isAIReviewComment('**CRITICAL**: missing the emoji'));
    });
});

describe('findThreadAIComment', () => {
    const makeComment = (path, position, body, reviewId) => ({
        id: Math.random(), path, position, body, pull_request_review_id: reviewId,
        user: { login: 'bot' }, created_at: '2025-01-01T00:00:00Z',
    });

    it('returns the AI comment at same path/line', () => {
        const comments = [
            makeComment('src/foo.js', 10, '🔴 **CRITICAL**: Bug here', 1),
        ];
        const result = findThreadAIComment(comments, 'src/foo.js', 10);
        assert.ok(result);
        assert.equal(result.pull_request_review_id, 1);
    });

    it('returns null when no AI comment at path/line', () => {
        const comments = [
            makeComment('src/foo.js', 10, 'Just a regular comment', 1),
        ];
        assert.equal(findThreadAIComment(comments, 'src/foo.js', 10), null);
    });

    it('returns null for AI comment at different path', () => {
        const comments = [
            makeComment('src/bar.js', 10, '🔴 **CRITICAL**: Bug here', 1),
        ];
        assert.equal(findThreadAIComment(comments, 'src/foo.js', 10), null);
    });

    it('returns null for AI comment at different line', () => {
        const comments = [
            makeComment('src/foo.js', 20, '🔴 **CRITICAL**: Bug here', 1),
        ];
        assert.equal(findThreadAIComment(comments, 'src/foo.js', 10), null);
    });

    it('returns null for empty comments array', () => {
        assert.equal(findThreadAIComment([], 'src/foo.js', 10), null);
    });
});

describe('buildThreadFromComments', () => {
    const makeComment = (id, path, position, body, login, createdAt) => ({
        id, path, position, body, user: { login }, created_at: createdAt,
    });

    it('builds chronological thread from matching comments', () => {
        const comments = [
            makeComment(1, 'src/foo.js', 10, '🔴 **CRITICAL**: Bug', 'bot', '2025-01-01T00:00:00Z'),
            makeComment(2, 'src/foo.js', 10, 'Can you explain?', 'alice', '2025-01-01T01:00:00Z'),
        ];
        const result = buildThreadFromComments(comments, 'src/foo.js', 10, 999);
        assert.match(result, /AI Reviewer/);
        assert.match(result, /@alice/);
        assert.match(result, /Can you explain/);
    });

    it('excludes current comment by ID', () => {
        const comments = [
            makeComment(1, 'src/foo.js', 10, '🔴 **CRITICAL**: Bug', 'bot', '2025-01-01T00:00:00Z'),
            makeComment(2, 'src/foo.js', 10, 'Current message', 'alice', '2025-01-01T01:00:00Z'),
        ];
        const result = buildThreadFromComments(comments, 'src/foo.js', 10, 2);
        assert.ok(!result.includes('Current message'));
        assert.match(result, /CRITICAL/);
    });

    it('excludes comments at different path', () => {
        const comments = [
            makeComment(1, 'src/foo.js', 10, '🔴 **CRITICAL**: Bug', 'bot', '2025-01-01T00:00:00Z'),
            makeComment(2, 'src/bar.js', 10, 'Different file', 'alice', '2025-01-01T01:00:00Z'),
        ];
        const result = buildThreadFromComments(comments, 'src/foo.js', 10, 999);
        assert.ok(!result.includes('Different file'));
    });

    it('excludes comments at different line', () => {
        const comments = [
            makeComment(1, 'src/foo.js', 10, '🔴 **CRITICAL**: Bug', 'bot', '2025-01-01T00:00:00Z'),
            makeComment(2, 'src/foo.js', 20, 'Different line', 'alice', '2025-01-01T01:00:00Z'),
        ];
        const result = buildThreadFromComments(comments, 'src/foo.js', 10, 999);
        assert.ok(!result.includes('Different line'));
    });

    it('limits to MAX_THREAD_ENTRIES', () => {
        const comments = [];
        for (let i = 0; i < MAX_THREAD_ENTRIES + 5; i++) {
            comments.push(makeComment(
                i, 'src/foo.js', 10, `Comment ${i}`, 'user', `2025-01-01T${String(i).padStart(2, '0')}:00:00Z`
            ));
        }
        const result = buildThreadFromComments(comments, 'src/foo.js', 10, 999);
        const entries = result.split('\n\n---\n\n');
        assert.equal(entries.length, MAX_THREAD_ENTRIES);
    });

    it('returns empty string for no matching comments', () => {
        const comments = [
            makeComment(1, 'src/bar.js', 20, 'Not matching', 'alice', '2025-01-01T00:00:00Z'),
        ];
        const result = buildThreadFromComments(comments, 'src/foo.js', 10, 999);
        assert.equal(result, '');
    });

    it('labels AI comments as AI Reviewer', () => {
        const comments = [
            makeComment(1, 'src/foo.js', 10, '🟡 **WARNING**: Check this', 'bot', '2025-01-01T00:00:00Z'),
        ];
        const result = buildThreadFromComments(comments, 'src/foo.js', 10, 999);
        assert.match(result, /\*\*AI Reviewer:\*\*/);
    });

    it('labels user comments with @username', () => {
        const comments = [
            makeComment(1, 'src/foo.js', 10, 'I have a question', 'alice', '2025-01-01T00:00:00Z'),
        ];
        const result = buildThreadFromComments(comments, 'src/foo.js', 10, 999);
        assert.match(result, /\*\*@alice:\*\*/);
    });

    it('sorts by created_at chronologically', () => {
        const comments = [
            makeComment(2, 'src/foo.js', 10, 'Second', 'alice', '2025-01-01T02:00:00Z'),
            makeComment(1, 'src/foo.js', 10, 'First', 'bob', '2025-01-01T01:00:00Z'),
        ];
        const result = buildThreadFromComments(comments, 'src/foo.js', 10, 999);
        const firstIdx = result.indexOf('First');
        const secondIdx = result.indexOf('Second');
        assert.ok(firstIdx < secondIdx, 'First should appear before Second');
    });
});
