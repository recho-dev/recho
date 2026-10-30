import {
  Decoration,
  EditorView,
  GutterMarker,
  ViewPlugin,
  WidgetType,
  lineNumberWidgetMarker,
  type ViewUpdate,
} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language";
import {Facet, StateField, type EditorState, type Extension, type Range} from "@codemirror/state";
import {ART, PREFIX_END, markLineType} from "../../lib/blocks/detect.ts";
import {findLinks, linkTitle} from "../commentLink.js";
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
    // The syntax tree can be partial (the parser stops after a time budget
    // and the first 3000 characters). It's finished later in a transaction
    // that changes the tree but not the document, so a long notebook's later
    // output isn't missed until the next edit.
    const treeChanged = syntaxTree(tr.state) !== syntaxTree(tr.startState);
    return tr.docChanged || treeChanged ? tr.state.facet(outputLineFinder)(tr.state) : value;
  },
});

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

// The class, inline style and link each span was last given, so a redraw
// only touches what changed.
type Span = HTMLSpanElement & {rechoClass?: string; rechoStyle?: string; rechoUrl?: string};

type Part = {className: string; style: string; text: string; url: string};

/**
 * The parts of a row's text after its prefix: one per SGR style, split
 * further where http(s) links start and end, so links open with Cmd/Ctrl +
 * Click like links in comments (see ../commentLink.js).
 */
function textParts(text: string): Part[] {
  const runs = parse(text);
  const links = findLinks(runs.map((run) => run.text).join(""));
  const parts: Part[] = [];
  let offset = 0;
  for (const run of runs) {
    const style = styleToCss(run.style);
    const end = offset + run.text.length;
    let at = offset;
    while (at < end) {
      const link = links.find((l) => l.to > at && l.from < end);
      if (!link || link.from >= end) {
        parts.push({className: "", style, text: run.text.slice(at - offset), url: ""});
        break;
      }
      if (link.from > at)
        parts.push({className: "", style, text: run.text.slice(at - offset, link.from - offset), url: ""});
      const to = Math.min(link.to, end);
      const from = Math.max(link.from, at);
      parts.push({
        className: "cm-comment-link",
        style,
        text: run.text.slice(from - offset, to - offset),
        url: link.url,
      });
      at = to;
    }
    offset = end;
  }
  return parts;
}

/**
 * Draws a row as spans: the prefix, then one span per SGR style (and link).
 * The row's existing spans are reused, so an animation frame that changes a
 * few characters changes a few text nodes, not the whole row.
 */
function renderRow(row: Row, element: HTMLElement) {
  if (element.className !== row.className) element.className = row.className;
  if (element.style.cssText !== row.font) element.style.cssText = row.font;
  const prefix = row.text.match(PREFIX_END);
  const parts = textParts(prefix ? row.text.slice(prefix[0].length) : row.text);
  if (prefix) parts.unshift({className: "cm-output-line-prefix", style: "", text: prefix[0], url: ""});
  let child = element.firstChild as Span | null;
  for (const {className, style, text, url} of parts) {
    let span = child;
    if (span === null) {
      span = document.createElement("span");
      element.appendChild(span);
    }
    if (span.rechoClass !== className) span.className = span.rechoClass = className;
    if (span.rechoStyle !== style) span.style.cssText = span.rechoStyle = style;
    if ((span.rechoUrl ?? "") !== url) {
      span.rechoUrl = url;
      if (url) {
        span.setAttribute("data-url", url);
        span.title = linkTitle;
      } else {
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

// The rows a widget's DOM shows, to patch only those that change.
const renderedRows = new WeakMap<HTMLElement, Row[]>();

/**
 * A run of output lines drawn by the editor: one row per line, with the
 * `//➜` prefix in the quiet prefix colour and the rest split into spans per
 * SGR style (see lib/ansi.js). It replaces the lines it shows, so the
 * escapes in the document never show.
 */
export class OutputWidget extends WidgetType {
  constructor(readonly rows: Row[]) {
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

  // Mouse events on links reach the editor's link handler (../commentLink.js);
  // the rest stay with the widget, e.g. to select its text.
  ignoreEvent(event: Event) {
    return !(event.target instanceof Element && event.target.closest(".cm-comment-link"));
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
    const widget = new OutputWidget(rows);
    widgets.push(Decoration.replace({widget, block: true}).range(first.from, last.to));
  }
  return Decoration.set(widgets);
}

/** The output widgets. They are block decorations, which only a state field can provide. */
export const outputWidgetField = StateField.define({
  create: createWidgets,
  update(widgets, tr) {
    const blocksChanged = tr.startState.field(blockMetadataField, false) !== tr.state.field(blockMetadataField, false);
    const linesChanged = tr.startState.field(outputLinesField) !== tr.state.field(outputLinesField);
    return tr.docChanged || blocksChanged || linesChanged ? createWidgets(tr.state) : widgets;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * The line numbers next to an output widget, one per row, each as high as
 * its row. Its line is worked out from where the widget is, not stored on the
 * widget, so the numbers follow lines inserted above unchanged output.
 */
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
    numbers.className = "cm-output-numbers";
    numbers.dataset.line = String(this.first);
    this.tight.forEach((tight, i) => {
      const div = document.createElement("div");
      div.className = tight ? "cm-output-number cm-tight" : "cm-output-number";
      div.textContent = String(this.first + i);
      numbers.appendChild(div);
    });
    return numbers;
  }
}

const outputLineNumbers = lineNumberWidgetMarker.of((view, widget, block) =>
  widget instanceof OutputWidget
    ? new OutputLineNumbers(view.state.doc.lineAt(block.from).number, widget.rows.map(isTight))
    : null,
);

/**
 * Rows have fixed heights, except error rows, which wrap. When a widget has
 * error rows, its line numbers take the rows' measured heights, so the
 * numbers below a wrapped error stay next to their rows.
 */
const wrappedLineNumbers = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {
      this.schedule();
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.geometryChanged || update.viewportChanged || update.heightChanged) {
        this.schedule();
      }
    }

    schedule() {
      if (!this.view.contentDOM.querySelector(".cm-output-widget .cm-error-line")) return;
      this.view.requestMeasure({
        key: this,
        read: (view) => this.read(view),
        write: (rows, view) => this.write(rows, view),
      });
    }

    read(view: EditorView) {
      const widgets: {line: number; heights: number[]}[] = [];
      for (const dom of Array.from(view.contentDOM.querySelectorAll<HTMLElement>(".cm-output-widget"))) {
        if (!dom.querySelector(".cm-error-line")) continue;
        const line = view.state.doc.lineAt(view.posAtDOM(dom)).number;
        const heights = Array.from(dom.children, (row: Element) => row.getBoundingClientRect().height / view.scaleY);
        widgets.push({line, heights});
      }
      return widgets;
    }

    write(widgets: {line: number; heights: number[]}[], view: EditorView) {
      for (const {line, heights} of widgets) {
        const numbers = view.dom.querySelector(`.cm-output-numbers[data-line="${line}"]`);
        if (!numbers || numbers.children.length !== heights.length) continue;
        heights.forEach((height, i) => {
          const number = numbers.children[i] as HTMLElement;
          const value = `${height}px`;
          if (number.style.height !== value) number.style.height = value;
        });
      }
    }
  },
);

// Copied output is plain text: its colours stay in the editor.
const plainCopy = EditorView.clipboardOutputFilter.of((text) => stripAnsi(text));

export const outputLines = outputLinesField.extension;

/** Output drawn as widgets, with their line numbers, copied without colours. */
export const outputDecoration: Extension = [outputWidgetField, outputLineNumbers, wrappedLineNumbers, plainCopy];
