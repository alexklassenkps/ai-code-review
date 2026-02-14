function detectTrigger(commentBody) {
    const lower = commentBody.toLowerCase();
    const claudeMatch = lower.match(/@claude\b/);
    const codexMatch = lower.match(/@codex\b/);

    if (claudeMatch) return { provider: 'claude', message: commentBody.replace(/@claude\b/i, '').trim() };
    if (codexMatch) return { provider: 'codex', message: commentBody.replace(/@codex\b/i, '').trim() };
    return null;
}

module.exports = { detectTrigger };