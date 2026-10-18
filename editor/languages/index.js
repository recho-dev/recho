/**
 * Editor extensions for a language other than JavaScript, loaded on demand
 * like the language itself (see ../../runtime/languages/index.js).
 * JavaScript's (./javascript.js) need the editor's runtime, so ../index.js
 * sets them up.
 */
export async function loadLanguageSupport(id) {
  if (id === "wenyan") return (await import("./wenyan.js")).wenyanSupport();
  if (id === "mlscript") return (await import("./mlscript.js")).mlscriptSupport();
  return [];
}
