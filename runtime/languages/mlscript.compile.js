/**
 * The MLscript compiler's notebook session, as used by ./mlscript.js: in a
 * worker (./mlscript.worker.js) in the browser, or in the same thread where
 * there are no workers (tests). Results are plain data, so that they can be
 * posted from a worker.
 */

import {createReplSession} from "@mlscript/recho";

const diagnostic = ({kind, source, message, locations}) => ({
  kind,
  source,
  message,
  locations: locations.map(({message, range}) => ({message, range: range && {start: range.start, end: range.end}})),
});

const requiredImport = ({name, source}) => ({name, source: {...source}});

/**
 * A compiler of successive versions of a document: `update(source)` returns
 * `{nodes, requiredImports, diagnostics}`.
 */
export function createCompiler() {
  let session = createReplSession();
  return {
    update(source) {
      let result;
      try {
        result = session.update(source);
      } catch (error) {
        // The session may be left inconsistent; start a new one.
        session = createReplSession();
        throw error;
      }
      return {
        nodes: result.nodes.map((node) => ({
          key: node.key,
          start: node.start,
          end: node.end,
          inputs: [...node.inputs],
          outputs: [...node.outputs],
          hiddenOutputs: [...node.hiddenOutputs],
          imports: node.imports.map(requiredImport),
          body: node.body,
          diagnostics: node.diagnostics.map(diagnostic),
        })),
        requiredImports: result.requiredImports.map(requiredImport),
        diagnostics: result.diagnostics.map(diagnostic),
      };
    },
  };
}
