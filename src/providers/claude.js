const { LLMProvider } = require('./base');
const { buildReviewPrompt } = require('../prompts/review');
const { FOLLOWUP_PROMPT } = require('../prompts/followup');

class ClaudeProvider extends LLMProvider {
    validateConfig() {
        if (!this.config.anthropicKey) {
            throw new Error('anthropic_api_key is required to use Claude');
        }
    }

    async review(diff, userMessage, context, ticketDescription) {
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
                system: buildReviewPrompt(ticketDescription),
                messages: [{
                    role: 'user',
                    content: this.buildUserMessage(diff, userMessage, context),
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

    async followUp(diff, threadHistory, userMessage, context) {
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
                system: FOLLOWUP_PROMPT,
                messages: [{
                    role: 'user',
                    content: this.buildFollowUpMessage(diff, threadHistory, userMessage, context),
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