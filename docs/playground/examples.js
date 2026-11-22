/**
 * The Playground's examples. Each one is a plain module in ./examples,
 * fetched as text and shown in the editor.
 */
export const EXAMPLES = [
  { id: 'hello-world', title: 'Hello World' },
  { id: 'counter', title: 'Counter' },
  { id: 'todo', title: 'Todo' },
  { id: 'form-controls', title: 'Form controls' },
  { id: 'list-selection', title: 'List with selection' },
  { id: 'alert', title: 'Alert, dialog and sheet' },
  { id: 'gesture-animation', title: 'Gestures and animation' },
  { id: 'chart', title: 'Chart' },
  { id: 'static-render', title: 'Static render (renderToString)' },
];

const cache = new Map();

/**
 * @param {string} id
 * @returns {Promise<string>}
 */
export async function loadExample(id) {
  if (cache.has(id)) return cache.get(id);
  if (!EXAMPLES.some((example) => example.id === id)) throw new Error(`Unknown example "${id}".`);
  const response = await fetch(new URL(`./examples/${id}.js`, import.meta.url));
  if (!response.ok) throw new Error(`Could not load the "${id}" example (HTTP ${response.status}).`);
  const code = await response.text();
  cache.set(id, code);
  return code;
}
