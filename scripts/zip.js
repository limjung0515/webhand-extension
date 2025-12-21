import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
const outputPath = path.join(__dirname, '..', 'webhand-extension.zip');

console.log('📦 Creating extension zip file...');

// Create output stream
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
    console.log(`✅ Created: ${outputPath}`);
    console.log(`📊 Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

archive.on('error', (err) => {
    throw err;
});

// Pipe archive to output
archive.pipe(output);

// Add dist folder contents
archive.directory(distPath, false);

// Finalize
archive.finalize();
