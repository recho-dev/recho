/**
 * Editor extensions for a language other than JavaScript, loaded on demand
 * like the language itself (see ../../runtime/languages/index.js): either
 * the extensions, or a function from the editor's runtime ref to them for
 * languages with controls. JavaScript's (./javascript.js) need the runtime
 * too, so ../index.js sets them up.
 */
export async function loadLanguageSupport(id) {
  if (id === "wenyan") return (await import("./wenyan.js")).wenyanSupport();
  if (id === "mlscript") return (await import("./mlscript.js")).mlscriptSupport();
  return [];
}
