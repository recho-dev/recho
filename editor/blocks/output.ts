import {Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language";
import {EditorSelection, EditorState, Facet, Prec, StateField, type Extension, type Range} from "@codemirror/state";
import {ART, PREFIX_END, markLineType} from "../../lib/blocks/detect.ts";
import {findLinks, linkTitle} from "../commentLink.js";
import {hasEscape, locate, parse, stripAnsi, styleToCss} from "../../lib/ansi.js";
import {blockMetadataField} from "./state.ts";
import {createTypefaceStyle} from "./fonts.ts";

export type OutputLine = {
  from: number;
  type: "output" | "error" | "warning";
};

function computeLineNumbers(state: EditorState): OutputLine[] {
  const lineNumbers: OutputLine[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== "LineComment") return;

      // The comment must cover the entire line.
      const line = state.doc.lineAt(node.from);
      if (line.from !== node.from || line.to !== node.to) return;

      const type = markLineType(line.text);
      if (type === null) return;

      // Output lines must be top-level; for error messages, it's Ok if the
      // line is not top-level.
      if (type === "output" && node.node.parent?.name !== "Script") return;

      lineNumbers.push({from: line.from, type});
    },
  });
  return lineNumbers;
}

export type OutputLineFinder = (state: EditorState) => OutputLine[];

/**
 * How output lines are found. By default, as top-level `//➜` and `//✗`
 * comments in the JavaScript syntax tree; other languages provide their own.
 */
export const outputLineFinder = Facet.define<OutputLineFinder, OutputLineFinder>({
  combine: (values) => values[0] ?? computeLineNumbers,
});

export const outputLinesField = StateField.define<OutputLine[]>({
  create(state) {
    return state.facet(outputLineFinder)(state);
  },
  update(value, tr) {
    // The syntax tree can be partial (the parser stops after a time budget
    // and the first 3000 characters). It's finished later in a transaction
    // that changes the tree but not the document, so a long notebook's later
    // output isn't missed until the next edit.
    const treeChanged = syntaxTree(tr.state) !== syntaxTree(tr.startState);
    return tr.docChanged || treeChanged ? tr.state.facet(outputLineFinder)(tr.state) : value;
  },
});

const LINE_CLASS = {
  output: "cm-output-line",
  error: "cm-output-line cm-error-line",
  warning: "cm-output-line cm-warning-line",
};

/** Per line start, the classes and typeface that block attributes give it. */
function attributeRows(state: EditorState) {
  const compact = new Set<number>();
  const fonts = new Map<number, string>();
  for (const {output, attributes} of state.field(blockMetadataField, false) ?? []) {
    if (output === null) continue;
    if (attributes.compact !== true && typeof attributes.typeface !== "string") continue;
    const startLine = state.doc.lineAt(output.from);
    const endLine = state.doc.lineAt(Math.min(output.to, state.doc.length));
    const endLineNumber = endLine.from < output.to ? endLine.number + 1 : endLine.number;
    for (let n = startLine.number; n < endLineNumber && n <= state.doc.lines; n++) {
      const {from} = state.doc.line(n);
      if (attributes.compact === true) compact.add(from);
      if (typeof attributes.typeface === "string") fonts.set(from, createTypefaceStyle(attributes.typeface));
    }
  }
  return {compact, fonts};
}

/** The starts of output lines in runs (consecutive lines) with box drawing: they are set as art. */
function artLines(state: EditorState, lines: OutputLine[]) {
  const {doc} = state;
  const art = new Set<number>();
  for (let i = 0; i < lines.length; ) {
    let j = i + 1;
    while (j < lines.length && doc.lineAt(lines[j].from).number === doc.lineAt(lines[j - 1].from).number + 1) j++;
    const run = lines.slice(i, j).filter(({type}) => type === "output");
    if (run.some(({from}) => ART.test(doc.lineAt(from).text))) run.forEach(({from}) => art.add(from));
    i = j;
  }
  return art;
}

// Decorations are shared by every line or span that looks the same, so
// CodeMirror can tell unchanged lines apart cheaply.
const lineDecorations = new Map<string, Decoration>();
function lineDecoration(className: string, font: string) {
  const key = `${className}|${font}`;
  let decoration = lineDecorations.get(key);
  if (!decoration) {
    decoration = Decoration.line({attributes: font ? {class: className, style: font} : {class: className}});
    lineDecorations.set(key, decoration);
  }
  return decoration;
}

const styleMarks = new Map<string, Decoration>();
function styleMark(css: string) {
  let decoration = styleMarks.get(css);
  if (!decoration) {
    // Animated truecolor output makes new styles every frame.
    if (styleMarks.size > 1000) styleMarks.clear();
    decoration = Decoration.mark({attributes: {style: css}});
    styleMarks.set(css, decoration);
  }
  return decoration;
}

// The `//➜` (or `//✗`) at the start of a line, quieter than the output after it.
const prefixMark = Decoration.mark({class: "cm-output-line-prefix"});
// Escape sequences are in the document but don't show.
const hiddenEscape = Decoration.replace({});

/**
 * A line with more styled runs than this is drawn by a DenseOutputWidget.
 * Chrome slows down a lot with thousands of styled spans in editable text
 * (e.g. 80×40 truecolor animation: 800ms an update, against 12ms in a
 * widget). Coloured logs and tables stay well under it.
 */
const DENSE_RUNS = 12;

// A span with the inline style and link it was last given, so a redraw only
// touches what changed.
type Span = HTMLSpanElement & {rechoStyle?: string; rechoUrl?: string};

/**
 * The parts of a line's text: one per SGR style, split further where
 * http(s) links start and end, so links open with Cmd/Ctrl + Click like
 * links in comments (see ../commentLink.js).
 */
function textParts(text: string) {
  const runs = parse(text);
  const links = findLinks(runs.map((run) => run.text).join(""));
  const parts: {style: string; text: string; url: string}[] = [];
  let offset = 0;
  for (const run of runs) {
    const style = styleToCss(run.style);
    const end = offset + run.text.length;
    let at = offset;
    while (at < end) {
      const link = links.find((l) => l.to > at && l.from < end);
      if (!link) {
        parts.push({style, text: run.text.slice(at - offset), url: ""});
        break;
      }
      if (link.from > at) parts.push({style, text: run.text.slice(at - offset, link.from - offset), url: ""});
      const to = Math.min(link.to, end);
      parts.push({style, text: run.text.slice(Math.max(link.from, at) - offset, to - offset), url: link.url});
      at = to;
    }
    offset = end;
  }
  return parts;
}

/**
 * The text of an output line dense with colour, after its prefix, drawn as
 * spans outside the editable text. The line keeps its place in the document,
 * so it is selected and deleted like other lines; the cursor goes before or
 * after it. A redraw reuses the spans, so an animation frame only changes
 * the text and styles that changed.
 */
class DenseOutputWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  eq(other: DenseOutputWidget) {
    return other.text === this.text;
  }

  toDOM() {
    const dom = document.createElement("span");
    dom.className = "cm-output-dense";
    this.render(dom);
    return dom;
  }

  updateDOM(dom: HTMLElement) {
    this.render(dom);
    return true;
  }

  render(dom: HTMLElement) {
    let child = dom.firstChild as Span | null;
    for (const {style, text, url} of textParts(this.text)) {
      let span = child;
      if (span === null) span = dom.appendChild(document.createElement("span"));
      if (span.rechoStyle !== style) span.style.cssText = span.rechoStyle = style;
      if ((span.rechoUrl ?? "") !== url) {
        span.rechoUrl = url;
        if (url) {
          span.className = "cm-comment-link";
          span.setAttribute("data-url", url);
          span.title = linkTitle;
        } else {
          span.removeAttribute("class");
          span.removeAttribute("data-url");
          span.removeAttribute("title");
        }
      }
      if (span.textContent !== text) span.textContent = text;
      child = span.nextSibling as Span | null;
    }
    while (child) {
      const next = child.nextSibling as Span | null;
      child.remove();
      child = next;
    }
  }

  // The editor handles clicks and drags, so they select lines as in code.
  ignoreEvent() {
    return false;
  }
}

/**
 * The decorations of the output lines in view: a class per line, the prefix
 * in the quiet prefix colour, the text in its SGR styles (see lib/ansi.js),
 * and the escapes hidden. The output stays text in the document, so it is
 * selected, edited and scrolled to like code. `atomic` are the hidden escapes
 * and dense lines, which the cursor steps over and deletes in one go.
 */
function createDecorations(view: EditorView) {
  const {state} = view;
  const {doc} = state;
  const lines = state.field(outputLinesField);
  const art = artLines(state, lines);
  const {compact, fonts} = attributeRows(state);
  const decorations: Range<Decoration>[] = [];
  const atomic: Range<Decoration>[] = [];
  let i = 0;
  for (const range of view.visibleRanges) {
    while (i < lines.length && lines[i].from < range.from) i++;
    for (; i < lines.length && lines[i].from <= range.to; i++) {
      const {from, type} = lines[i];
      const line = doc.lineAt(from);
      let className = LINE_CLASS[type];
      if (art.has(from)) className += " cm-art-line";
      if (compact.has(from)) className += " cm-compact-line";
      decorations.push(lineDecoration(className, fonts.get(from) ?? "").range(from));

      const prefix = line.text.match(PREFIX_END);
      const textFrom = prefix ? prefix[0].length : 0;
      if (prefix) decorations.push(prefixMark.range(from, from + textFrom));

      const located = locate(line.text);
      if (located.runs.length > DENSE_RUNS) {
        const widget = new DenseOutputWidget(line.text.slice(textFrom));
        const dense = Decoration.replace({widget}).range(from + textFrom, line.to);
        decorations.push(dense);
        atomic.push(dense);
        continue;
      }
      for (const run of located.runs) {
        const css = styleToCss(run.style);
        if (css) decorations.push(styleMark(css).range(from + run.from, from + run.to));
      }
      for (const escape of located.escapes) {
        const hidden = hiddenEscape.range(from + escape.from, from + escape.to);
        decorations.push(hidden);
        atomic.push(hidden);
      }
    }
  }
  return {decorations: Decoration.set(decorations, true), atomic: Decoration.set(atomic, true)};
}

export const outputDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    atomic: DecorationSet;

    constructor(view: EditorView) {
      ({decorations: this.decorations, atomic: this.atomic} = createDecorations(view));
    }

    update(update: ViewUpdate) {
      const blocksChanged =
        update.startState.field(blockMetadataField, false) !== update.state.field(blockMetadataField, false);
      const linesChanged = update.startState.field(outputLinesField) !== update.state.field(outputLinesField);
      if (update.docChanged || update.viewportChanged || blocksChanged || linesChanged) {
        ({decorations: this.decorations, atomic: this.atomic} = createDecorations(update.view));
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    provide: (plugin) => EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic ?? Decoration.none),
  },
);

/**
 * A selection that ends just before hidden escapes at the end of a line ends
 * at the line's end instead. Dragging past the end of a coloured line stops
 * before its last escape (usually a reset), which deleting would leave
 * behind, joined to the next line as raw text. Trailing escapes show
 * nothing, so taking them along is always safe.
 */
const selectTrailingEscapes = EditorState.transactionFilter.of((tr) => {
  if (!tr.selection) return tr;
  const doc = tr.newDoc;
  let extended = false;
  const ranges = tr.selection.ranges.map((range) => {
    if (range.empty) return range;
    const line = doc.lineAt(range.to);
    const rest = doc.sliceString(range.to, line.to);
    if (!rest || !hasEscape(rest) || stripAnsi(rest) !== "") return range;
    extended = true;
    return range.head === range.to
      ? EditorSelection.range(range.anchor, line.to)
      : EditorSelection.range(line.to, range.head);
  });
  if (!extended) return tr;
  return [tr, {selection: EditorSelection.create(ranges, tr.selection.mainIndex), sequential: true}];
});

// Copied output is plain text: its colours stay in the editor.
const plainCopy = EditorView.clipboardOutputFilter.of((text) => stripAnsi(text));

export const outputLines = outputLinesField.extension;

/** Output lines styled in place, with their colours, copied without them. */
// Above the basic setup's special characters, which would draw the hidden
// escapes' ESC as a placeholder.
export const outputDecoration: Extension = [Prec.high(outputDecorationPlugin), selectTrailingEscapes, plainCopy];
