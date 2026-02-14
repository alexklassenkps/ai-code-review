const core = require('@actions/core');

function getConfig() {
    return {
        anthropicKey: core.getInput('anthropic_api_key'),
        openaiKey: core.getInput('openai_api_key'),
        defaultProvider: core.getInput('default_provider') || 'claude',
        claudeModel: core.getInput('claude_model') || 'claude-sonnet-4-5-20250929',
        codexModel: core.getInput('codex_model') || 'gpt-4o',
        platform: core.getInput('platform') || 'forgejo',
        platformToken: core.getInput('platform_token') || core.getInput('forgejo_token'),
        platformUrl: (core.getInput('platform_url') || core.getInput('forgejo_url')).replace(/\/$/, ''),
        contextFiles: (core.getInput('context_files') || '')
            .split(',')
            .map(f => f.trim())
            .filter(Boolean),
    };
}

module.exports = { getConfig };
