// Literal <iframe> tags in MDX bypass the shared React embed components. Apply
// the same lazy-loading default at build time, respecting explicit overrides.
export default function remarkMediaDefaults() {
    return function transform(tree) {
        function visit(node) {
            if (node.name === 'iframe' && !node.attributes.some(attribute => attribute.name === 'loading')) {
                node.attributes.push({ type: 'mdxJsxAttribute', name: 'loading', value: 'lazy' });
            }
            for (const child of node.children ?? []) visit(child);
        }
        visit(tree);
    };
}
