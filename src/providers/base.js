class LLMProvider {
    constructor(config) {
        this.config = config;
    }

    validateConfig() {
        throw new Error('validateConfig() must be implemented');
    }

    buildUserMessage(diff, userMessage, context) {
        let msg = '';
        if (context) msg += `Project Context:\n\n${context}\n\n`;
        if (userMessage) msg += `User request: ${userMessage}\n\n`;
        msg += `Pull Request Diff:\n\`\`\`\n${diff}\n\`\`\``;
        return msg;
    }

    async review(diff, userMessage) {
        throw new Error('review() must be implemented');
    }
}

module.exports = { LLMProvider };