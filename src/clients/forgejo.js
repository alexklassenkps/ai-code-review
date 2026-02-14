class ForgejoClient {
    constructor(url, token) {
        this.baseUrl = `${url}/api/v1`;
        this.token = token;
        this.headers = {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    }

    async request(method, path, body) {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Forgejo API ${method} ${path} failed (${res.status}): ${text}`);
        }
        return res.status === 204 ? null : res.json();
    }

    async getPRDiff(owner, repo, pr) {
        const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/pulls/${pr}.diff`, {
            headers: { 'Authorization': `token ${this.token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch PR diff: ${res.status}`);
        return res.text();
    }

    async getPRInfo(owner, repo, pr) {
        return this.request('GET', `/repos/${owner}/${repo}/pulls/${pr}`);
    }

    async createComment(owner, repo, pr, body) {
        return this.request('POST', `/repos/${owner}/${repo}/issues/${pr}/comments`, { body });
    }

    async createReviewComment(owner, repo, pr, { body, path, line, side = 'RIGHT' }) {
        return this.request('POST', `/repos/${owner}/${repo}/pulls/${pr}/reviews`, {
            event: 'COMMENT',
            body: '',
            comments: [{ path, new_position: line, body }],
        });
    }

    async addReaction(owner, repo, commentId, reaction) {
        return this.request('POST', `/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
            content: reaction,
        });
    }
}

module.exports = { ForgejoClient };