const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { annotateDiff } = require('../src/index');

describe('annotateDiff', () => {
    it('annotates added lines with correct line numbers', () => {
        const diff = [
            'diff --git a/file.js b/file.js',
            'index abc..def 100644',
            '--- a/file.js',
            '+++ b/file.js',
            '@@ -1,3 +1,4 @@',
            ' line1',
            '+added',
            ' line2',
            ' line3',
        ].join('\n');

        const result = annotateDiff(diff);
        const lines = result.split('\n');

        // diff --git passes through (else branch)
        assert.equal(lines[0], 'diff --git a/file.js b/file.js');
        // index passes through (else branch)
        assert.equal(lines[1], 'index abc..def 100644');
        // --- starts with '-', gets 5-space prefix
        assert.equal(lines[2], '     --- a/file.js');
        // +++ starts with '+', gets [L0] prefix (before hunk sets line)
        assert.equal(lines[3], '[L0] +++ b/file.js');
        // Hunk header passes through
        assert.equal(lines[4], '@@ -1,3 +1,4 @@');
        // Context line at L1
        assert.equal(lines[5], '[L1]  line1');
        // Added line at L2
        assert.equal(lines[6], '[L2] +added');
        // Context continues at L3, L4
        assert.equal(lines[7], '[L3]  line2');
        assert.equal(lines[8], '[L4]  line3');
    });

    it('does not increment line numbers for removed lines', () => {
        const diff = [
            '@@ -1,3 +1,2 @@',
            ' line1',
            '-removed',
            ' line2',
        ].join('\n');

        const result = annotateDiff(diff);
        const lines = result.split('\n');

        assert.equal(lines[1], '[L1]  line1');
        assert.equal(lines[2], '     -removed');
        assert.equal(lines[3], '[L2]  line2');
    });

    it('resets line numbers at each hunk', () => {
        const diff = [
            '@@ -1,2 +1,2 @@',
            ' a',
            '+b',
            '@@ -10,2 +10,2 @@',
            ' c',
            '+d',
        ].join('\n');

        const result = annotateDiff(diff);
        const lines = result.split('\n');

        assert.equal(lines[1], '[L1]  a');
        assert.equal(lines[2], '[L2] +b');
        // Second hunk resets to line 10
        assert.equal(lines[4], '[L10]  c');
        assert.equal(lines[5], '[L11] +d');
    });

    it('handles empty diff', () => {
        // Empty string splits to [''], which is one empty line matching line === ''
        const result = annotateDiff('');
        assert.equal(result, '[L0] ');
    });

    it('handles multi-file diff', () => {
        const diff = [
            'diff --git a/a.js b/a.js',
            '--- a/a.js',
            '+++ b/a.js',
            '@@ -1,1 +1,2 @@',
            ' old',
            '+new',
            'diff --git a/b.js b/b.js',
            '--- a/b.js',
            '+++ b/b.js',
            '@@ -5,1 +5,1 @@',
            '-removed',
            '+added',
        ].join('\n');

        const result = annotateDiff(diff);
        const lines = result.split('\n');

        // First file
        assert.equal(lines[0], 'diff --git a/a.js b/a.js');
        assert.equal(lines[1], '     --- a/a.js');
        assert.equal(lines[2], '[L0] +++ b/a.js');
        assert.equal(lines[3], '@@ -1,1 +1,2 @@');
        assert.equal(lines[4], '[L1]  old');
        assert.equal(lines[5], '[L2] +new');
        // Second file
        assert.equal(lines[6], 'diff --git a/b.js b/b.js');
        assert.equal(lines[7], '     --- a/b.js');
        assert.equal(lines[8], '[L3] +++ b/b.js');
        assert.equal(lines[9], '@@ -5,1 +5,1 @@');
        assert.equal(lines[10], '     -removed');
        assert.equal(lines[11], '[L5] +added');
    });

    it('handles hunk with non-1 start line', () => {
        const diff = [
            '@@ -50,3 +100,4 @@',
            ' ctx',
            '+added',
            ' ctx2',
        ].join('\n');

        const result = annotateDiff(diff);
        const lines = result.split('\n');

        assert.equal(lines[1], '[L100]  ctx');
        assert.equal(lines[2], '[L101] +added');
        assert.equal(lines[3], '[L102]  ctx2');
    });
});
