import { readImageDimensions } from './image-dimensions.mjs';

const imageComponents = new Set(['CenteredImage', 'TwoCenteredImages', 'ThreeCenteredImages']);
const literal = (value) => ({ type: 'Literal', value });
const property = (name, value) => ({ type: 'Property', key: { type: 'Identifier', name }, value, kind: 'init', method: false, shorthand: false, computed: false });

function walk(node, callback) {
    callback(node);
    for (const child of node.children ?? []) walk(child, callback);
}

// Read literal declarations without evaluating article JavaScript.
function resolve(node, bindings, seen = new Set()) {
    if (node?.type === 'Literal') return node.value;
    if (node?.type === 'Identifier' && !seen.has(node.name)) {
        return resolve(bindings.get(node.name), bindings, new Set([...seen, node.name]));
    }
    if (node?.type === 'ObjectExpression') {
        const src = node.properties.find(p => (p.key?.name ?? p.key?.value) === 'src');
        return resolve(src?.value, bindings, seen);
    }
    throw new Error('Article images must use a literal local path or HTTPS URL, optionally stored in a const.');
}

export function collectArticleImages(tree) {
    const bindings = new Map();
    walk(tree, node => {
        if (node.type !== 'mdxjsEsm') return;
        for (const statement of node.data?.estree?.body ?? []) {
            const declaration = statement.declaration ?? statement;
            for (const variable of declaration.declarations ?? []) {
                if (variable.id.type === 'Identifier') bindings.set(variable.id.name, variable.init);
            }
        }
    });

    const targets = [];
    function add(expression, replace) {
        const src = resolve(expression, bindings);
        if (typeof src !== 'string' || !src) throw new Error('Article image source is empty.');
        targets.push({ src, replace });
    }
    walk(tree, node => {
        const gallery = node.name === 'PhotoCarousel';
        if (!gallery && !imageComponents.has(node.name)) return;
        const attribute = node.attributes.find(a => a.name === (gallery ? 'photoUrls' : 'image'));
        if (!attribute) return;
        if (typeof attribute.value === 'string') {
            add(literal(attribute.value), expression => {
                attribute.value = { type: 'mdxJsxAttributeValueExpression', value: '', data: { estree: { type: 'Program', sourceType: 'module', body: [{ type: 'ExpressionStatement', expression }] } } };
            });
            return;
        }
        const statement = attribute.value?.data?.estree?.body?.[0];
        const expression = statement?.expression;
        if (gallery) {
            if (expression?.type !== 'ArrayExpression') throw new Error('PhotoCarousel photoUrls must be an array.');
            for (const photo of expression.elements) {
                const prop = photo?.properties?.find(p => (p.key?.name ?? p.key?.value) === 'photoUrl');
                if (prop) add(prop.value, value => { prop.value = value; });
            }
        } else if (expression?.type === 'ArrayExpression') {
            expression.elements.forEach((item, index) => add(item, value => { expression.elements[index] = value; }));
        } else {
            add(expression, value => { statement.expression = value; });
        }
    });
    return targets;
}

export default function remarkArticleImages({ getDimensions = readImageDimensions } = {}) {
    return async (tree, file) => {
        try {
            const targets = collectArticleImages(tree);
            await Promise.all(targets.map(async ({ src, replace }) => {
                const { width, height } = await getDimensions(src);
                replace({ type: 'ObjectExpression', properties: [property('src', literal(src)), property('width', literal(width)), property('height', literal(height))] });
            }));
        } catch (error) {
            file.fail(error.message);
        }
    };
}
