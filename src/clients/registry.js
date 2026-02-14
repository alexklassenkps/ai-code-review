const { ForgejoClient } = require('./forgejo');

const platforms = {
    forgejo: ForgejoClient,
};

function getPlatformClient(name, url, token) {
    const Client = platforms[name];
    if (!Client) {
        throw new Error(`Unknown platform: "${name}". Available: ${Object.keys(platforms).join(', ')}`);
    }
    return new Client(url, token);
}

function registerPlatform(name, clientClass) {
    platforms[name] = clientClass;
}

module.exports = { getPlatformClient, registerPlatform };
