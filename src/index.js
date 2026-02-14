// src/index.js
const core = require('@actions/core');

// ─── Configuration ───────────────────────────────────────────────
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

// ─── Forgejo API Client ─────────────────────────────────────────
class ForgejoClient {
    constructor(url, token) {
        this.baseUrl = `${url}/api/v1`;
        this.headers = {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    }

    async request(method, path, body) {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Forgejo API ${method} ${path} failed (${res.status}): ${text}`);
        }
        return res.status === 204 ? null : res.json();
    }

    async getPRDiff(owner, repo, pr) {
        const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/pulls/${pr}.diff`, {
            headers: { 'Authorization': `token ${this.headers.Authorization.split(' ')[1]}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch PR diff: ${res.status}`);
        return res.text();
    }

    async getPRInfo(owner, repo, pr) {
        return this.request('GET', `/repos/${owner}/${repo}/pulls/${pr}`);
    }

    async createComment(owner, repo, pr, body) {
        return this.request('POST', `/repos/${owner}/${repo}/issues/${pr}/comments`, { body });
    }

    async createReviewComment(owner, repo, pr, { body, path, line, side = 'RIGHT' }) {
        return this.request('POST', `/repos/${owner}/${repo}/pulls/${pr}/reviews`, {
            event: 'COMMENT',
            body: '',
            comments: [{ path, new_position: line, body }],
        });
    }

    async addReaction(owner, repo, commentId, reaction) {
        return this.request('POST', `/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
            content: reaction,
        });
    }
}

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

// ─── AI Providers ───────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert code reviewer. Review the following pull request diff and provide constructive feedback.

Your review should:
- Identify bugs, security issues, and potential problems
- Suggest improvements for readability and maintainability
- Point out missing error handling or edge cases
- Praise good patterns where appropriate
- Be concise and actionable

Respond in the following JSON format:
{
  "summary": "Brief overall assessment",
  "comments": [
    {
      "path": "filename",
      "line": <line_number_in_new_file>,
      "severity": "critical|warning|suggestion|praise",
      "message": "Your comment"
    }
  ]
}

IMPORTANT: Each line in the diff is prefixed with [L<number>] showing the actual line number in the new file.
Use EXACTLY the number from the [L<number>] prefix for the "line" field. Do not calculate line numbers yourself.

Only return valid JSON. No markdown fences.`;

async function callClaude(config, diff, userMessage) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.anthropicKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: config.claudeModel,
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{
                role: 'user',
                content: `${userMessage ? `User request: ${userMessage}\n\n` : ''}Pull Request Diff:\n\`\`\`\n${diff}\n\`\`\``,
            }],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.content[0].text;
}

async function callCodex(config, diff, userMessage) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.openaiKey}`,
        },
        body: JSON.stringify({
            model: config.codexModel,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `${userMessage ? `User request: ${userMessage}\n\n` : ''}Pull Request Diff:\n\`\`\`\n${diff}\n\`\`\``,
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

// ─── Comment Trigger Detection ──────────────────────────────────
function detectTrigger(commentBody) {
    const lower = commentBody.toLowerCase();
    const claudeMatch = lower.match(/@claude\b/);
    const codexMatch = lower.match(/@codex\b/);

    if (claudeMatch) return { provider: 'claude', message: commentBody.replace(/@claude\b/i, '').trim() };
    if (codexMatch) return { provider: 'codex', message: commentBody.replace(/@codex\b/i, '').trim() };
    return null;
}

// ─── Severity Emoji ─────────────────────────────────────────────
function severityIcon(severity) {
    const map = { critical: '🔴', warning: '🟡', suggestion: '🔵', praise: '🟢' };
    return map[severity] || '💬';
}

// ─── Main ───────────────────────────────────────────────────────
async function run() {
    try {
        const config = getConfig();
        const eventPath = process.env.GITHUB_EVENT_PATH;
        const event = require(eventPath);

        // Validate this is a comment event on a PR
        if (!event.issue?.pull_request && !event.pull_request) {
            core.info('Not a PR comment event, skipping.');
            return;
        }

        const comment = event.comment;
        if (!comment) {
            core.info('No comment found in event, skipping.');
            return;
        }

        const trigger = detectTrigger(comment.body);
        if (!trigger) {
            core.info('No @Claude or @Codex mention found, skipping.');
            return;
        }

        core.info(`Triggered by @${trigger.provider} in comment #${comment.id}`);

        // Extract repo info
        const [owner, repo] = (process.env.GITHUB_REPOSITORY || event.repository?.full_name || '').split('/');
        const prNumber = event.issue?.number || event.pull_request?.number;

        if (!owner || !repo || !prNumber) {
            throw new Error('Could not determine repository or PR number from event context');
        }

        const forgejo = new ForgejoClient(config.forgejoUrl, config.forgejoToken);

        // React to the triggering comment with eyes emoji
        try {
            await forgejo.addReaction(owner, repo, comment.id, 'eyes');
        } catch (e) {
            core.warning(`Could not add reaction: ${e.message}`);
        }

        // Fetch PR diff
        core.info(`Fetching diff for ${owner}/${repo}#${prNumber}...`);
        const diff = await forgejo.getPRDiff(owner, repo, prNumber);

        if (!diff.trim()) {
            await forgejo.createComment(owner, repo, prNumber,
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
        let rawResponse;
        if (trigger.provider === 'claude') {
            if (!config.anthropicKey) throw new Error('anthropic_api_key is required to use Claude');
            rawResponse = await callClaude(config, truncatedDiff, trigger.message);
        } else {
            if (!config.openaiKey) throw new Error('openai_api_key is required to use Codex');
            rawResponse = await callCodex(config, truncatedDiff, trigger.message);
        }

        // Parse AI response
        let review;
        try {
            const cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```/g, '').trim();
            review = JSON.parse(cleaned);
        } catch (e) {
            core.warning(`Failed to parse AI response as JSON, posting as plain comment.`);
            await forgejo.createComment(owner, repo, prNumber,
                `### 🤖 AI Code Review (${trigger.provider})\n\n${rawResponse}`);
            return;
        }

        // Post summary comment
        const providerLabel = trigger.provider === 'claude' ? '🧠 Claude' : '🤖 Codex';
        let summaryBody = `### ${providerLabel} Code Review\n\n${review.summary}\n\n`;

        if (review.comments?.length > 0) {
            summaryBody += `**Found ${review.comments.length} comment(s):**\n\n`;

            // Try to post inline comments, fall back to summary
            let inlineSuccess = 0;
            for (const c of review.comments) {
                try {
                    await forgejo.createReviewComment(owner, repo, prNumber, {
                        body: `${severityIcon(c.severity)} **${c.severity?.toUpperCase()}**: ${c.message}`,
                        path: c.path,
                        line: c.line,
                    });
                    inlineSuccess++;
                } catch (e) {
                    // If inline comment fails, include in summary
                    summaryBody += `${severityIcon(c.severity)} **\`${c.path}:${c.line}\`** — ${c.message}\n\n`;
                }
            }

            if (inlineSuccess > 0) {
                summaryBody += `\n_${inlineSuccess} inline comment(s) posted on the diff._\n`;
            }
        } else {
            summaryBody += '✅ No issues found. The code looks good!\n';
        }

        summaryBody += `\n---\n_Triggered by @${comment.user.login} • Provider: ${trigger.provider}_`;

        await forgejo.createComment(owner, repo, prNumber, summaryBody);

        // React with rocket on success
        try {
            await forgejo.addReaction(owner, repo, comment.id, 'rocket');
        } catch (e) {
            core.warning(`Could not add reaction: ${e.message}`);
        }

        core.info('Review complete!');
    } catch (error) {
        core.setFailed(`Action failed: ${error.message}`);
    }
}

run();