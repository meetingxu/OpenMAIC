import { parse as parseJavaScript, type Node } from 'acorn';
import { analyze } from 'eslint-scope';
import globals from 'globals';
import { parse as parseHtml, type DefaultTreeAdapterTypes as Html } from 'parse5';

interface AstNode extends Node {
  [key: string]: unknown;
}
interface Handler {
  source: string;
  label: string;
}

const browserGlobals = new Set([...Object.keys(globals.browser), ...Object.keys(globals.es2021)]);
// Only allow library globals when that library is explicitly loaded by this document.
const libraries: readonly [RegExp, readonly string[]][] = [
  [/\bd3(?:[.@/-]|$)/i, ['d3']],
  [/\bchart(?:\.js|[.@/-])/i, ['Chart']],
  [/\bthree(?:[.@/-]|$)/i, ['THREE']],
  [/\bgsap(?:[.@/-]|$)/i, ['gsap']],
  [/\becharts(?:[.@/-]|$)/i, ['echarts']],
  [/\bmatter(?:[.@/-]|$)/i, ['Matter']],
  [/\bplotly(?:[.@/-]|$)/i, ['Plotly']],
  [/\bp5(?:[.@/-]|$)/i, ['p5']],
  [/\banime(?:[.@/-]|$)/i, ['anime']],
  [/\bkatex(?:[.@/-]|$)/i, ['katex', 'renderMathInElement']],
  [/\bmathjax(?:[.@/-]|$)/i, ['MathJax']],
  [/\bmermaid(?:[.@/-]|$)/i, ['mermaid']],
  [/\bsortable(?:[.@/-]|$)/i, ['Sortable']],
  [/\bcanvas-confetti(?:[.@/-]|$)/i, ['confetti']],
  [/\btone(?:[.@/-]|$)/i, ['Tone']],
];

function walk(
  node: AstNode,
  visit: (node: AstNode, parent?: AstNode) => void,
  parent?: AstNode,
): void {
  visit(node, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value)
        if (child && typeof child.type === 'string') walk(child, visit, node);
    } else if (value && typeof value === 'object' && 'type' in value) {
      walk(value as AstNode, visit, node);
    }
  }
}
function isWindow(node: unknown): boolean {
  return (
    !!node &&
    typeof node === 'object' &&
    'type' in node &&
    (node as AstNode).type === 'Identifier' &&
    ['window', 'globalThis', 'self'].includes(String((node as AstNode).name))
  );
}
function propertyName(node: AstNode): string | undefined {
  const property = node.property as AstNode;
  if (!property) return undefined;
  if (!node.computed && property.type === 'Identifier') return String(property.name);
  if (property.type === 'Literal' && typeof property.value === 'string') return property.value;
  return undefined;
}
function collectHandlers(root: Html.ParentNode, handlers: Handler[], ids: Set<string>): void {
  for (const node of root.childNodes) {
    if (!('tagName' in node) || node.tagName === 'template') continue;
    for (const attr of node.attrs) {
      if (/^on[a-z]+$/i.test(attr.name) && attr.value.trim())
        handlers.push({ source: attr.value, label: `${node.tagName} ${attr.name}` });
      if (attr.name === 'id' && /^[A-Za-z_$][\w$]*$/.test(attr.value)) ids.add(attr.value);
    }
    collectHandlers(node, handlers, ids);
  }
}

/** Static lexical analysis only: generated scripts are NEVER evaluated on the server. */
function analyzeReferences(
  html: string,
  scripts: readonly string[],
  externalUrls: readonly string[],
): string | null {
  const allowed = new Set(browserGlobals);
  for (const url of externalUrls)
    for (const [pattern, names] of libraries) {
      if (pattern.test(url)) for (const name of names) allowed.add(name);
    }
  const handlers: Handler[] = [];
  const ids = new Set<string>();
  collectHandlers(parseHtml(html), handlers, ids);
  for (const id of ids) allowed.add(id);
  // Concatenate classic scripts: they share a global lexical environment in browsers.
  const source = scripts.join('\n;\n');
  let program: AstNode;
  try {
    program = parseJavaScript(source, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      ranges: true,
    }) as unknown as AstNode;
  } catch (error) {
    return `Cannot analyze classic scripts: ${error instanceof Error ? error.message : String(error)}`;
  }
  const issues = new Set<string>();
  const parents = new Map<Node, AstNode>();
  const exported = new Set<string>();
  walk(program, (node, parent) => {
    if (parent) parents.set(node, parent);
    if (node.type === 'AssignmentExpression') {
      const left = node.left as AstNode;
      if (left.type === 'MemberExpression' && isWindow(left.object)) {
        const name = propertyName(left);
        if (name) exported.add(name);
      }
    }
    if (node.type === 'CallExpression') {
      const callee = node.callee as AstNode;
      const args = node.arguments as AstNode[];
      if (
        callee.type === 'MemberExpression' &&
        (callee.object as AstNode)?.name === 'Object' &&
        propertyName(callee) === 'assign' &&
        isWindow(args[0])
      ) {
        for (const arg of args.slice(1))
          if (arg.type === 'ObjectExpression') {
            for (const prop of arg.properties as AstNode[]) {
              const key = prop.key as AstNode | undefined;
              if (key && !prop.computed) exported.add(String(key.name ?? key.value));
            }
          }
      }
    }
    // Include inline handlers in dynamically generated HTML strings/templates.
    if (
      node.type === 'Literal' &&
      typeof node.value === 'string' &&
      /\bon[a-z]+\s*=/i.test(node.value)
    ) {
      collectHandlers(parseHtml(node.value), handlers, ids);
    }
    if (node.type === 'TemplateLiteral') {
      const markup = (node.quasis as AstNode[])
        .map((q) => (q.value as { cooked: string }).cooked)
        .join('0');
      if (/\bon[a-z]+\s*=/i.test(markup)) collectHandlers(parseHtml(markup), handlers, ids);
    }
  });
  // eslint-scope accepts ESTree; Acorn supplies its required ranges.
  const scope = analyze(program as Parameters<typeof analyze>[0], {
    ecmaVersion: 2022,
    sourceType: 'script',
    optimistic: true,
    ignoreEval: true,
  });
  const globalNames = new Set(scope.globalScope?.variables.map((v) => v.name));
  for (const reference of scope.globalScope?.through ?? []) {
    const id = reference.identifier;
    const parent = parents.get(id as unknown as Node);
    // Feature detection is allowed for optional browser APIs/libraries.
    if (parent?.type === 'UnaryExpression' && parent.operator === 'typeof') continue;
    if (allowed.has(id.name) || exported.has(id.name) || globalNames.has(id.name)) continue;
    issues.add(
      `Undefined JavaScript reference "${id.name}". Define it in the calling scope (including optional audio helpers); do not assume the iframe host provides it.`,
    );
  }
  for (const handler of handlers) {
    let handlerProgram;
    try {
      handlerProgram = parseJavaScript(`(function(event){\n${handler.source}\n})`, {
        ecmaVersion: 'latest',
        ranges: true,
      });
    } catch {
      continue;
    } // The syntax validator reports authored attribute errors separately.
    const handlerScope = analyze(handlerProgram as Parameters<typeof analyze>[0], {
      ecmaVersion: 2022,
      optimistic: true,
      ignoreEval: true,
    });
    for (const reference of handlerScope.globalScope?.through ?? []) {
      const name = reference.identifier.name;
      if (allowed.has(name) || exported.has(name) || globalNames.has(name)) continue;
      issues.add(
        `${handler.label}: "${name}" is not available to the inline handler. Bind with addEventListener in the same scope, or explicitly export the handler on window. Functions inside DOMContentLoaded are not globals.`,
      );
    }
  }
  return issues.size ? [...issues].slice(0, 12).join('\n') : null;
}

export function findInteractiveReferenceFailure(
  html: string,
  scripts: readonly string[],
  externalUrls: readonly string[],
): string | null {
  try {
    return analyzeReferences(html, scripts, externalUrls);
  } catch (error) {
    return `Static script analysis failed: ${error instanceof Error ? error.message : String(error)}. Simplify the scripts and return a complete corrected document.`;
  }
}
