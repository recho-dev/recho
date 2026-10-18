// What the editor shows when a notebook's language fails to load.
import {it, expect, vi, afterEach} from "vitest";
import {act} from "react";
import {createRoot} from "react-dom/client";
import {Editor} from "../app/Editor.jsx";

const {loadLanguage, createEditor} = vi.hoisted(() => ({loadLanguage: vi.fn(), createEditor: vi.fn()}));
vi.mock("../runtime/languages/index.js", () => ({loadLanguage}));
vi.mock("../editor/languages/index.js", () => ({loadLanguageSupport: async () => []}));
vi.mock("../editor/index.js", () => ({createEditor}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

it("shows the code read-only and retries loading the language", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  loadLanguage.mockRejectedValueOnce(new Error("The MLscript compiler failed: it didn't load."));
  loadLanguage.mockResolvedValue({id: "mlscript"});
  createEditor.mockReturnValue({on() {}, run() {}, stop() {}, destroy() {}});
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const code = "let a = 1\n\necho(a)\n";
  await act(async () => root.render(<Editor initialCode={code} runtime="mlscript@0.1.0" />));

  expect(container.textContent).toContain(
    "Couldn't load this notebook's language: The MLscript compiler failed: it didn't load.",
  );
  const shown = [...container.querySelectorAll("pre")].find((pre) => !pre.classList.contains("hidden"));
  expect(shown.textContent).toBe(code);
  expect(createEditor).not.toHaveBeenCalled();

  const retry = [...container.querySelectorAll("button")].find((button) => button.textContent === "Retry");
  await act(async () => retry.click());
  expect(loadLanguage).toHaveBeenCalledTimes(2);
  expect(createEditor).toHaveBeenCalledTimes(1);
  expect(container.textContent).not.toContain("Couldn't load");
  await act(async () => root.unmount());
});
