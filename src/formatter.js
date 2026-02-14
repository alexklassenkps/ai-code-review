const SEVERITY_ICONS = {
    critical: '🔴',
    warning: '🟡',
    suggestion: '🔵',
    praise: '🟢',
};

function severityIcon(severity) {
    return SEVERITY_ICONS[severity] || '💬';
}

function formatInlineComment(comment) {
    return `${severityIcon(comment.severity)} **${comment.severity?.toUpperCase()}**: ${comment.message}`;
}

function formatFallbackComment(comment) {
    return `${severityIcon(comment.severity)} **\`${comment.path}:${comment.line}\`** — ${comment.message}`;
}

function buildSummaryComment({ providerName, review, triggerUser, inlineSuccess }) {
    let body = `### ${providerName} Code Review\n\n${review.summary}\n\n`;

    if (review.comments?.length > 0) {
        body += `**Found ${review.comments.length} comment(s):**\n\n`;

        for (const c of review.comments) {
            if (!c._inlinePosted) {
                body += formatFallbackComment(c) + '\n\n';
            }
        }

        if (inlineSuccess > 0) {
            body += `\n_${inlineSuccess} inline comment(s) posted on the diff._\n`;
        }
    } else {
        body += '✅ No issues found. The code looks good!\n';
    }

    body += `\n---\n_Triggered by @${triggerUser} • Provider: ${providerName}_`;

    return body;
}

module.exports = { severityIcon, formatInlineComment, formatFallbackComment, buildSummaryComment };