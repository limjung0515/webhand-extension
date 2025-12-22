import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const contentPath = path.join(distDir, 'content.js');

console.log('🔧 Post-processing content.js...');

if (fs.existsSync(contentPath)) {
    let content = fs.readFileSync(contentPath, 'utf-8');

    // Find all import statements and the files they reference
    const importRegex = /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']\s*;?/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        imports.push({
            statement: match[0],
            names: match[1],
            path: match[2]
        });
    }

    // Inline each import
    for (const imp of imports) {
        const importFilePath = path.join(distDir, imp.path);

        if (fs.existsSync(importFilePath)) {
            console.log(`  📦 Inlining: ${imp.path}`);
            let importedContent = fs.readFileSync(importFilePath, 'utf-8');

            // Remove export statements
            importedContent = importedContent.replace(/export\s*\{[^}]*\}\s*;?\s*$/gm, '');
            importedContent = importedContent.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');

            // Replace import with the actual content
            content = content.replace(imp.statement, `// Inlined from ${imp.path}\n${importedContent}`);
        }
    }

    // Remove any remaining export statements from content.js itself
    content = content.replace(/export\s*\{[^}]*\}\s*;?\s*$/gm, '');
    content = content.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');

    // Write back
    fs.writeFileSync(contentPath, content);
    console.log('✅ content.js post-processed successfully');
} else {
    console.error('❌ content.js not found!');
    process.exit(1);
}

// Do the same for background.js
const backgroundPath = path.join(distDir, 'background.js');

if (fs.existsSync(backgroundPath)) {
    let content = fs.readFileSync(backgroundPath, 'utf-8');

    // Remove export statements
    content = content.replace(/export\s*\{[^}]*\}\s*;?\s*$/gm, '');
    content = content.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');

    fs.writeFileSync(backgroundPath, content);
    console.log('✅ background.js post-processed successfully');
}
