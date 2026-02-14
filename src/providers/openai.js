const { LLMProvider } = require('./base');
const { REVIEW_PROMPT } = require('../prompts/review');

class OpenAIProvider extends LLMProvider {
    validateConfig() {
        if (!this.config.openaiKey) {
            throw new Error('openai_api_key is required to use Codex');
        }
    }

    async review(diff, userMessage) {
        this.validateConfig();

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.openaiKey}`,
            },
            body: JSON.stringify({
                model: this.config.codexModel,
                messages: [
                    { role: 'system', content: REVIEW_PROMPT },
                    {
                        role: 'user',
                        content: this.buildUserMessage(diff, userMessage),
                    },
                ],
                max_tokens: 4096,
                temperature: 0.2,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenAI API error (${res.status}): ${err}`);
        }

        const data = await res.json();
        return data.choices[0].message.content;
    }
}

module.exports = { OpenAIProvider };