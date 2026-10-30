import {ViewPlugin, ViewUpdate, EditorView} from "@codemirror/view";
import {blockMetadataField} from "./state.ts";
import {supportedTypefaces, loadFont, isFontLoaded} from "./fonts.ts";

/**
 * Loads the typefaces that blocks ask for with `@typeface`. The output
 * widgets (see ./output.ts) set `@compact` and `@typeface` rows themselves.
 */
export const compactDecoration = ViewPlugin.fromClass(
  class {
    #loadingFonts = new Set<string>();
    #view: EditorView;

    constructor(view: EditorView) {
      this.#view = view;
      this.loadFonts();
    }

    update(update: ViewUpdate) {
      if (update.startState.field(blockMetadataField, false) !== update.state.field(blockMetadataField, false)) {
        this.loadFonts();
      }
    }

    loadFonts() {
      for (const {output, attributes} of this.#view.state.field(blockMetadataField, false) ?? []) {
        if (output === null || typeof attributes.typeface !== "string") continue;
        const typeface = attributes.typeface;
        if (!supportedTypefaces.has(typeface) || isFontLoaded(typeface) || this.#loadingFonts.has(typeface)) continue;
        this.#loadingFonts.add(typeface);
        loadFont(typeface)
          .then(() => {
            this.#loadingFonts.delete(typeface);
            // Remeasure the output now that the font has loaded.
            this.#view.requestMeasure();
          })
          .catch(() => {
            this.#loadingFonts.delete(typeface);
          });
      }
    }
  },
);
