const { ClaudeProvider } = require('./claude');
const { OpenAIProvider } = require('./openai');

const providers = {
    claude: ClaudeProvider,
    codex: OpenAIProvider,
};

function getProvider(name, config) {
    const Provider = providers[name];
    if (!Provider) {
        throw new Error(`Unknown provider: "${name}". Available: ${Object.keys(providers).join(', ')}`);
    }
    return new Provider(config);
}

function registerProvider(name, providerClass) {
    providers[name] = providerClass;
}

module.exports = { getProvider, registerProvider };