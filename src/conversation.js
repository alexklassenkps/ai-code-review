const AI_INLINE_PATTERN = /^(?:🔴|🟡|🔵|🟢) \*\*(CRITICAL|WARNING|SUGGESTION|PRAISE)\*\*:/;

const MAX_THREAD_ENTRIES = 10;

function isAIReviewComment(body) {
    return AI_INLINE_PATTERN.test(body);
}

function buildThreadFromComments(allReviewComments, targetPath, targetLine, currentCommentId) {
    const thread = allReviewComments
        .filter(c => c.path === targetPath && c.position === targetLine && c.id !== currentCommentId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .slice(-MAX_THREAD_ENTRIES);

    return thread.map(c => {
        const label = isAIReviewComment(c.body)
            ? 'AI Reviewer'
            : `@${c.user.login}`;
        return `**${label}:**\n${c.body}`;
    }).join('\n\n---\n\n');
}

function threadHasAIComment(allReviewComments, targetPath, targetLine) {
    return allReviewComments.some(c =>
        c.path === targetPath && c.position === targetLine && isAIReviewComment(c.body)
    );
}

module.exports = { isAIReviewComment, buildThreadFromComments, threadHasAIComment, MAX_THREAD_ENTRIES };
