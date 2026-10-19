import {Decoration, EditorView, GutterMarker, WidgetType, lineNumberWidgetMarker} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language";
import {Facet, StateField, type EditorState, type Extension, type Range} from "@codemirror/state";
import {markLineType} from "../../lib/blocks/detect.ts";
import {parse, stripAnsi, styleToCss} from "../../lib/ansi.js";
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
    return tr.docChanged ? tr.state.facet(outputLineFinder)(tr.state) : value;
  },
});

// Box drawing and block elements: a run of output with them is ASCII art.
const ART = /[─-▟]/;
// The marks that end an output line's prefix, e.g. `//➜` or wenyan's `批曰。「「➜`.
const PREFIX_END = /^.{0,8}?[➜✗]/u;

/** One row of an output widget: a line of output and how it is set. */
type Row = {
  text: string;
  // The classes of the row, e.g. `cm-output-line cm-art-line`.
  className: string;
  // The inline style for the block's `@typeface` attribute, or "".
  font: string;
};

const ROW_CLASS = {
  output: "cm-output-line",
  error: "cm-output-line cm-error-line",
  warning: "cm-output-line cm-warning-line",
};

function sameRow(a: Row, b: Row) {
  return a.text === b.text && a.className === b.className && a.font === b.font;
}

// Art and `@compact` rows are one em high, other rows 1.25 em (see
// .cm-output-line in ../index.css).
function isTight(row: Row) {
  return row.className.includes("cm-art-line") || row.className.includes("cm-compact-line");
}

// The class and inline style each span was last given, so a redraw only
// touches what changed.
type Span = HTMLSpanElement & {rechoClass?: string; rechoStyle?: string};

/**
 * Draws a row as spans: the prefix, then one span per SGR style. The row's
 * existing spans are reused, so an animation frame that changes a few
 * characters changes a few text nodes, not the whole row.
 */
function renderRow(row: Row, element: HTMLElement) {
  if (element.className !== row.className) element.className = row.className;
  if (element.style.cssText !== row.font) element.style.cssText = row.font;
  const prefix = row.text.match(PREFIX_END);
  const parts: [className: string, style: string, text: string][] = [];
  if (prefix) parts.push(["cm-output-line-prefix", "", prefix[0]]);
  for (const {text, style} of parse(prefix ? row.text.slice(prefix[0].length) : row.text)) {
    parts.push(["", styleToCss(style), text]);
  }
  let child = element.firstChild as Span | null;
  for (const [className, style, text] of parts) {
    let span = child;
    if (span === null) {
      span = document.createElement("span");
      element.appendChild(span);
    }
    if (span.rechoClass !== className) span.className = span.rechoClass = className;
    if (span.rechoStyle !== style) span.style.cssText = span.rechoStyle = style;
    if (span.textContent !== text) span.textContent = text;
    child = span.nextSibling as Span | null;
  }
  while (child) {
    const next = child.nextSibling as Span | null;
    child.remove();
    child = next;
  }
}

// The rows a widget's DOM shows, to patch only those that change.
const renderedRows = new WeakMap<HTMLElement, Row[]>();

/**
 * A run of output lines drawn by the editor: one row per line, with the
 * `//➜` prefix in the quiet prefix colour and the rest split into spans per
 * SGR style (see lib/ansi.js). It replaces the lines it shows, so the
 * escapes in the document never show.
 */
export class OutputWidget extends WidgetType {
  constructor(
    readonly rows: Row[],
    readonly lineNumber: number,
  ) {
    super();
  }

  eq(other: OutputWidget) {
    if (other.rows.length !== this.rows.length) return false;
    for (let i = 0; i < this.rows.length; i++) if (!sameRow(this.rows[i], other.rows[i])) return false;
    return true;
  }

  toDOM() {
    const dom = document.createElement("div");
    dom.className = "cm-output-widget";
    this.patch(dom, []);
    return dom;
  }

  updateDOM(dom: HTMLElement) {
    this.patch(dom, renderedRows.get(dom) ?? []);
    return true;
  }

  // Redraws only the rows whose text or style changed (rows are keyed by
  // index), and adds or removes rows at the end.
  patch(dom: HTMLElement, old: Row[]) {
    const {rows} = this;
    while (dom.childElementCount > rows.length) dom.lastElementChild!.remove();
    for (let i = 0; i < rows.length; i++) {
      if (i < dom.childElementCount) {
        if (i >= old.length || !sameRow(old[i], rows[i])) renderRow(rows[i], dom.children[i] as HTMLElement);
      } else {
        const element = document.createElement("div");
        renderRow(rows[i], element);
        dom.appendChild(element);
      }
    }
    renderedRows.set(dom, rows);
  }

  get estimatedHeight() {
    // Rows are 1.25 em (or 1 em) of a 13.5px font; CodeMirror measures them.
    return this.rows.reduce((height, row) => height + (isTight(row) ? 13.5 : 16.875), 0);
  }
}

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

function createWidgets(state: EditorState) {
  const lines = state.field(outputLinesField);
  const {doc} = state;
  const {compact, fonts} = attributeRows(state);
  const widgets: Range<Decoration>[] = [];
  for (let i = 0; i < lines.length; ) {
    // A run: output lines on consecutive lines of the document.
    const first = doc.lineAt(lines[i].from);
    const run = [{line: first, type: lines[i].type}];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const line = doc.lineAt(lines[j].from);
      if (line.number !== run[run.length - 1].line.number + 1) break;
      run.push({line, type: lines[j].type});
    }
    i = j;
    // A run with box drawing is set as art.
    const art = run.some(({line, type}) => type === "output" && ART.test(line.text));
    const rows = run.map(({line, type}) => {
      let className = ROW_CLASS[type];
      if (type === "output" && art) className += " cm-art-line";
      if (compact.has(line.from)) className += " cm-compact-line";
      return {text: line.text, className, font: fonts.get(line.from) ?? ""};
    });
    const last = run[run.length - 1].line;
    const widget = new OutputWidget(rows, first.number);
    widgets.push(Decoration.replace({widget, block: true}).range(first.from, last.to));
  }
  return Decoration.set(widgets);
}

/** The output widgets. They are block decorations, which only a state field can provide. */
export const outputWidgetField = StateField.define({
  create: createWidgets,
  update(widgets, tr) {
    const blocksChanged = tr.startState.field(blockMetadataField, false) !== tr.state.field(blockMetadataField, false);
    return tr.docChanged || blocksChanged ? createWidgets(tr.state) : widgets;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** The line numbers next to an output widget, one per row, each as high as its row. */
class OutputLineNumbers extends GutterMarker {
  constructor(
    readonly first: number,
    readonly tight: boolean[],
  ) {
    super();
  }

  eq(other: OutputLineNumbers) {
    return (
      other.first === this.first &&
      other.tight.length === this.tight.length &&
      other.tight.every((tight, i) => tight === this.tight[i])
    );
  }

  // One element: the gutter removes a marker by removing its first node.
  toDOM() {
    const numbers = document.createElement("div");
    this.tight.forEach((tight, i) => {
      const div = document.createElement("div");
      div.className = tight ? "cm-output-number cm-tight" : "cm-output-number";
      div.textContent = String(this.first + i);
      numbers.appendChild(div);
    });
    return numbers;
  }
}

const outputLineNumbers = lineNumberWidgetMarker.of((_view, widget) =>
  widget instanceof OutputWidget ? new OutputLineNumbers(widget.lineNumber, widget.rows.map(isTight)) : null,
);

// Copied output is plain text: its colours stay in the editor.
const plainCopy = EditorView.clipboardOutputFilter.of((text) => stripAnsi(text));

export const outputLines = outputLinesField.extension;

/** Output drawn as widgets, with their line numbers, copied without colours. */
export const outputDecoration: Extension = [outputWidgetField, outputLineNumbers, plainCopy];
