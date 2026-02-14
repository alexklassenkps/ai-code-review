const core = require('@actions/core');

function getConfig() {
    function getInput(name ) {
        let input = core.getInput(name);
        console.log(`input name "${name}", value "${input}"`)
        return input;
    }

    return {
        anthropicKey: getInput('anthropic_api_key'),
        openaiKey: getInput('openai_api_key'),
        defaultProvider: getInput('default_provider') || 'claude',
        claudeModel: getInput('claude_model') || 'claude-sonnet-4-5-20250929',
        codexModel: getInput('codex_model') || 'gpt-4o',
        platform: getInput('platform') || 'forgejo',
        platformToken: getInput('platform_token'),
        platformUrl: getInput('platform_url'),
        contextFiles: (getInput('context_files') || '')
            .split(',')
            .map(f => f.trim())
            .filter(Boolean),
    };
}

module.exports = { getConfig };
