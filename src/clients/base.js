class GitPlatformClient {
    constructor(url, token) {
        this.url = url;
        this.token = token;
    }

    get platformName() {
        throw new Error('platformName must be implemented');
    }

    parseEventContext(event, env) {
        throw new Error('parseEventContext() must be implemented');
    }

    async getPRDiff(owner, repo, pr) {
        throw new Error('getPRDiff() must be implemented');
    }

    async getPRInfo(owner, repo, pr) {
        throw new Error('getPRInfo() must be implemented');
    }

    async createComment(owner, repo, pr, body) {
        throw new Error('createComment() must be implemented');
    }

    async createReview(owner, repo, pr, { body, comments }) {
        throw new Error('createReview() must be implemented');
    }

    async addReaction(owner, repo, commentId, reaction) {
        throw new Error('addReaction() must be implemented');
    }

    async getReviewComments(owner, repo, pr) {
        throw new Error('getReviewComments() must be implemented');
    }
}

module.exports = { GitPlatformClient };
