function parseReviewResponse(rawResponse) {
    const cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
}

module.exports = { parseReviewResponse };