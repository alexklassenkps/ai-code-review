// src/index.js
const fs = require('fs');
const core = require('@actions/core');
const { getConfig } = require('./config');
const { getPlatformClient } = require('./clients/registry');
const { getProvider } = require('./providers/registry');
const { detectTrigger } = require('./trigger');
const { parseReviewResponse } = require('./parser');
const { formatInlineComment, buildSummaryComment, buildFollowUpReply } = require('./formatter');
const { loadContextFilesWithStatus } = require('./context');
const { threadHasAIComment, buildThreadFromComments } = require('./conversation');

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

        console.info(JSON.stringify(process.env, null, 2))
        console.info(JSON.stringify(event, null, 2))
        console.info(comment)

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

        // Check if this is a reply in a review comment thread
        if (comment.pull_request_review_id) {
            core.info('Detected review comment thread reply');

            const allReviewComments = await client.getReviewComments(owner, repo, prNumber);

            if (!threadHasAIComment(allReviewComments, comment.path, comment.position)) {
                core.info('Thread does not contain an AI review comment, skipping.');
                return;
            }

            const threadHistory = buildThreadFromComments(
                allReviewComments, comment.path, comment.position, comment.id
            );

            const diff = await client.getPRDiff(owner, repo, prNumber);
            const annotatedDiff = annotateDiff(diff);
            const maxDiffLength = 30000;
            const truncatedDiff = annotatedDiff.length > maxDiffLength
                ? annotatedDiff.substring(0, maxDiffLength) + '\n\n... (diff truncated due to size)'
                : annotatedDiff;

            let context = '';
            if (config.contextFiles.length > 0) {
                const workDir = process.env.GITHUB_WORKSPACE || process.cwd();
                const contextFileStatus = loadContextFilesWithStatus(config.contextFiles, workDir);
                context = contextFileStatus.content;
            }

            core.info(`Calling ${trigger.provider} for follow-up...`);
            const provider = getProvider(trigger.provider, config);
            const responseText = await provider.followUp(truncatedDiff, threadHistory, trigger.message, context);

            const providerLabel = trigger.provider === 'claude' ? '🧠 Claude' : '🤖 Codex';
            const replyBody = buildFollowUpReply({ providerName: providerLabel, responseText });

            await client.createReviewComment(owner, repo, prNumber, {
                body: replyBody,
                path: comment.path,
                line: comment.position,
            });

            try {
                await client.addReaction(owner, repo, comment.id, 'rocket');
            } catch (e) {
                core.warning(`Could not add reaction: ${e.message}`);
            }

            core.info('Follow-up reply posted!');
            return;
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

        // Load context files
        let context = '';
        let contextFileStatus = null;
        if (config.contextFiles.length > 0) {
            const workDir = process.env.GITHUB_WORKSPACE || process.cwd();
            contextFileStatus = loadContextFilesWithStatus(config.contextFiles, workDir);
            context = contextFileStatus.content;
            if (context) {
                core.info(`Loaded ${contextFileStatus.includedFiles.length}/${config.contextFiles.length} context file(s)`);
            }
        } else {
            core.info("No context file(s) loaded")
        }

        // Call AI provider
        core.info(`Calling ${trigger.provider} for review...`);
        const provider = getProvider(trigger.provider, config);
        const rawResponse = await provider.review(truncatedDiff, trigger.message, context);

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
            contextFiles: contextFileStatus ? {
                requestedFiles: config.contextFiles,
                includedFiles: contextFileStatus.includedFiles,
                missingFiles: contextFileStatus.missingFiles,
            } : null,
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
