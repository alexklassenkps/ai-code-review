const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadContextFiles, loadContextFilesWithStatus } = require('../src/context');

function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-test-'));
}

describe('loadContextFiles', () => {
    it('loads a single file', () => {
        const dir = makeTempDir();
        fs.writeFileSync(path.join(dir, 'ARCH.md'), 'architecture notes');

        const result = loadContextFiles(['ARCH.md'], dir);
        assert.equal(result, '## ARCH.md\n\narchitecture notes');
    });

    it('loads multiple files separated by ---', () => {
        const dir = makeTempDir();
        fs.writeFileSync(path.join(dir, 'A.md'), 'file A');
        fs.writeFileSync(path.join(dir, 'B.md'), 'file B');

        const result = loadContextFiles(['A.md', 'B.md'], dir);
        assert.equal(result, '## A.md\n\nfile A\n\n---\n\n## B.md\n\nfile B');
    });

    it('skips missing files', () => {
        const dir = makeTempDir();
        fs.writeFileSync(path.join(dir, 'exists.md'), 'hello');

        const result = loadContextFiles(['exists.md', 'missing.md'], dir);
        assert.equal(result, '## exists.md\n\nhello');
    });

    it('returns empty string for no paths', () => {
        const result = loadContextFiles([], '/tmp');
        assert.equal(result, '');
    });

    it('returns empty string when all files missing', () => {
        const dir = makeTempDir();
        const result = loadContextFiles(['nope.md', 'also-nope.md'], dir);
        assert.equal(result, '');
    });

    it('uses file path as section heading', () => {
        const dir = makeTempDir();
        fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'docs/guide.md'), 'content');

        const result = loadContextFiles(['docs/guide.md'], dir);
        assert.match(result, /^## docs\/guide\.md\n/);
    });
});

describe('loadContextFilesWithStatus', () => {
    it('returns content plus included and missing files', () => {
        const dir = makeTempDir();
        fs.writeFileSync(path.join(dir, 'exists.md'), 'hello');

        const result = loadContextFilesWithStatus(['exists.md', 'missing.md'], dir);
        assert.equal(result.content, '## exists.md\n\nhello');
        assert.deepEqual(result.includedFiles, ['exists.md']);
        assert.deepEqual(result.missingFiles, ['missing.md']);
    });
});
