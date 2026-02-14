const core = require('@actions/core');

function getInputOrEnv(inputName, envNames, fallback = '') {
    const inputValue = core.getInput(inputName);
    if (inputValue) return inputValue;

    for (const envName of envNames) {
        if (process.env[envName]) return process.env[envName];
    }

    return fallback;
}

function getConfig() {
    const platformUrl = getInputOrEnv('platform_url', ['PLATFORM_URL', 'FORGEJO_URL'], getInputOrEnv('forgejo_url', ['FORGEJO_URL'], ''));

    return {
        anthropicKey: getInputOrEnv('anthropic_api_key', ['ANTHROPIC_API_KEY']),
        openaiKey: getInputOrEnv('openai_api_key', ['OPENAI_API_KEY']),
        defaultProvider: getInputOrEnv('default_provider', ['DEFAULT_PROVIDER'], 'claude'),
        claudeModel: getInputOrEnv('claude_model', ['CLAUDE_MODEL'], 'claude-sonnet-4-5-20250929'),
        codexModel: getInputOrEnv('codex_model', ['CODEX_MODEL'], 'gpt-4o'),
        platform: getInputOrEnv('platform', ['PLATFORM'], 'forgejo'),
        platformToken: getInputOrEnv('platform_token', ['PLATFORM_TOKEN', 'FORGEJO_TOKEN'], getInputOrEnv('forgejo_token', ['FORGEJO_TOKEN'])),
        platformUrl: (platformUrl || '').replace(/\/$/, ''),
        contextFiles: getInputOrEnv('context_files', ['CONTEXT_FILES'], 'DEFAULT_CONTEXT.md')
            .split(',')
            .map(f => f.trim())
            .filter(Boolean),
    };
}

module.exports = { getConfig };
