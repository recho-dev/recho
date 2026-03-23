"use client";

import {useRef, useEffect, useCallback} from "react";
import {EditorView, basicSetup} from "codemirror";
import {EditorState} from "@codemirror/state";
import {javascript} from "@codemirror/lang-javascript";
import {githubLightInit} from "@uiw/codemirror-theme-github";
import {tags as t} from "@lezer/highlight";
import {Decoration, ViewPlugin} from "@codemirror/view";
import {StateField, RangeSetBuilder} from "@codemirror/state";

// Replicate the output line decoration from the main editor.
// We detect lines starting with //➜ or //✗ and apply CSS classes.
const OUTPUT_MARK = "➜";
const ERROR_MARK = "✗";
const OUTPUT_MARK_CP = OUTPUT_MARK.codePointAt(0);
const ERROR_MARK_CP = ERROR_MARK.codePointAt(0);

function computeOutputLines(state) {
  const lines = [];
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const text = line.text;
    // Check for //➜ or //✗ pattern
    if (text.length >= 3 && text[0] === "/" && text[1] === "/") {
      const cp = text.codePointAt(2);
      if (cp === OUTPUT_MARK_CP) {
        lines.push({from: line.from, type: "output"});
      } else if (cp === ERROR_MARK_CP) {
        lines.push({from: line.from, type: "error"});
      }
    }
  }
  return lines;
}

const outputLinesField = StateField.define({
  create(state) {
    return computeOutputLines(state);
  },
  update(value, tr) {
    return tr.docChanged ? computeOutputLines(tr.state) : value;
  },
});

const highlightDeco = Decoration.line({attributes: {class: "cm-output-line"}});
const errorDeco = Decoration.line({attributes: {class: "cm-output-line cm-error-line"}});

const outputDecoration = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.build(view.state.field(outputLinesField));
    }

    update(update) {
      this.decorations = this.build(update.state.field(outputLinesField));
    }

    build(lines) {
      const builder = new RangeSetBuilder();
      for (const {from, type} of lines) {
        builder.add(from, from, type === "error" ? errorDeco : highlightDeco);
      }
      return builder.finish();
    }
  },
  {decorations: (v) => v.decorations},
);

/**
 * A read-only CodeMirror editor for replaying evaluation task recordings.
 *
 * @param {Object} props
 * @param {string} props.doc - The document content to display
 * @param {number|null} [props.scrollToPos] - Character position to scroll into view
 * @param {string} [props.className] - Additional CSS class names
 */
export function ReplayEditor({doc, scrollToPos, className}) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);

  // Create the editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: doc || "",
      extensions: [
        basicSetup,
        javascript(),
        githubLightInit({
          styles: [
            {tag: [t.variableName], color: "#1f2328"},
            {tag: [t.function(t.variableName)], color: "#6f42c1"},
          ],
        }),
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
        EditorView.lineWrapping,
        EditorView.theme({
          "&": {
            fontSize: "14px",
            fontFamily: '"Spline Sans Mono Variable", "Box Drawing Fallback", monospace',
          },
          ".cm-content": {whiteSpace: "pre"},
          ".cm-line": {wordWrap: "normal"},
          ".cm-cursor": {display: "none !important"},
          // Output line styles matching the main editor
          "&.cm-editor": {
            "--output-border-color": "#19130029",
            "--output-content-color": "#21201c",
          },
          ".cm-output-line:first-child, :not(.cm-output-line) + .cm-output-line": {
            borderTop: "1px dashed var(--output-border-color)",
          },
          ".cm-output-line:last-child, .cm-output-line:not(:last-child):not(:has(+ .cm-output-line))": {
            borderBottom: "1px dashed var(--output-border-color)",
          },
          ".cm-output-line": {
            lineHeight: "1.25",
            borderLeft: "1px dashed var(--output-border-color)",
          },
          ".cm-output-line.cm-error-line": {
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4' %3E%3Cpath fill='%23ff0000' fill-opacity='0.4' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E\")",
          },
          ".cm-output-line.cm-error-line span": {
            color: "#c83f30 !important",
          },
        }),
        outputLinesField.extension,
        outputDecoration,
      ],
    });

    const view = new EditorView({state, parent: containerRef.current});
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update document content when doc prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc === doc) return;

    view.dispatch({
      changes: {from: 0, to: currentDoc.length, insert: doc || ""},
    });
  }, [doc]);

  // Scroll to position when scrollToPos changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || scrollToPos == null) return;

    const pos = Math.min(scrollToPos, view.state.doc.length);
    view.dispatch({
      effects: EditorView.scrollIntoView(pos, {y: "center"}),
    });
  }, [scrollToPos, doc]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{maxHeight: "24rem", overflow: "auto"}}
    />
  );
}
