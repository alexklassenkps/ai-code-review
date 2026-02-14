const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getPlatformClient, registerPlatform } = require('../../src/clients/registry');
const { ForgejoClient } = require('../../src/clients/forgejo');

describe('clients/registry', () => {
    it('returns ForgejoClient for "forgejo"', () => {
        const client = getPlatformClient('forgejo', 'https://codeberg.org', 'tok');
        assert.ok(client instanceof ForgejoClient);
    });

    it('passes url and token to client', () => {
        const client = getPlatformClient('forgejo', 'https://codeberg.org', 'tok');
        assert.equal(client.url, 'https://codeberg.org');
        assert.equal(client.token, 'tok');
    });

    it('throws for unknown platform', () => {
        assert.throws(() => getPlatformClient('bitbucket', 'u', 't'), /Unknown platform: "bitbucket"/);
    });

    it('registerPlatform adds a new platform', () => {
        class FakeClient {
            constructor(url, token) { this.url = url; this.token = token; }
        }
        registerPlatform('fake', FakeClient);
        const client = getPlatformClient('fake', 'https://fake.io', 'tok');
        assert.ok(client instanceof FakeClient);
        // Clean up
        registerPlatform('fake', undefined);
    });
});
