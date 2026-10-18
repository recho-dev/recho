// Autocompletion for MLscript notebooks from the tree-sitter tree alone (no
// compiler): the names defined in the notebook, the local names in scope at
// the cursor, the members of the notebook's modules and classes and of
// `recho`, the standard library modules in `import` strings, and keywords.

/** An identifier (the grammar's `_word`, without the symbolic suffix). */
const WORD = /[\p{L}_'][\p{L}\p{Nd}_']*$/u;
const WORD_CHARS = /^[\p{L}\p{Nd}_']*$/u;
/** `X.` or `X.mem` before the cursor. */
const MEMBER = /([\p{L}_'][\p{L}\p{Nd}_']*)\s*\.\s*([\p{L}\p{Nd}_']*)$/u;

/**
 * The standard library modules a notebook can import: the modules of
 * `@mlscript/recho` (the keys of its `dist/std-modules.mjs`) without the
 * internal `Runtime` and `RuntimeJS`, and `Predef`, which is opened
 * automatically. The compiler package is not imported here: it stays out of
 * the editor's chunk. A test checks this list against the package.
 */
export const STD_MODULES = ["Iter", "LazyArray", "Option", "Rendering", "Stack", "StrOps", "Term"];

/**
 * The keywords of the tree-sitter grammar (`queries/highlights.scm`, the
 * modifiers of `grammar.js`, and the keyword-like literals).
 */
export const KEYWORDS = [
  // Declarations.
  "class", "trait", "module", "object", "mixin", "pattern", "type", "constructor", "new",
  "fun", "val", "using", "let", "set",
  // Control.
  "if", "while", "then", "else", "case", "do", "drop", "return", "throw", "yield",
  "import", "open", "handle", "region", "try", "finally", "outer", "assert",
  // Operators.
  "and", "or", "not", "is", "as", "of", "in", "extends", "restricts", "with", "where",
  // Modifiers.
  "abstract", "data", "declare", "mut", "out", "override", "private", "public", "staged", "virtual",
  // Literals.
  "true", "false", "null", "undefined", "this", "super",
]; // prettier-ignore

/**
 * A completion that inserts `template`, leaving the cursor at its `$` (as in
 * ../../completion.js).
 */
function template(text) {
  const offset = text.indexOf("$");
  const insert = offset < 0 ? text : text.slice(0, offset) + text.slice(offset + 1);
  return (view, _completion, from, to) => {
    view.dispatch({
      changes: {from, to, insert},
      selection: {anchor: from + (offset < 0 ? insert.length : offset)},
    });
  };
}

/** The functions of `recho` that MLscript nodes can call, with MLscript templates. */
export const RECHO_MEMBERS = [
  {
    label: "toggle",
    detail: "(value: Bool)",
    info: "Display an interactive toggle in the editor.",
    template: "toggle($)",
  },
  {
    label: "number",
    detail: "(value: Num, {min?, max?, step?})",
    info: "Display a stepper control for a number value using a given step length within a specified range.",
    template: "number($, {min: 0, max: 10})",
  },
  {
    label: "radio",
    detail: "(index: Int, options: Array)",
    info: "Display an interactive radio button group in the editor.",
    template: "radio($, [])",
  },
  {
    label: "button",
    detail: "(label: Str, callback: () -> ())",
    info: "Display a button that runs a callback when clicked.",
    template: 'button("$", () => ())',
  },
  {
    label: "interval",
    detail: "(intervalInMilliseconds: Num)",
    info: "Returns a generator that yields values at a specified interval.",
    template: "interval($)",
  },
  {
    label: "now",
    detail: "()",
    info: "Returns a generator that yields the current time continuously.",
    template: "now()",
  },
  {
    label: "state",
    detail: "(value: Any)",
    info: "Creates a reactive state variable for a mutable value.",
    template: "state($)",
  },
  {
    label: "inspect",
    detail: "(value: Any, options?: {depth?, maxLength?})",
    info: "Formats a value for inspection.",
    template: "inspect($)",
  },
  {
    label: "require",
    detail: "(...names: Str)",
    info: "Imports one or more JavaScript packages. The import specifiers must be valid npm package names with optional version specifiers.",
    template: 'require("$")',
  },
].map(({template: text, ...completion}) => ({...completion, type: "function", apply: template(text)}));

const GLOBALS = [
  {label: "echo", type: "function", detail: "(value: Any)", info: "Echos the output above the current block.", apply: template("echo($)")},
  {label: "recho", type: "namespace", info: "Recho's standard library: controls, timers and state."},
]; // prettier-ignore

const KEYWORD_OPTIONS = KEYWORDS.map((label) => ({label, type: "keyword"}));

const COMPLETION_TYPES = {
  let_binding: "variable",
  val_definition: "variable",
  definition: "variable",
  fun_definition: "function",
  class_definition: "class",
  trait_definition: "class",
  mixin_definition: "class",
  object_definition: "class",
  module_definition: "namespace",
  type_definition: "type",
  pattern_definition: "type",
};
const VALUE_DEFINITIONS = new Set(["let_binding", "val_definition", "definition"]);

const namedChildren = (node) => node.namedChildren.filter((child) => child.type !== "comment");

/** The first named child, past modifiers (`data class ...`). */
const headOf = (node) => namedChildren(node).find((child) => child.type !== "modifier") ?? null;

/** The identifier naming a definition head: `f`, `f(x)`, `C(x) with ...`, `T[A]`, `(+) plus(a, b)`. */
function headName(node) {
  if (!node) return null;
  switch (node.type) {
    case "identifier":
      return node;
    case "application":
    case "type_arguments":
    case "infix_application":
      return headName(node.namedChild(0));
    case "juxtaposition":
      return namedChildren(node).findLast((child) => child.type === "identifier") ?? null;
    default:
      return null;
  }
}

/** The identifiers bound by a pattern: `x`, `x: T`, `(a, b)`, `[a, b]`. */
function patternNames(node) {
  if (!node) return [];
  switch (node.type) {
    case "identifier":
      return [node];
    case "infix_application":
    case "val_definition":
      return patternNames(node.namedChild(0));
    case "parenthesized_expression":
    case "tuple":
      return namedChildren(node).flatMap(patternNames);
    default:
      return [];
  }
}

/** The identifiers a definition statement binds (none for other statements). */
function definedNames(node) {
  if (!(node.type in COMPLETION_TYPES)) return [];
  if (VALUE_DEFINITIONS.has(node.type)) return patternNames(headOf(node));
  const name = headName(headOf(node));
  return name ? [name] : [];
}

/** The parameter lists of a definition head, e.g. both of `f(x)(y)`. */
function parameterLists(head) {
  if (!head) return [];
  switch (head.type) {
    case "application":
      return [...parameterLists(head.namedChild(0)), ...namedChildren(head).filter((c) => c.type === "arguments")];
    case "infix_application":
      return parameterLists(head.namedChild(0));
    default:
      return [];
  }
}

const parametersOf = (definition) =>
  parameterLists(headOf(definition)).flatMap((args) => namedChildren(args).flatMap(patternNames));

/** The `with` block of a class, module or object definition. */
function bodyOf(definition) {
  const head = headOf(definition);
  if (head?.type !== "infix_application") return null;
  return namedChildren(head).find((child) => child.type === "block") ?? null;
}

const contains = (node, pos) => node.startIndex <= pos && pos <= node.endIndex;

/**
 * The completions for the names `nodes` define, skipping a definition that
 * contains the cursor when it can't refer to itself (`let x = x`) and any name
 * being typed.
 */
function definitionOptions(nodes, pos, seen, options) {
  for (const node of nodes) {
    if (VALUE_DEFINITIONS.has(node.type) && contains(node, pos)) continue;
    for (const name of definedNames(node)) {
      if (contains(name, pos) || seen.has(name.text)) continue;
      seen.add(name.text);
      options.push({label: name.text, type: COMPLETION_TYPES[node.type]});
    }
  }
}

/** The statements of the notebook, looking into ERROR nodes left by an edit. */
function topLevelStatements(root) {
  return namedChildren(root).flatMap((node) => (node.type === "ERROR" ? namedChildren(node) : [node]));
}

/** `let x` inside an ERROR node before the cursor, which the parser gave up on. */
function letsInError(error, pos) {
  const names = [];
  const children = error.children;
  for (let i = 0; i + 1 < children.length; i++) {
    const next = children[i + 1];
    if (children[i].type === "let" && next.type === "identifier" && next.endIndex < pos) names.push(next);
  }
  return names;
}

/** The local names in scope at `pos`, innermost first. */
function localOptions(node, pos, seen, options) {
  const push = (names, type) => {
    for (const name of names) {
      if (contains(name, pos) || seen.has(name.text)) continue;
      seen.add(name.text);
      options.push({label: name.text, type});
    }
  };
  for (let n = node; n; n = n.parent) {
    switch (n.type) {
      case "fun_definition":
        push(parametersOf(n), "variable");
        break;
      case "lambda": {
        const params = n.namedChild(0);
        if (params && params.endIndex <= pos) push(patternNames(params), "variable");
        break;
      }
      case "block": {
        // `let`s before the cursor; other definitions anywhere in the block.
        const statements = namedChildren(n).filter((s) => !VALUE_DEFINITIONS.has(s.type) || s.startIndex < pos);
        definitionOptions(statements, pos, seen, options);
        break;
      }
      case "ERROR": {
        push(letsInError(n, pos), "variable");
        // An indented line that failed to parse is likely the body of the
        // definition before it.
        const previous = n.parent?.type === "source_file" ? n.previousNamedSibling : null;
        if (previous?.type === "fun_definition") push(parametersOf(previous), "variable");
        break;
      }
    }
  }
}

/**
 * The node whose scopes are those at the cursor: the word being typed or,
 * with none, the code before the cursor (trailing spaces aren't part of the
 * nodes), unless the cursor starts a line.
 */
function scopeNode(state, root, from, pos) {
  if (from < pos) return root.descendantForIndex(from, pos);
  const line = state.doc.lineAt(pos);
  if (pos === line.from) return root;
  const before = state.sliceDoc(0, pos).trimEnd().length;
  return before > 0 ? root.descendantForIndex(before - 1, before) : root;
}

/** The members of the module, class or object named `name` in the notebook. */
function memberOptions(root, name) {
  const options = [];
  const seen = new Set();
  // Only modules and objects: a class's methods and `val` parameters belong to
  // its instances, so `Point.x` would be wrong.
  for (const node of topLevelStatements(root)) {
    if (node.type !== "module_definition" && node.type !== "object_definition") continue;
    if (definedNames(node)[0]?.text !== name) continue;
    const body = bodyOf(node);
    if (body) definitionOptions(namedChildren(body), -1, seen, options);
  }
  return options;
}

/** The comment or string the cursor is in, if any. */
function enclosingToken(root, pos) {
  if (pos === 0) return null;
  for (let n = root.descendantForIndex(pos - 1, pos); n; n = n.parent) {
    if (n.type === "comment") {
      // A line comment runs to the end of the line; a block comment ends at `*/`.
      return pos < n.endIndex || n.text.startsWith("//") ? n : null;
    }
    if (n.type === "string_literal") {
      const closed = n.endIndex - n.startIndex > 1 && !n.lastChild?.isMissing;
      return pos < n.endIndex || !closed ? n : null;
    }
  }
  return null;
}

/** The standard library modules, inside the string of an `import`. */
function importCompletion(string, context) {
  const quote = string.text.startsWith('"""') ? 3 : 1;
  const from = string.startIndex + quote;
  if (context.pos < from) return null;
  const closed = !string.lastChild?.isMissing && string.endIndex - string.startIndex > quote;
  const close = closed ? "" : '"'.repeat(quote);
  return {
    from,
    validFor: /^[\w/.]*$/,
    options: STD_MODULES.map((name) => {
      const label = `std/${name}.mls`;
      return {label, type: "namespace", apply: label + close};
    }),
  };
}

/**
 * The completion source of MLscript notebooks, reading the tree in
 * `treeField` (tree-sitter indices are UTF-16, like CodeMirror positions).
 * @returns {(context: import("@codemirror/autocomplete").CompletionContext) =>
 *   import("@codemirror/autocomplete").CompletionResult | null}
 */
export function mlscriptCompletion(treeField) {
  return (context) => {
    const {state, pos} = context;
    const root = state.field(treeField).rootNode;

    const token = enclosingToken(root, pos);
    if (token) {
      return token.type === "string_literal" && token.parent?.type === "import_statement"
        ? importCompletion(token, context)
        : null;
    }

    const member = context.matchBefore(MEMBER);
    if (member) {
      const [, object, prefix] = MEMBER.exec(member.text);
      const options = object === "recho" ? RECHO_MEMBERS : memberOptions(root, object);
      if (options.length === 0) return null;
      return {from: pos - prefix.length, validFor: WORD_CHARS, options};
    }

    const word = context.matchBefore(WORD);
    if (!word && !context.explicit) return null;
    const from = word ? word.from : pos;
    // Not right after a number (`1e`) or inside one.
    if (from > 0 && /[\p{Nd}]/u.test(state.sliceDoc(from - 1, from))) return null;

    const seen = new Set();
    const options = [];
    localOptions(scopeNode(state, root, from, pos), pos, seen, options);
    definitionOptions(topLevelStatements(root), pos, seen, options);
    for (const option of GLOBALS) if (!seen.has(option.label)) options.push(option);
    options.push(...KEYWORD_OPTIONS);
    return {from, validFor: WORD_CHARS, options};
  };
}
