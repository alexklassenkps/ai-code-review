const fs = require('fs');
const path = require('path');

function loadContextFilesWithStatus(filePaths, workDir) {
    const sections = [];
    const includedFiles = [];
    const missingFiles = [];

    for (const filePath of filePaths) {
        const fullPath = path.resolve(workDir, filePath);
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            sections.push(`## ${filePath}\n\n${content}`);
            includedFiles.push(filePath);
        } catch (e) {
            missingFiles.push(filePath);
            console.error(`could not load "${fullPath}, error: ${e}"`)
        }
    }

    return {
        content: sections.join('\n\n---\n\n'),
        includedFiles,
        missingFiles,
    };
}

function loadContextFiles(filePaths, workDir) {
    return loadContextFilesWithStatus(filePaths, workDir).content;
}

module.exports = { loadContextFiles, loadContextFilesWithStatus };
