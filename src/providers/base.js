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

    async review(diff, userMessage, context, ticketDescription) {
        throw new Error('review() must be implemented');
    }

    buildFollowUpMessage(diff, threadHistory, userMessage, context) {
        let msg = '';
        if (context) msg += `Project Context:\n\n${context}\n\n`;
        msg += `Pull Request Diff:\n\`\`\`\n${diff}\n\`\`\`\n\n`;
        if (threadHistory) msg += `Review Thread:\n\n${threadHistory}\n\n`;
        msg += `User's follow-up:\n${userMessage}`;
        return msg;
    }

    async followUp(diff, threadHistory, userMessage, context) {
        throw new Error('followUp() must be implemented');
    }
}

module.exports = { LLMProvider };