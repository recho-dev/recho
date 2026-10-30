import {syntaxTree} from "@codemirror/language";
import {Decoration, ViewPlugin, EditorView} from "@codemirror/view";

const isWindows = navigator.userAgent.includes("Windows");

export const linkTitle = `Open in a new tab (${isWindows ? "Ctrl" : "Cmd"} + Click)`;

/** The http(s) links in `text`, without trailing punctuation: `{from, to, url}`. */
export function findLinks(text) {
  const links = [];
  // Match URLs, allowing common URL characters, then trim trailing punctuation.
  const httpRegex = /https?:\/\/[^\s\)\]\}]+/g;
  let m;
  while ((m = httpRegex.exec(text))) {
    // Trim trailing punctuation that shouldn't be part of URL.
    // These are common sentence/clause-ending punctuation.
    const url = m[0].replace(/[.,;:!?)\]}>]+$/, "");
    if (!url || url.length < 11) continue; // Minimum valid URL length.
    links.push({from: m.index, to: m.index + url.length, url});
  }
  return links;
}

// Create a decoration that marks links but keeps text selectable.
function createLinkDecoration(url) {
  return Decoration.mark({
    class: "cm-comment-link",
    attributes: {"data-url": url, title: linkTitle},
  });
}

export const commentLink = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.buildDeco(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDeco(update.view);
      }
    }

    buildDeco(view) {
      let decorations = [];
      let tree = syntaxTree(view.state);

      // Only iterate tree nodes that intersect with the viewport.
      for (const {from, to} of view.visibleRanges) {
        tree.iterate({
          from,
          to,
          enter: ({type, from, to}) => {
            if (type.name === "BlockComment" || type.name === "LineComment") {
              const text = view.state.doc.sliceString(from, to);
              for (const link of findLinks(text)) {
                decorations.push(createLinkDecoration(link.url).range(from + link.from, from + link.to));
              }
            }
          },
        });
      }

      return Decoration.set(decorations, true);
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

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
