import * as fs from "fs";
import path from "path";

export function readFiles(dir, clean = 0) {
    const files = [];
    

    fs.readdirSync(dir).forEach(filename => {
        const name = clean === 0 ? path.parse(filename).name : path.parse(filename).name.replace(/-/g, ' ');
        const filePath = path.resolve(dir, filename);
        const fileName = filename;
        const stat = fs.statSync(filePath);
        const isFile = stat.isFile();

        if (isFile) files.push({ filePath, fileName, name });
    });

    // files.sort((a, b) => {
    //     // natural sort alphanumeric strings
    //     // https://stackoverflow.com/a/38641281
    //     return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    // });

    return files;
}

export function folderPaths(directory) {
    // These are runtime content paths, not module imports. Their files are
    // included explicitly by outputFileTracingIncludes in next.config.mjs.
    const directoryPath = path.join(/* turbopackIgnore: true */ process.cwd(), directory);

    if (!fs.existsSync(directoryPath)) {
        console.warn(`Directory not found: ${directory}`);
        return [];
    }

    return getFolderPaths(directoryPath).map((folder) => {
        return '/' + path.relative(directoryPath, folder).split(path.sep).join('/');
    });
}

// Function to recursively read directory contents
function getFolderPaths(dir, folderList = []) {
    try {
        const files = fs.readdirSync(dir);

        files.forEach((file) => {
            const filePath = path.join(dir, file);

            if (fs.statSync(filePath).isDirectory()) {
                // Add the folder path to the list
                folderList.push(filePath);
                // Recursively call the function if it's a directory
                getFolderPaths(filePath, folderList);
            }
        });

        return folderList;
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error.message);
        return folderList;
    }
}

export async function getBlogPostMetadata(directory, folderNames) {
    // Handle case where folderNames is empty or undefined
    if (!folderNames || folderNames.length === 0) {
        return [];
    }
    
    const articles = await Promise.all(
        folderNames.map(
            (folder) =>
                new Promise((resolve) => {
                    // Construct the full file path — prefer page.mdx, fall back to page.js
                    const mdxPath = path.join(directory, folder, 'page.mdx');
                    const filePath = fs.existsSync(mdxPath)
                        ? mdxPath
                        : path.join(directory, folder, 'page.js');

                    // Read the file using fs.readFile with a callback
                    fs.readFile(filePath, 'utf-8', (err, fileContent) => {
                        if (err) {
                            console.error(`Error reading file "${filePath}":`, err.message);
                            resolve(null); // Resolve as null if there's an error
                            return;
                        }

                        try {
                            // Extract the metadata object
                            const metadataMatch = fileContent.match(
                                /export\s+const\s+postMetadata\s+=\s+({[\s\S]*?});/
                            );

                            if (!metadataMatch) {
                                throw new Error(`Metadata not found in file: ${filePath}`);
                            }

                            // Safely parse the metadata object
                            const metadata = Function(
                                `"use strict"; return (${metadataMatch[1]});`
                            )();

                            // Validate required metadata fields
                            if (!folder || !metadata.title) {
                                throw new Error(
                                    `Missing some required metadata fields in: ${folder}`
                                );
                            }

                            resolve({
                                title: metadata.title || null,
                                published: metadata.published || null,
                                updated: metadata.updated || null,
                                author: metadata.author || null,
                                thumbnail: metadata.thumbnail || null,
                                thumbnailIllustration: metadata.thumbnailIllustration || null,
                                description: metadata.description || null,
                                keywords: metadata.keywords || [],
                                tags: metadata.tags || [],
                                partners: metadata.partners || null,
                                isActive: metadata.isActive || false,
                                folder,
                            });
                        } catch (error) {
                            console.error(
                                `Error processing file "${filePath}":`,
                                error.message
                            );
                            resolve(null); // Resolve as null if there's an error
                        }
                    });
                })
        )
    );

    // Filter out any null values (errors)
    return articles.filter(Boolean);
}

export async function getSingleBlogPostMetadata(filePath) {
    const mdxFile = path.join('app', filePath, 'page.mdx');
    const file = fs.existsSync(mdxFile) ? mdxFile : path.join('app', filePath, 'page.js');
    
    return new Promise((resolve) => {
        fs.readFile(file, 'utf-8', (err, fileContent) => {
            if (err) {
                console.error(`Error reading file "${file}":`, err.message);
                resolve(null);
                return;
            }

            // Preview content to debug
            // console.log('File content preview:', fileContent.slice(0, 300));

            try {
                const metadataMatch = fileContent.match(
                    /export\s+const\s+postMetadata\s+=\s+({[\s\S]*?});/
                );

                if (!metadataMatch) {
                    console.error('No metadata match found.');
                    resolve(null);
                    return;
                }

                const metadata = Function(
                    `"use strict"; return (${metadataMatch[1]});`
                )();

                const folder = path.basename(file);

                resolve({
                    title: metadata.title || null,
                    published: metadata.published || null,
                    updated: metadata.updated || null,
                    author: metadata.author || null,
                    thumbnail: metadata.thumbnail || null,
                    thumbnailIllustration: metadata.thumbnailIllustration || null,
                    description: metadata.description || null,
                    keywords: metadata.keywords || [],
                    partners: metadata.partners || null,
                    isActive: metadata.isActive || false,
                    folder,
                });
            } catch (error) {
                console.error(`Error processing file "${file}":`, error.message);
                resolve(null);
            }
        });
    });
}
