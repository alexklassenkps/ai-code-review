const { LLMProvider } = require('./base');
const { REVIEW_PROMPT } = require('../prompts/review');

class ClaudeProvider extends LLMProvider {
    validateConfig() {
        if (!this.config.anthropicKey) {
            throw new Error('anthropic_api_key is required to use Claude');
        }
    }

    async review(diff, userMessage) {
        this.validateConfig();

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.anthropicKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: this.config.claudeModel,
                max_tokens: 4096,
                system: REVIEW_PROMPT,
                messages: [{
                    role: 'user',
                    content: this.buildUserMessage(diff, userMessage),
                }],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Claude API error (${res.status}): ${err}`);
        }

        const data = await res.json();
        return data.content[0].text;
    }
}

module.exports = { ClaudeProvider };