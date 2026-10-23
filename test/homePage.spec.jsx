// What "/" shows: the home page when logged in, a new notebook when logged out.
import {it, expect, vi, beforeEach, afterEach} from "vitest";
import {act} from "react";
import {createRoot} from "react-dom/client";

const auth = vi.hoisted(() => {
  const listeners = new Set();
  let state = {user: null, loading: true};
  return {
    set(patch) {
      state = {...state, ...patch};
      for (const listener of listeners) listener();
    },
    store: {
      subscribe: (listener) => (listeners.add(listener), () => listeners.delete(listener)),
      getSnapshot: () => state,
      getServerSnapshot: () => state,
    },
  };
});
const api = vi.hoisted(() => ({getNotebooks: vi.fn(), getPublicNotebooks: vi.fn()}));

vi.mock("../app/auth.js", () => ({authStore: auth.store, ensureUser: vi.fn()}));
vi.mock("../app/api.js", () => ({
  ...api,
  starterContent: (runtime) => `// ${runtime}`,
  VISIBILITIES: [
    {value: "private", label: "Private"},
    {value: "public", label: "Public"},
  ],
}));
vi.mock("../app/EditorPage.jsx", () => ({EditorPage: () => <p>Editor</p>}));
vi.mock("../app/ThumbnailClient.js", () => ({ThumbnailClient: () => null}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn()})}));
vi.mock("next/link", () => ({
  default: ({href, children, ...props}) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const {default: Page} = await import("../app/page.jsx");
const {countStore} = await import("../app/store.js");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const USER = {uid: "me"};
const notebook = (i, extra = {}) => ({
  id: `n${i}`,
  title: `Notebook ${i}`,
  content: "echo(1)",
  runtime: "javascript@0.1.0",
  visibility: "private",
  created: "2026-10-01T00:00:00.000Z",
  updated: "2026-10-02T00:00:00.000Z",
  ...extra,
});

let container, root;

beforeEach(() => {
  auth.set({user: null, loading: true});
  api.getNotebooks.mockResolvedValue([]);
  api.getPublicNotebooks.mockResolvedValue([]);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

const render = () => act(async () => root.render(<Page />));
const links = () => [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));

it("shows nothing until auth is known, then the editor when logged out", async () => {
  await render();
  expect(container.textContent).toBe("");
  await act(async () => auth.set({loading: false}));
  expect(container.textContent).toBe("Editor");
});

it("shows templates, recent notebooks and the community's when logged in", async () => {
  api.getNotebooks.mockResolvedValue(Array.from({length: 12}, (_, i) => notebook(i)));
  api.getPublicNotebooks.mockResolvedValue([
    notebook("mine", {ownerId: "me", visibility: "public"}),
    ...Array.from({length: 6}, (_, i) => notebook(`p${i}`, {ownerId: "them", visibility: "public"})),
  ]);
  auth.set({user: USER, loading: false});
  await render();

  expect(container.textContent).not.toContain("Editor");
  expect(links()).toEqual(
    expect.arrayContaining(["/new?lang=javascript", "/new?lang=wenyan", "/new?lang=mlscript", "/works"]),
  );
  // Ten of twelve (two rows of five), newest first as getNotebooks returns them.
  const recent = [...container.querySelectorAll("[aria-labelledby=home-recent] ul a")].map((a) =>
    a.getAttribute("href"),
  );
  expect(recent).toEqual(Array.from({length: 10}, (_, i) => `/works/n${i}`));
  expect(container.textContent).toContain("12 in all");
  // One row of other people's notebooks; the user's own public one is left out.
  const community = [...container.querySelectorAll("#home-community")].length;
  expect(community).toBe(1);
  expect(links()).not.toContain("/works/nmine");
  expect(links().filter((href) => /^\/works\/np/.test(href))).toHaveLength(5);
});

it("hides the community row when there is nothing to show", async () => {
  api.getPublicNotebooks.mockRejectedValue(new Error("offline"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.set({user: USER, loading: false});
  await render();
  expect(container.textContent).toContain("No notebooks yet");
  expect(container.querySelector("#home-community")).toBeNull();
});

it("keeps a notebook started while logged out open after logging in", async () => {
  auth.set({loading: false});
  await render();
  expect(container.textContent).toBe("Editor");
  await act(async () => auth.set({user: USER}));
  expect(container.textContent).toBe("Editor");
  // The wordmark goes back to the home page.
  await act(async () => countStore.increment());
  expect(container.textContent).toContain("Start a new notebook");
});
