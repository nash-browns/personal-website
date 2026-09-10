import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProcessor } from '@mdx-js/mdx';
import { collectArticleImages } from '../lib/mdx/remark-article-images.mjs';
import { readImageDimensions, manifestPath } from '../lib/mdx/image-dimensions.mjs';

const directory = fileURLToPath(new URL('../app/blog/articles/', import.meta.url));
const processor = createProcessor();
const sources = new Set();
let articles = 0;
for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const filename = path.join(directory, entry.name, 'page.mdx');
    let content;
    try { content = await fs.readFile(filename, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const tree = processor.parse({ value: content, path: filename });
    for (const { src } of collectArticleImages(tree)) sources.add(src);
    articles++;
}

const entries = [];
let completed = 0;
await Promise.all([...sources].map(async src => {
    entries.push([src, await readImageDimensions(src, { refresh: process.argv.includes('--refresh') })]);
    completed++;
    if (completed % 50 === 0) console.log(`Image dimensions: ${completed}/${sources.size}`);
}));
await fs.mkdir(path.dirname(manifestPath), { recursive: true });
const contents = JSON.stringify(Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n';
let previous;
try { previous = await fs.readFile(manifestPath, 'utf8'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (previous !== contents) {
    const temporary = `${manifestPath}.${process.pid}.tmp`;
    await fs.writeFile(temporary, contents);
    await fs.rename(temporary, manifestPath);
}
console.log(`Verified ${sources.size} images across ${articles} MDX articles.`);
