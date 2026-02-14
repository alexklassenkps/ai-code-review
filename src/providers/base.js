class LLMProvider {
    constructor(config) {
        this.config = config;
    }

    validateConfig() {
        throw new Error('validateConfig() must be implemented');
    }

    buildUserMessage(diff, userMessage) {
        return `${userMessage ? `User request: ${userMessage}\n\n` : ''}Pull Request Diff:\n\`\`\`\n${diff}\n\`\`\``;
    }

    async review(diff, userMessage) {
        throw new Error('review() must be implemented');
    }
}

module.exports = { LLMProvider };