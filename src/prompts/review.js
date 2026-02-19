const REVIEW_PROMPT = `You are an expert code reviewer. Review the following pull request diff and provide constructive feedback.

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

function buildReviewPrompt(ticketDescription) {
    if (!ticketDescription) {
        return REVIEW_PROMPT;
    }

    return REVIEW_PROMPT + `

The following is the Jira ticket description for this PR. Read it carefully and identify any requirements or acceptance criteria described in it, then assess whether the code changes satisfy them.

Jira Ticket Description:
${ticketDescription}

Add an "acceptance_criteria" array to your JSON response with each requirement you identified:
{
  "acceptance_criteria": [
    { "criterion": "short description of the requirement", "status": "met|not_met|unclear", "comment": "brief explanation" }
  ]
}`;
}

module.exports = { REVIEW_PROMPT, buildReviewPrompt };