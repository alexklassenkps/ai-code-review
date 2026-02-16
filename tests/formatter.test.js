const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { severityIcon, formatInlineComment, formatFallbackComment, buildSummaryComment, buildFollowUpReply } = require('../src/formatter');

describe('severityIcon', () => {
    it('returns red circle for critical', () => {
        assert.equal(severityIcon('critical'), '\u{1F534}');
    });

    it('returns yellow circle for warning', () => {
        assert.equal(severityIcon('warning'), '\u{1F7E1}');
    });

    it('returns blue circle for suggestion', () => {
        assert.equal(severityIcon('suggestion'), '\u{1F535}');
    });

    it('returns green circle for praise', () => {
        assert.equal(severityIcon('praise'), '\u{1F7E2}');
    });

    it('returns speech bubble for unknown severity', () => {
        assert.equal(severityIcon('unknown'), '\u{1F4AC}');
    });

    it('returns speech bubble for undefined', () => {
        assert.equal(severityIcon(undefined), '\u{1F4AC}');
    });
});

describe('formatInlineComment', () => {
    it('formats a comment with severity', () => {
        const result = formatInlineComment({ severity: 'warning', message: 'Check this' });
        assert.match(result, /WARNING/);
        assert.match(result, /Check this/);
    });

    it('handles undefined severity gracefully', () => {
        const result = formatInlineComment({ message: 'Something' });
        // severity?.toUpperCase() returns undefined, which gets stringified
        assert.match(result, /undefined/);
        assert.match(result, /Something/);
    });
});

describe('formatFallbackComment', () => {
    it('includes path and line', () => {
        const result = formatFallbackComment({ path: 'src/foo.js', line: 42, severity: 'critical', message: 'Bug here' });
        assert.match(result, /src\/foo\.js:42/);
        assert.match(result, /Bug here/);
    });
});

describe('buildSummaryComment', () => {
    it('builds summary with no comments', () => {
        const result = buildSummaryComment({
            providerName: 'Claude',
            review: { summary: 'All good', comments: [] },
            triggerUser: 'alice',
            inlineSuccess: 0,
        });
        assert.match(result, /Claude Code Review/);
        assert.match(result, /All good/);
        assert.match(result, /No issues found/);
        assert.match(result, /@alice/);
    });

    it('includes fallback comments for failed inline posts', () => {
        const result = buildSummaryComment({
            providerName: 'Claude',
            review: {
                summary: 'Found issues',
                comments: [
                    { path: 'a.js', line: 1, severity: 'warning', message: 'Bad' },
                ],
            },
            triggerUser: 'bob',
            inlineSuccess: 0,
        });
        assert.match(result, /a\.js:1/);
        assert.match(result, /Bad/);
    });

    it('shows inline count when some succeeded', () => {
        const result = buildSummaryComment({
            providerName: 'Codex',
            review: {
                summary: 'Review',
                comments: [
                    { path: 'a.js', line: 1, severity: 'warning', message: 'x', _inlinePosted: true },
                    { path: 'b.js', line: 2, severity: 'critical', message: 'y' },
                ],
            },
            triggerUser: 'charlie',
            inlineSuccess: 1,
        });
        assert.match(result, /1 inline comment/);
        assert.match(result, /b\.js:2/);
        // The inlined comment should NOT appear in fallback
        assert.ok(!result.includes('a.js:1'));
    });

    it('handles review with no comments property', () => {
        const result = buildSummaryComment({
            providerName: 'Claude',
            review: { summary: 'LGTM' },
            triggerUser: 'dave',
            inlineSuccess: 0,
        });
        assert.match(result, /No issues found/);
    });

    it('includes context files section with included and missing files', () => {
        const result = buildSummaryComment({
            providerName: 'Claude',
            review: { summary: 'LGTM', comments: [] },
            triggerUser: 'eve',
            inlineSuccess: 0,
            contextFiles: {
                requestedFiles: ['ARCH.md', 'MISSING.md'],
                includedFiles: ['ARCH.md'],
                missingFiles: ['MISSING.md'],
            },
        });

        assert.match(result, /\*\*Context Files\*\*/);
        assert.match(result, /Requested: `ARCH\.md`, `MISSING\.md`/);
        assert.match(result, /Included \(1\): `ARCH\.md`/);
        assert.match(result, /Could not include \(1\): `MISSING\.md`/);
    });

    it('shows fallback text when no context files were provided', () => {
        const result = buildSummaryComment({
            providerName: 'Claude',
            review: { summary: 'LGTM', comments: [] },
            triggerUser: 'frank',
            inlineSuccess: 0,
            contextFiles: null,
        });

        assert.match(result, /No Context Files included/);
    });
});

describe('buildFollowUpReply', () => {
    it('includes response text', () => {
        const result = buildFollowUpReply({ providerName: '🧠 Claude', responseText: 'Here is my explanation.' });
        assert.match(result, /Here is my explanation\./);
    });

    it('includes provider footer', () => {
        const result = buildFollowUpReply({ providerName: '🧠 Claude', responseText: 'Response text' });
        assert.match(result, /_— 🧠 Claude_/);
    });

    it('puts footer after response text', () => {
        const result = buildFollowUpReply({ providerName: '🤖 Codex', responseText: 'My answer' });
        const responseIdx = result.indexOf('My answer');
        const footerIdx = result.indexOf('_— 🤖 Codex_');
        assert.ok(responseIdx < footerIdx, 'response should appear before footer');
    });
});
