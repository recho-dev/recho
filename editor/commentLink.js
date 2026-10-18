import {syntaxTree} from "@codemirror/language";
import {Decoration, ViewPlugin, EditorView} from "@codemirror/view";

const isWindows = navigator.userAgent.includes("Windows");

// Create a decoration that marks links but keeps text selectable.
function createLinkDecoration(url) {
  return Decoration.mark({
    class: "cm-comment-link",
    attributes: {
      "data-url": url,
      title: `Open in a new tab (${isWindows ? "Ctrl" : "Cmd"} + Click)`,
    },
  });
}

// Decorations for the URLs in the comments of the visible ranges. `comments`
// gives the `{from, to}` ranges of the comments between `from` and `to`.
function linkDecorations(view, comments) {
  let decorations = [];
  for (const {from: viewFrom, to: viewTo} of view.visibleRanges) {
    for (const {from, to} of comments(view.state, viewFrom, viewTo)) {
      const text = view.state.doc.sliceString(from, to);
      // Match URLs, allowing common URL characters, then trim trailing punctuation.
      let httpRegex = /https?:\/\/[^\s\)\]\}]+/g;
      let m;
      while ((m = httpRegex.exec(text))) {
        let url = m[0];
        // Trim trailing punctuation that shouldn't be part of URL.
        // These are common sentence/clause-ending punctuation.
        url = url.replace(/[.,;:!?)\]}>]+$/, "");
        if (!url || url.length < 11) continue; // Minimum valid URL length.
        const tagStart = from + m.index;
        const tagEnd = tagStart + url.length;
        if (tagEnd >= from && tagStart <= to) {
          decorations.push(createLinkDecoration(url).range(tagStart, tagEnd));
        }
      }
    }
  }
  return Decoration.set(decorations, true);
}

/**
 * Marks the URLs in comments as links, for a language whose comments are
 * found by `comments(state, from, to)`. `changed(update)` tells whether
 * the comments may have changed besides the document and the viewport.
 */
export function commentLinksFor(comments, changed = () => false) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = linkDecorations(view, comments);
      }

      update(update) {
        if (update.docChanged || update.viewportChanged || changed(update)) {
          this.decorations = linkDecorations(update.view, comments);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}

// The comments of a language with a Lezer syntax tree (JavaScript).
function lezerComments(state, from, to) {
  const comments = [];
  // Only iterate tree nodes that intersect with the viewport.
  syntaxTree(state).iterate({
    from,
    to,
    enter: ({type, from, to}) => {
      if (type.name === "BlockComment" || type.name === "LineComment") comments.push({from, to});
    },
  });
  return comments;
}

export const commentLink = commentLinksFor(lezerComments);

// Handle clicks and cursor updates on comment links.
export const commentLinkClickHandler = EditorView.domEventHandlers({
  mousedown(event) {
    const target = event.target.closest?.(".cm-comment-link");
    if (!target) return false;
    const url = target.getAttribute("data-url");
    if (!url) return false;
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      // Notify the runtime to resume running.
      window.dispatchEvent(new Event("openlink"));
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    }
    return false;
  },
  mousemove(event) {
    const element = event.target;
    const isCmdHeld = event.metaKey || event.ctrlKey;
    const target = element?.closest?.(".cm-comment-link");
    if (!target) return false;
    if (isCmdHeld) target.classList.add("cmd-clickable");
    else target.classList.remove("cmd-clickable");
    return false;
  },
});
