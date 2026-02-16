const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { GitPlatformClient } = require('../../src/clients/base');

describe('GitPlatformClient', () => {
    it('stores url and token in constructor', () => {
        const client = new GitPlatformClient('https://example.com', 'tok123');
        assert.equal(client.url, 'https://example.com');
        assert.equal(client.token, 'tok123');
    });

    it('platformName throws not implemented', () => {
        const client = new GitPlatformClient('u', 't');
        assert.throws(() => client.platformName, /must be implemented/);
    });

    it('parseEventContext throws not implemented', () => {
        const client = new GitPlatformClient('u', 't');
        assert.throws(() => client.parseEventContext({}, {}), /must be implemented/);
    });

    it('getPRDiff throws not implemented', async () => {
        const client = new GitPlatformClient('u', 't');
        await assert.rejects(() => client.getPRDiff('o', 'r', 1), /must be implemented/);
    });

    it('getPRInfo throws not implemented', async () => {
        const client = new GitPlatformClient('u', 't');
        await assert.rejects(() => client.getPRInfo('o', 'r', 1), /must be implemented/);
    });

    it('createComment throws not implemented', async () => {
        const client = new GitPlatformClient('u', 't');
        await assert.rejects(() => client.createComment('o', 'r', 1, 'body'), /must be implemented/);
    });

    it('createReview throws not implemented', async () => {
        const client = new GitPlatformClient('u', 't');
        await assert.rejects(
            () => client.createReview('o', 'r', 1, { body: '', comments: [] }),
            /must be implemented/,
        );
    });

    it('addReaction throws not implemented', async () => {
        const client = new GitPlatformClient('u', 't');
        await assert.rejects(() => client.addReaction('o', 'r', 1, 'eyes'), /must be implemented/);
    });

    it('getReviewComments throws not implemented', async () => {
        const client = new GitPlatformClient('u', 't');
        await assert.rejects(() => client.getReviewComments('o', 'r', 1), /must be implemented/);
    });
});
