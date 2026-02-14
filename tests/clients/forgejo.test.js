const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ForgejoClient } = require('../../src/clients/forgejo');
const { GitPlatformClient } = require('../../src/clients/base');

describe('ForgejoClient', () => {
    it('extends GitPlatformClient', () => {
        const client = new ForgejoClient('https://codeberg.org', 'tok');
        assert.ok(client instanceof GitPlatformClient);
    });

    it('sets baseUrl with /api/v1 suffix', () => {
        const client = new ForgejoClient('https://codeberg.org', 'tok');
        assert.equal(client.baseUrl, 'https://codeberg.org/api/v1');
    });

    it('platformName returns Forgejo', () => {
        const client = new ForgejoClient('https://codeberg.org', 'tok');
        assert.equal(client.platformName, 'Forgejo');
    });

    describe('parseEventContext', () => {
        it('returns context for issue_comment on PR', () => {
            const event = {
                issue: { number: 42, pull_request: {} },
                comment: { id: 1, body: '@Claude review', user: { login: 'alice' } },
                repository: { full_name: 'owner/repo' },
            };
            const result = new ForgejoClient('u', 't').parseEventContext(event, {});
            assert.deepEqual(result, {
                owner: 'owner',
                repo: 'repo',
                prNumber: 42,
                comment: event.comment,
            });
        });

        it('prefers GITHUB_REPOSITORY env var', () => {
            const event = {
                issue: { number: 1, pull_request: {} },
                comment: { id: 1, body: 'test', user: { login: 'a' } },
                repository: { full_name: 'fallback/repo' },
            };
            const result = new ForgejoClient('u', 't').parseEventContext(event, {
                GITHUB_REPOSITORY: 'env-owner/env-repo',
            });
            assert.equal(result.owner, 'env-owner');
            assert.equal(result.repo, 'env-repo');
        });

        it('returns null for non-PR event', () => {
            const event = { issue: { number: 1 }, comment: { id: 1, body: 'test' } };
            const result = new ForgejoClient('u', 't').parseEventContext(event, {});
            assert.equal(result, null);
        });

        it('returns null when no comment', () => {
            const event = { issue: { number: 1, pull_request: {} } };
            const result = new ForgejoClient('u', 't').parseEventContext(event, {});
            assert.equal(result, null);
        });

        it('returns null when owner/repo cannot be determined', () => {
            const event = {
                issue: { number: 1, pull_request: {} },
                comment: { id: 1, body: 'test' },
            };
            const result = new ForgejoClient('u', 't').parseEventContext(event, {});
            assert.equal(result, null);
        });

        it('handles pull_request event (not issue_comment)', () => {
            const event = {
                pull_request: { number: 99 },
                comment: { id: 1, body: 'test', user: { login: 'a' } },
                repository: { full_name: 'org/proj' },
            };
            const result = new ForgejoClient('u', 't').parseEventContext(event, {});
            assert.equal(result.prNumber, 99);
            assert.equal(result.owner, 'org');
        });
    });
});
