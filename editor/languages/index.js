/**
 * Editor extensions for a language other than JavaScript, loaded on demand
 * like the language itself (see ../../runtime/languages.js). JavaScript's are
 * set up in ../index.js.
 */
export async function loadLanguageSupport(id) {
  if (id === "wenyan") return (await import("./wenyan.js")).wenyanSupport();
  return [];
}
