const fs = require('fs');
const path = require('path');

function loadContextFiles(filePaths, workDir) {
    const sections = [];
    for (const filePath of filePaths) {
        const fullPath = path.resolve(workDir, filePath);
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            sections.push(`## ${filePath}\n\n${content}`);
        } catch (e) {
            sections.push(null);
        }
    }
    return sections.filter(Boolean).join('\n\n---\n\n');
}

module.exports = { loadContextFiles };
