// src/index.js
const fs = require('fs');
const core = require('@actions/core');
const { getConfig } = require('./config');
const { getPlatformClient } = require('./clients/registry');
const { getProvider } = require('./providers/registry');
const { detectTrigger } = require('./trigger');
const { parseReviewResponse } = require('./parser');
const { formatInlineComment, buildSummaryComment } = require('./formatter');

// ─── Diff Annotation ────────────────────────────────────────────
function annotateDiff(rawDiff) {
    const lines = rawDiff.split('\n');
    const result = [];
    let newLine = 0;

    for (const line of lines) {
        const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (hunkMatch) {
            newLine = parseInt(hunkMatch[1], 10);
            result.push(line);
        } else if (line.startsWith('-')) {
            result.push(`     ${line}`);
        } else if (line.startsWith('+')) {
            result.push(`[L${newLine}] ${line}`);
            newLine++;
        } else if (line.startsWith(' ') || line === '') {
            result.push(`[L${newLine}] ${line}`);
            newLine++;
        } else {
            // file headers (diff --git, index, ---, +++) or other metadata
            result.push(line);
        }
    }
    return result.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────
async function run() {
    try {
        const config = getConfig();
        const eventPath = process.env.GITHUB_EVENT_PATH;
        const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));

        const client = getPlatformClient(config.platform, config.platformUrl, config.platformToken);

        const ctx = client.parseEventContext(event, process.env);
        if (!ctx) {
            core.info('Not a PR comment event or missing context, skipping.');
            return;
        }

        const { owner, repo, prNumber, comment } = ctx;

        const trigger = detectTrigger(comment.body);
        if (!trigger) {
            core.info('No @Claude or @Codex mention found, skipping.');
            return;
        }

        core.info(`Triggered by @${trigger.provider} in comment #${comment.id}`);

        // React to the triggering comment with eyes emoji
        try {
            await client.addReaction(owner, repo, comment.id, 'eyes');
        } catch (e) {
            core.warning(`Could not add reaction: ${e.message}`);
        }

        // Fetch PR diff
        core.info(`Fetching diff for ${owner}/${repo}#${prNumber}...`);
        const diff = await client.getPRDiff(owner, repo, prNumber);

        if (!diff.trim()) {
            await client.createComment(owner, repo, prNumber,
                `👀 @${comment.user.login} I couldn't find any code changes to review in this PR.`);
            return;
        }

        // Annotate diff with line numbers and truncate if too large
        const annotatedDiff = annotateDiff(diff);
        const maxDiffLength = 30000;
        const truncatedDiff = annotatedDiff.length > maxDiffLength
            ? annotatedDiff.substring(0, maxDiffLength) + '\n\n... (diff truncated due to size)'
            : annotatedDiff;

        // Call AI provider
        core.info(`Calling ${trigger.provider} for review...`);
        const provider = getProvider(trigger.provider, config);
        const rawResponse = await provider.review(truncatedDiff, trigger.message);

        // Parse AI response
        let review;
        try {
            review = parseReviewResponse(rawResponse);
        } catch (e) {
            core.warning(`Failed to parse AI response as JSON, posting as plain comment.`);
            await client.createComment(owner, repo, prNumber,
                `### 🤖 AI Code Review (${trigger.provider})\n\n${rawResponse}`);
            return;
        }

        // Try to post inline comments, track which succeeded
        let inlineSuccess = 0;
        if (review.comments?.length > 0) {
            for (const c of review.comments) {
                try {
                    await client.createReviewComment(owner, repo, prNumber, {
                        body: formatInlineComment(c),
                        path: c.path,
                        line: c.line,
                    });
                    c._inlinePosted = true;
                    inlineSuccess++;
                } catch (e) {
                    // Will be included in summary fallback
                }
            }
        }

        // Post summary comment
        const providerLabel = trigger.provider === 'claude' ? '🧠 Claude' : '🤖 Codex';
        const summaryBody = buildSummaryComment({
            providerName: providerLabel,
            review,
            triggerUser: comment.user.login,
            inlineSuccess,
        });

        await client.createComment(owner, repo, prNumber, summaryBody);

        // React with rocket on success
        try {
            await client.addReaction(owner, repo, comment.id, 'rocket');
        } catch (e) {
            core.warning(`Could not add reaction: ${e.message}`);
        }

        core.info('Review complete!');
    } catch (error) {
        core.setFailed(`Action failed: ${error.message}`);
    }
}

if (require.main === module) {
    run();
}

module.exports = { annotateDiff, run };
