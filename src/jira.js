function extractTicketKey(text, prefix) {
    if (!text) return null;
    const pattern = prefix
        ? new RegExp(`${prefix}-\\d+`)
        : /[A-Z][A-Z0-9]+-\d+/;
    const match = text.match(pattern);
    return match ? match[0] : null;
}

function createJiraClient({ url, email, token }) {
    const baseUrl = url.replace(/\/+$/, '');
    const auth = Buffer.from(`${email}:${token}`).toString('base64');

    async function getIssue(ticketKey) {
        const res = await fetch(`${baseUrl}/rest/api/2/issue/${ticketKey}`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
            },
        });

        if (!res.ok) {
            throw new Error(`Jira API error (${res.status}): Failed to fetch ${ticketKey}`);
        }

        return res.json();
    }

    async function getTicketDescription(ticketKey) {
        const issue = await getIssue(ticketKey);
        return issue.fields?.description || '';
    }

    return { getIssue, getTicketDescription };
}

module.exports = { extractTicketKey, createJiraClient };
