import {Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language";
import {EditorState, Facet, Prec, StateField, type Extension, type Range} from "@codemirror/state";
import {PREFIX_END, markLineType} from "../../lib/blocks/detect.ts";
import {findLinks, linkTitle} from "../commentLink.js";
import {hasEscape, parse, stripAnsi, styleToCss} from "../../lib/ansi.js";
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

// Line decorations are shared by every line that looks the same, so
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

// The `//➜` (or `//✗`) at the start of a line, quieter than the output after it.
const prefixMark = Decoration.mark({class: "cm-output-line-prefix"});

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
 * The text of a coloured output line, after its prefix, drawn as styled spans
 * with its escapes left out. The escapes stay in the document, but never in
 * editable text, so the cursor and selections can't stop among them. The line
 * keeps its place in the document, so it is selected and deleted like other
 * lines; the cursor goes before or after the coloured text, which is deleted
 * as a whole. A redraw reuses the spans, so an animation frame only changes
 * the text and styles that changed, and thousands of coloured characters
 * stay fast (Chrome slows down a lot with that many spans in editable text).
 */
class ColoredOutputWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  eq(other: ColoredOutputWidget) {
    return other.text === this.text;
  }

  toDOM() {
    const dom = document.createElement("span");
    dom.className = "cm-output-colored";
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

  // The cursor goes at the widget's start or end. CodeMirror would measure
  // the end from the first span, which put the cursor inside the text.
  coordsAt(dom: HTMLElement, pos: number) {
    const {left, right, top, bottom} = dom.getBoundingClientRect();
    const x = pos === 0 ? left : right;
    return {left: x, right: x, top, bottom};
  }

  // The editor handles clicks and drags, so they select lines as in code.
  ignoreEvent() {
    return false;
  }
}

/**
 * The decorations of the output lines in view: a class per line and the
 * prefix in the quiet prefix colour. Plain output stays editable text, like
 * code. A line with escapes has the text after its prefix drawn by a
 * ColoredOutputWidget, which is also `atomic`: the cursor steps over it and
 * deleting takes it in one go.
 */
function createDecorations(view: EditorView) {
  const {state} = view;
  const {doc} = state;
  const lines = state.field(outputLinesField);
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
      if (compact.has(from)) className += " cm-compact-line";
      decorations.push(lineDecoration(className, fonts.get(from) ?? "").range(from));

      const prefix = line.text.match(PREFIX_END);
      const textFrom = prefix ? prefix[0].length : 0;
      if (prefix) decorations.push(prefixMark.range(from, from + textFrom));

      const text = line.text.slice(textFrom);
      if (!hasEscape(text)) continue;
      const colored = Decoration.replace({widget: new ColoredOutputWidget(text)}).range(from + textFrom, line.to);
      decorations.push(colored);
      atomic.push(colored);
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

// Copied output is plain text: its colours stay in the editor.
const plainCopy = EditorView.clipboardOutputFilter.of((text) => stripAnsi(text));

export const outputLines = outputLinesField.extension;

/** Output lines styled in place, with their colours, copied without them. */
// Above the basic setup's special characters, which would draw a placeholder
// for the ESC of escapes the widget covers.
export const outputDecoration: Extension = [Prec.high(outputDecorationPlugin), plainCopy];
