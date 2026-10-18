/**
 * Navigation configuration for the docs section.
 * Defines the structure and grouping of documentation pages.
 */

export const docsNavConfig = [
  {
    type: "page",
    slug: "introduction",
  },
  {
    type: "page",
    slug: "getting-started",
  },
  {
    type: "group",
    title: "Features",
    items: [
      {
        type: "page",
        slug: "inline-echoing",
      },
      {
        type: "page",
        slug: "reactive-blocks",
      },
      {
        type: "page",
        slug: "animations-authoring",
      },
      {
        type: "page",
        slug: "aynchronous-operations",
      },
      {
        type: "page",
        slug: "libraries-imports",
      },
      {
        type: "page",
        slug: "errors-handling",
      },
      {
        type: "page",
        slug: "mlscript-notebooks",
      },
    ],
  },
  {
    type: "group",
    title: "MLscript Tour",
    items: [
      {
        type: "page",
        slug: "mlscript-basics",
      },
      {
        type: "page",
        slug: "mlscript-data",
      },
      {
        type: "page",
        slug: "mlscript-modules",
      },
      {
        type: "page",
        slug: "mlscript-interactive",
      },
      {
        type: "page",
        slug: "mlscript-errors",
      },
    ],
  },
  {
    type: "group",
    title: "API Reference",
    slug: "api-reference",
    items: [
      {
        type: "page",
        slug: "api-echo",
      },
      {
        type: "page",
        slug: "api-echo-key",
      },
      {
        type: "page",
        slug: "api-echo-clear",
      },
      {
        type: "page",
        slug: "api-echo-dispose",
      },
      {
        type: "page",
        slug: "api-state",
      },
      {
        type: "page",
        slug: "api-inspect",
      },
      {
        type: "page",
        slug: "api-now",
      },
      {
        type: "page",
        slug: "api-interval",
      },
      {
        type: "page",
        slug: "api-require",
      },
      {
        type: "page",
        slug: "api-toggle",
      },
      {
        type: "page",
        slug: "api-radio",
      },
      {
        type: "page",
        slug: "api-number",
      },
      {
        type: "page",
        slug: "api-button",
      },
    ],
  },
];
