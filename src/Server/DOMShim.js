/**
 * A minimal DOM-like element shim for static rendering (#40).
 *
 * renderToString runs the framework's own renderers (descriptor renderers
 * and legacy View._render) against these objects instead of a browser
 * document, then serializes the result. There is no second HTML-string
 * implementation of any view, so markup and modifiers can't drift.
 *
 * Only what the renderers touch is implemented: element creation, the node
 * tree, attributes (with property reflection), dataset, classList, inline
 * style, and inert stand-ins for events, layout and observers. There is no
 * layout: sizes are 0, media queries don't match, and requestAnimationFrame,
 * timers and observers never fire, so content that waits for them (for
 * example GeometryReader and ViewThatFits) renders empty. Output is
 * deterministic: attributes keep insertion order and style keeps declaration
 * order.
 */

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;
const DOCUMENT_FRAGMENT_NODE = 11;

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'source', 'track', 'wbr',
]);
const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);

export function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Inline style
// ---------------------------------------------------------------------------

function cssPropertyName(name) {
  if (name.startsWith('--')) return name;
  if (name === 'cssFloat') return 'float';
  if (name.includes('-')) return name.toLowerCase();
  const kebab = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  // WebkitTransform -> -webkit-transform; msTransform -> -ms-transform.
  return /^(webkit|moz|ms|o)-/.test(kebab) && !name.startsWith('-') ? `-${kebab}` : kebab;
}

class ShimStyle {
  setProperty(name, value) {
    this[name] = value;
  }

  removeProperty(name) {
    const value = this.getPropertyValue(name);
    for (const key of Object.keys(this)) {
      if (cssPropertyName(key) === cssPropertyName(name)) delete this[key];
    }
    return value;
  }

  getPropertyValue(name) {
    for (const key of Object.keys(this)) {
      if (cssPropertyName(key) === cssPropertyName(name)) return String(this[key] ?? '');
    }
    return '';
  }

  get cssText() {
    const declarations = new Map();
    for (const key of Object.keys(this)) {
      const value = this[key];
      if (value === '' || value === null || value === undefined) continue;
      const property = cssPropertyName(key);
      // A later write to the same property (in any spelling) wins, in place.
      declarations.set(property, String(value));
    }
    return [...declarations].map(([property, value]) => `${property}: ${value};`).join(' ');
  }

  set cssText(text) {
    for (const key of Object.keys(this)) delete this[key];
    for (const declaration of String(text).split(';')) {
      const index = declaration.indexOf(':');
      if (index === -1) continue;
      const property = declaration.slice(0, index).trim();
      const value = declaration.slice(index + 1).trim();
      if (property) this[property] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

class ShimNode {
  constructor(nodeType, ownerDocument) {
    this.nodeType = nodeType;
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
  }

  get parentElement() {
    return this.parentNode && this.parentNode.nodeType === ELEMENT_NODE ? this.parentNode : null;
  }

  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] ?? null; }

  get nextSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }

  get previousSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) - 1] ?? null;
  }

  get isConnected() { return false; }

  hasChildNodes() { return this.childNodes.length > 0; }

  _adopt(node) {
    if (node.nodeType === DOCUMENT_FRAGMENT_NODE) return [...node.childNodes].map((child) => { child.remove(); return child; });
    node.remove();
    return [node];
  }

  appendChild(node) {
    for (const child of this._adopt(node)) {
      child.parentNode = this;
      this.childNodes.push(child);
    }
    return node;
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(typeof node === 'string' ? this.ownerDocument.createTextNode(node) : node);
  }

  prepend(...nodes) {
    const first = this.firstChild;
    for (const node of nodes) this.insertBefore(typeof node === 'string' ? this.ownerDocument.createTextNode(node) : node, first);
  }

  insertBefore(node, reference) {
    if (!reference) return this.appendChild(node);
    for (const child of this._adopt(node)) {
      const index = this.childNodes.indexOf(reference);
      child.parentNode = this;
      this.childNodes.splice(index === -1 ? this.childNodes.length : index, 0, child);
    }
    return node;
  }

  removeChild(node) {
    const index = this.childNodes.indexOf(node);
    if (index !== -1) {
      this.childNodes.splice(index, 1);
      node.parentNode = null;
    }
    return node;
  }

  replaceChild(node, old) {
    this.insertBefore(node, old);
    return this.removeChild(old);
  }

  replaceChildren(...nodes) {
    for (const child of [...this.childNodes]) this.removeChild(child);
    this.append(...nodes);
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  contains(node) {
    for (let current = node; current; current = current.parentNode) {
      if (current === this) return true;
    }
    return false;
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    for (const child of [...this.childNodes]) this.removeChild(child);
    const text = value === null || value === undefined ? '' : String(value);
    if (text !== '') this.appendChild(this.ownerDocument.createTextNode(text));
  }

  // Events never fire during static rendering.
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
}

class ShimText extends ShimNode {
  constructor(data, ownerDocument) {
    super(TEXT_NODE, ownerDocument);
    this.data = String(data);
  }

  get nodeValue() { return this.data; }
  set nodeValue(value) { this.data = String(value); }
  get textContent() { return this.data; }
  set textContent(value) { this.data = String(value ?? ''); }

  cloneNode() { return new ShimText(this.data, this.ownerDocument); }
}

class ShimComment extends ShimNode {
  constructor(data, ownerDocument) {
    super(COMMENT_NODE, ownerDocument);
    this.data = String(data);
  }

  get textContent() { return ''; }
  set textContent(value) { this.data = String(value ?? ''); }

  cloneNode() { return new ShimComment(this.data, this.ownerDocument); }
}

class ShimFragment extends ShimNode {
  constructor(ownerDocument) {
    super(DOCUMENT_FRAGMENT_NODE, ownerDocument);
  }

  get children() { return this.childNodes.filter((child) => child.nodeType === ELEMENT_NODE); }

  cloneNode(deep) {
    const copy = new ShimFragment(this.ownerDocument);
    if (deep) for (const child of this.childNodes) copy.appendChild(child.cloneNode(true));
    return copy;
  }

  querySelector(selector) { return querySelectorAllFrom(this, selector)[0] ?? null; }
  querySelectorAll(selector) { return querySelectorAllFrom(this, selector); }
}

/** Markup set through innerHTML, kept verbatim (as a browser would parse it). */
class ShimRawHTML extends ShimNode {
  constructor(html, ownerDocument) {
    super(TEXT_NODE, ownerDocument);
    this.html = String(html);
    this.isRawHTML = true;
  }

  get textContent() { return this.html.replace(/<[^>]*>/g, ''); }
  set textContent(value) { this.html = escapeText(value ?? ''); }

  cloneNode() { return new ShimRawHTML(this.html, this.ownerDocument); }
}

function datasetAttributeName(key) {
  return `data-${String(key).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

function datasetKey(attribute) {
  return attribute.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function createDataset(element) {
  return new Proxy({}, {
    get(_, key) {
      if (typeof key !== 'string') return undefined;
      return element.getAttribute(datasetAttributeName(key)) ?? undefined;
    },
    set(_, key, value) {
      element.setAttribute(datasetAttributeName(key), value);
      return true;
    },
    deleteProperty(_, key) {
      element.removeAttribute(datasetAttributeName(key));
      return true;
    },
    has(_, key) {
      return element.hasAttribute(datasetAttributeName(key));
    },
    ownKeys() {
      return [...element._attributes.keys()].filter((name) => name.startsWith('data-')).map(datasetKey);
    },
    getOwnPropertyDescriptor(_, key) {
      const value = element.getAttribute(datasetAttributeName(key));
      return value === null ? undefined : { value, enumerable: true, configurable: true, writable: true };
    },
  });
}

class ShimClassList {
  constructor(element) { this._element = element; }
  _tokens() { return (this._element.getAttribute('class') || '').split(/\s+/).filter(Boolean); }
  _write(tokens) {
    if (tokens.length) this._element.setAttribute('class', tokens.join(' '));
    else this._element.removeAttribute('class');
  }
  get length() { return this._tokens().length; }
  contains(token) { return this._tokens().includes(token); }
  add(...tokens) {
    const current = this._tokens();
    for (const token of tokens) if (!current.includes(token)) current.push(token);
    this._write(current);
  }
  remove(...tokens) { this._write(this._tokens().filter((token) => !tokens.includes(token))); }
  toggle(token, force) {
    const has = this.contains(token);
    const add = force === undefined ? !has : Boolean(force);
    if (add && !has) this.add(token);
    if (!add && has) this.remove(token);
    return add;
  }
  replace(oldToken, newToken) {
    if (!this.contains(oldToken)) return false;
    this._write(this._tokens().map((token) => (token === oldToken ? newToken : token)));
    return true;
  }
  forEach(fn) { this._tokens().forEach(fn); }
  toString() { return this._tokens().join(' '); }
}

// Properties that reflect to an attribute of the same (or a mapped) name.
const STRING_PROPERTIES = {
  id: 'id', className: 'class', title: 'title', lang: 'lang', dir: 'dir',
  href: 'href', src: 'src', alt: 'alt', name: 'name', placeholder: 'placeholder',
  htmlFor: 'for', rel: 'rel', target: 'target', role: 'role', min: 'min',
  max: 'max', step: 'step', pattern: 'pattern', accept: 'accept',
  autocomplete: 'autocomplete', inputMode: 'inputmode', enterKeyHint: 'enterkeyhint',
  loading: 'loading', decoding: 'decoding', srcset: 'srcset', sizes: 'sizes',
  download: 'download', action: 'action', method: 'method', poster: 'poster',
  preload: 'preload', width: 'width', height: 'height', rows: 'rows', cols: 'cols',
  maxLength: 'maxlength', minLength: 'minlength', span: 'span', colSpan: 'colspan',
  rowSpan: 'rowspan', label: 'label', draggable: 'draggable', contentEditable: 'contenteditable',
  spellcheck: 'spellcheck', autocapitalize: 'autocapitalize', autocorrect: 'autocorrect',
  translate: 'translate', accessKey: 'accesskey', crossOrigin: 'crossorigin',
  referrerPolicy: 'referrerpolicy',
};
const BOOLEAN_PROPERTIES = {
  hidden: 'hidden', inert: 'inert', disabled: 'disabled', checked: 'checked',
  selected: 'selected', readOnly: 'readonly', required: 'required',
  multiple: 'multiple', autofocus: 'autofocus', open: 'open', controls: 'controls',
  autoplay: 'autoplay', loop: 'loop', muted: 'muted', playsInline: 'playsinline',
  noValidate: 'novalidate', defer: 'defer', async: 'async',
};

class ShimElement extends ShimNode {
  constructor(tagName, ownerDocument, namespaceURI = null) {
    super(ELEMENT_NODE, ownerDocument);
    this.localName = namespaceURI ? String(tagName) : String(tagName).toLowerCase();
    this.namespaceURI = namespaceURI;
    this._attributes = new Map();
    this.style = new ShimStyle();
    this.dataset = createDataset(this);
    this.classList = new ShimClassList(this);
  }

  get tagName() { return this.namespaceURI ? this.localName : this.localName.toUpperCase(); }
  get nodeName() { return this.tagName; }

  get children() { return this.childNodes.filter((child) => child.nodeType === ELEMENT_NODE); }
  get childElementCount() { return this.children.length; }
  get firstElementChild() { return this.children[0] ?? null; }
  get lastElementChild() { return this.children[this.children.length - 1] ?? null; }
  get nextElementSibling() {
    let node = this.nextSibling;
    while (node && node.nodeType !== ELEMENT_NODE) node = node.nextSibling;
    return node;
  }
  get previousElementSibling() {
    let node = this.previousSibling;
    while (node && node.nodeType !== ELEMENT_NODE) node = node.previousSibling;
    return node;
  }

  setAttribute(name, value) {
    const key = this.namespaceURI ? String(name) : String(name).toLowerCase();
    if (key === 'style') {
      this.style.cssText = value;
      return;
    }
    this._attributes.set(key, String(value));
  }

  getAttribute(name) {
    const key = this.namespaceURI ? String(name) : String(name).toLowerCase();
    if (key === 'style') return this.style.cssText || null;
    return this._attributes.has(key) ? this._attributes.get(key) : null;
  }

  hasAttribute(name) { return this.getAttribute(name) !== null; }

  removeAttribute(name) {
    const key = this.namespaceURI ? String(name) : String(name).toLowerCase();
    if (key === 'style') this.style.cssText = '';
    this._attributes.delete(key);
  }

  toggleAttribute(name, force) {
    const has = this.hasAttribute(name);
    const add = force === undefined ? !has : Boolean(force);
    if (add) this.setAttribute(name, '');
    else this.removeAttribute(name);
    return add;
  }

  getAttributeNames() { return [...this._attributes.keys()]; }

  setAttributeNS(_, name, value) { this.setAttribute(name, value); }
  getAttributeNS(_, name) { return this.getAttribute(name); }
  removeAttributeNS(_, name) { this.removeAttribute(name); }

  get tabIndex() {
    const value = this.getAttribute('tabindex');
    return value === null ? -1 : Number(value);
  }
  set tabIndex(value) { this.setAttribute('tabindex', String(Number(value))); }

  get type() { return this.getAttribute('type') ?? (this.localName === 'button' ? 'submit' : this.localName === 'input' ? 'text' : ''); }
  set type(value) { this.setAttribute('type', value); }

  // A form control's current value is its value attribute; a textarea's is
  // its text, as the browser serializes it.
  get value() {
    if (this.localName === 'textarea') return this.textContent;
    return this.getAttribute('value') ?? '';
  }
  set value(value) {
    if (this.localName === 'textarea') this.textContent = value;
    else this.setAttribute('value', value ?? '');
  }

  get innerHTML() { return this.childNodes.map(serializeNode).join(''); }
  set innerHTML(html) {
    for (const child of [...this.childNodes]) this.removeChild(child);
    if (html !== '' && html !== null && html !== undefined) this.appendChild(new ShimRawHTML(html, this.ownerDocument));
  }

  get outerHTML() { return serializeNode(this); }

  get innerText() { return this.textContent; }
  set innerText(value) { this.textContent = value; }

  cloneNode(deep) {
    const copy = new ShimElement(this.localName, this.ownerDocument, this.namespaceURI);
    for (const [name, value] of this._attributes) copy._attributes.set(name, value);
    copy.style.cssText = this.style.cssText;
    if (deep) for (const child of this.childNodes) copy.appendChild(child.cloneNode(true));
    return copy;
  }

  matches(selector) { return matchesSelector(this, selector); }
  closest(selector) {
    for (let node = this; node && node.nodeType === ELEMENT_NODE; node = node.parentNode) {
      if (matchesSelector(node, selector)) return node;
    }
    return null;
  }
  querySelector(selector) { return querySelectorAllFrom(this, selector)[0] ?? null; }
  querySelectorAll(selector) { return querySelectorAllFrom(this, selector); }
  getElementsByTagName(tag) { return querySelectorAllFrom(this, tag); }

  // There is no layout during static rendering.
  getBoundingClientRect() { return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
  getClientRects() { return []; }
  get offsetWidth() { return 0; }
  get offsetHeight() { return 0; }
  get clientWidth() { return 0; }
  get clientHeight() { return 0; }
  get scrollWidth() { return 0; }
  get scrollHeight() { return 0; }
  focus() {}
  blur() {}
  click() {}
  scrollIntoView() {}
  scrollTo() {}
  animate() {
    return { finished: Promise.resolve(), cancel() {}, finish() {}, pause() {}, play() {}, reverse() {}, addEventListener() {}, onfinish: null };
  }
  getAnimations() { return []; }
  attachShadow() { return new ShimFragment(this.ownerDocument); }
}

for (const [property, attribute] of Object.entries(STRING_PROPERTIES)) {
  Object.defineProperty(ShimElement.prototype, property, {
    get() { return this.getAttribute(attribute) ?? ''; },
    set(value) {
      if (value === null || value === undefined) this.removeAttribute(attribute);
      else this.setAttribute(attribute, value);
    },
    configurable: true,
  });
}
for (const [property, attribute] of Object.entries(BOOLEAN_PROPERTIES)) {
  Object.defineProperty(ShimElement.prototype, property, {
    get() { return this.hasAttribute(attribute); },
    set(value) { this.toggleAttribute(attribute, Boolean(value)); },
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Selectors (the small subset renderers use: tag, #id, .class, [attr],
// [attr=value], comma lists and descendant combinators)
// ---------------------------------------------------------------------------

function matchesCompound(element, compound) {
  const pattern = /([#.]?[\w-]+|\*|\[[^\]]+\])/g;
  let match;
  while ((match = pattern.exec(compound))) {
    const part = match[1];
    if (part === '*') continue;
    if (part.startsWith('#')) {
      if (element.getAttribute('id') !== part.slice(1)) return false;
    } else if (part.startsWith('.')) {
      if (!element.classList.contains(part.slice(1))) return false;
    } else if (part.startsWith('[')) {
      const [, name, value] = part.match(/^\[\s*([^\]=\s]+)\s*(?:=\s*["']?([^"'\]]*)["']?)?\s*\]$/) || [];
      if (!name) return false;
      const actual = element.getAttribute(name);
      if (actual === null || (value !== undefined && actual !== value)) return false;
    } else if (element.localName.toLowerCase() !== part.toLowerCase()) {
      return false;
    }
  }
  return true;
}

function matchesSelector(element, selector) {
  return String(selector).split(',').some((alternative) => {
    const compounds = alternative.trim().split(/\s+/).filter(Boolean);
    if (compounds.length === 0) return false;
    if (!matchesCompound(element, compounds[compounds.length - 1])) return false;
    let ancestor = element.parentNode;
    for (let i = compounds.length - 2; i >= 0; i--) {
      while (ancestor && !(ancestor.nodeType === ELEMENT_NODE && matchesCompound(ancestor, compounds[i]))) ancestor = ancestor.parentNode;
      if (!ancestor) return false;
      ancestor = ancestor.parentNode;
    }
    return true;
  });
}

function querySelectorAllFrom(root, selector) {
  const found = [];
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType !== ELEMENT_NODE) continue;
      if (matchesSelector(child, selector)) found.push(child);
      walk(child);
    }
  };
  walk(root);
  return found;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

export function serializeNode(node) {
  if (!node) return '';
  if (node.isRawHTML) return node.html;
  switch (node.nodeType) {
    case TEXT_NODE:
      return node.parentNode && node.parentNode.nodeType === ELEMENT_NODE && RAW_TEXT_ELEMENTS.has(node.parentNode.localName)
        ? node.data.replace(/<\/(script|style)/gi, '<\\/$1')
        : escapeText(node.data);
    case COMMENT_NODE:
      return `<!--${node.data.replace(/--/g, '- -')}-->`;
    case DOCUMENT_FRAGMENT_NODE:
      return node.childNodes.map(serializeNode).join('');
    case ELEMENT_NODE: {
      const name = node.localName;
      let markup = `<${name}`;
      for (const [attribute, value] of node._attributes) {
        markup += value === '' && BOOLEAN_ATTRIBUTE_NAMES.has(attribute)
          ? ` ${attribute}`
          : ` ${attribute}="${escapeAttribute(value)}"`;
      }
      const style = node.style.cssText;
      if (style) markup += ` style="${escapeAttribute(style)}"`;
      if (VOID_ELEMENTS.has(name) && !node.namespaceURI) return `${markup}>`;
      return `${markup}>${node.childNodes.map(serializeNode).join('')}</${name}>`;
    }
    default:
      return '';
  }
}

const BOOLEAN_ATTRIBUTE_NAMES = new Set(Object.values(BOOLEAN_PROPERTIES));

// ---------------------------------------------------------------------------
// Document and globals
// ---------------------------------------------------------------------------

export class ShimDocument extends ShimNode {
  constructor() {
    super(9, null);
    this.ownerDocument = this;
    this.documentElement = new ShimElement('html', this);
    this.head = new ShimElement('head', this);
    this.body = new ShimElement('body', this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
    this.title = '';
    this.activeElement = null;
    this.readyState = 'complete';
    this.visibilityState = 'visible';
    this.hidden = false;
    this.fonts = { ready: Promise.resolve(), addEventListener() {}, removeEventListener() {} };
  }

  createElement(tagName) { return new ShimElement(tagName, this); }
  createElementNS(namespaceURI, tagName) {
    return namespaceURI === 'http://www.w3.org/1999/xhtml'
      ? new ShimElement(tagName, this)
      : new ShimElement(tagName, this, namespaceURI);
  }
  createTextNode(data) { return new ShimText(data, this); }
  createComment(data) { return new ShimComment(data, this); }
  createDocumentFragment() { return new ShimFragment(this); }
  getElementById(id) { return querySelectorAllFrom(this, `#${id}`)[0] ?? null; }
  querySelector(selector) { return querySelectorAllFrom(this, selector)[0] ?? null; }
  querySelectorAll(selector) { return querySelectorAllFrom(this, selector); }
  startViewTransition(callback) {
    callback?.();
    const done = Promise.resolve();
    return { finished: done, ready: done, updateCallbackDone: done, skipTransition() {} };
  }
}

class InertObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

function mediaQueryList(query) {
  return {
    matches: false,
    media: String(query),
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  };
}

/**
 * Install the shim as the browser globals the renderers read, run `fn`, and
 * restore the previous globals (which may be a real or test DOM).
 *
 * Animation frames and timers scheduled during the render never run, so the
 * markup is the view's first frame and the output is deterministic.
 *
 * @template T
 * @param {(document: ShimDocument) => T} fn
 * @returns {T}
 */
export function withDOMShim(fn) {
  const document = new ShimDocument();
  const window = {
    document,
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1,
    location: { href: 'about:blank', pathname: '/', search: '', hash: '', origin: 'null' },
    history: { state: null, length: 1, pushState() {}, replaceState() {}, back() {}, forward() {}, go() {} },
    navigator: { userAgent: 'swiftui-for-web/server', language: 'en' },
    matchMedia: mediaQueryList,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    getComputedStyle: (element) => element?.style ?? new ShimStyle(),
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    requestIdleCallback: () => 0,
    cancelIdleCallback() {},
    scrollTo() {},
  };
  const globals = {
    window,
    document,
    Node: { ELEMENT_NODE, TEXT_NODE, COMMENT_NODE, DOCUMENT_FRAGMENT_NODE },
    Element: ShimElement,
    HTMLElement: ShimElement,
    SVGElement: ShimElement,
    Text: ShimText,
    DocumentFragment: ShimFragment,
    matchMedia: mediaQueryList,
    getComputedStyle: window.getComputedStyle,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    requestIdleCallback: window.requestIdleCallback,
    cancelIdleCallback: window.cancelIdleCallback,
    ResizeObserver: InertObserver,
    // No IntersectionObserver: code that checks for it renders everything
    // at once (lazy stacks), which is what a static page needs.
    IntersectionObserver: undefined,
    MutationObserver: InertObserver,
  };
  const previous = new Map();
  try {
    for (const [name, value] of Object.entries(globals)) {
      previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
      Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
    }
    return fn(document);
  } finally {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

export { ShimElement, ShimText, ShimFragment };
