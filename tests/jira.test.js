const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { extractTicketKey, createJiraClient } = require('../src/jira');

describe('extractTicketKey', () => {
    it('extracts PROJ-123 from plain text', () => {
        assert.equal(extractTicketKey('PROJ-123'), 'PROJ-123');
    });

    it('extracts AB-1 (short project key)', () => {
        assert.equal(extractTicketKey('AB-1'), 'AB-1');
    });

    it('extracts ticket from PR title like "feat: PROJ-123 add login"', () => {
        assert.equal(extractTicketKey('feat: PROJ-123 add login'), 'PROJ-123');
    });

    it('extracts ticket from branch name like "feature/PROJ-123-add-login"', () => {
        assert.equal(extractTicketKey('feature/PROJ-123-add-login'), 'PROJ-123');
    });

    it('returns first match when multiple tickets present', () => {
        assert.equal(extractTicketKey('PROJ-123 and PROJ-456'), 'PROJ-123');
    });

    it('returns null when no ticket found', () => {
        assert.equal(extractTicketKey('just a regular title'), null);
    });

    it('returns null for empty string', () => {
        assert.equal(extractTicketKey(''), null);
    });

    it('returns null for null input', () => {
        assert.equal(extractTicketKey(null), null);
    });

    it('returns null for undefined input', () => {
        assert.equal(extractTicketKey(undefined), null);
    });

    it('does not match lowercase keys', () => {
        assert.equal(extractTicketKey('proj-123'), null);
    });

    it('supports numeric characters in project key', () => {
        assert.equal(extractTicketKey('A1B-99'), 'A1B-99');
    });

    it('matches only the given prefix when provided', () => {
        assert.equal(extractTicketKey('feat: ECOM-1265 add checkout', 'ECOM'), 'ECOM-1265');
    });

    it('returns null when prefix does not match', () => {
        assert.equal(extractTicketKey('feat: OTHER-99 something', 'ECOM'), null);
    });

    it('matches prefix in branch name', () => {
        assert.equal(extractTicketKey('feature/ECOM-42-add-login', 'ECOM'), 'ECOM-42');
    });

    it('ignores other ticket patterns when prefix is set', () => {
        assert.equal(extractTicketKey('ABC-1 and ECOM-5', 'ECOM'), 'ECOM-5');
    });
});

describe('createJiraClient', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('constructs correct URL and auth header for getIssue', async () => {
        let capturedUrl, capturedOptions;
        globalThis.fetch = async (url, options) => {
            capturedUrl = url;
            capturedOptions = options;
            return {
                ok: true,
                json: async () => ({ fields: { description: '' } }),
            };
        };

        const client = createJiraClient({
            url: 'https://team.atlassian.net',
            email: 'user@example.com',
            token: 'api-token-123',
        });

        await client.getIssue('PROJ-42');

        assert.equal(capturedUrl, 'https://team.atlassian.net/rest/api/2/issue/PROJ-42');
        const expectedAuth = Buffer.from('user@example.com:api-token-123').toString('base64');
        assert.equal(capturedOptions.headers['Authorization'], `Basic ${expectedAuth}`);
    });

    it('strips trailing slash from URL', async () => {
        let capturedUrl;
        globalThis.fetch = async (url) => {
            capturedUrl = url;
            return { ok: true, json: async () => ({ fields: { description: '' } }) };
        };

        const client = createJiraClient({
            url: 'https://team.atlassian.net/',
            email: 'a@b.com',
            token: 't',
        });

        await client.getIssue('X-1');
        assert.equal(capturedUrl, 'https://team.atlassian.net/rest/api/2/issue/X-1');
    });

    it('throws on non-ok response', async () => {
        globalThis.fetch = async () => ({ ok: false, status: 404 });

        const client = createJiraClient({ url: 'https://x.net', email: 'a@b.com', token: 't' });

        await assert.rejects(
            () => client.getIssue('NOPE-1'),
            { message: /Jira API error \(404\)/ }
        );
    });
});

describe('getTicketDescription', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('returns the description field from the issue', async () => {
        globalThis.fetch = async () => ({
            ok: true,
            json: async () => ({
                fields: {
                    description: 'Build a login page with email and password fields.',
                },
            }),
        });

        const client = createJiraClient({ url: 'https://x.net', email: 'a@b.com', token: 't' });
        const desc = await client.getTicketDescription('PROJ-1');

        assert.equal(desc, 'Build a login page with email and password fields.');
    });

    it('returns empty string when description is null', async () => {
        globalThis.fetch = async () => ({
            ok: true,
            json: async () => ({
                fields: { description: null },
            }),
        });

        const client = createJiraClient({ url: 'https://x.net', email: 'a@b.com', token: 't' });
        const desc = await client.getTicketDescription('PROJ-2');

        assert.equal(desc, '');
    });
});
