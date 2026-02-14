const core = require('@actions/core');

function getConfig() {
    return {
        anthropicKey: core.getInput('anthropic_api_key'),
        openaiKey: core.getInput('openai_api_key'),
        defaultProvider: core.getInput('default_provider') || 'claude',
        claudeModel: core.getInput('claude_model') || 'claude-sonnet-4-20250514',
        codexModel: core.getInput('codex_model') || 'gpt-4o',
        forgejoToken: core.getInput('forgejo_token'),
        forgejoUrl: core.getInput('forgejo_url').replace(/\/$/, ''),
    };
}

module.exports = { getConfig };