import objectInspector from "object-inspect";

function isMultiline(value) {
  const isString = typeof value === "string";
  if (!isString) return false;
  const lines = value.split("\n");
  return lines.length > 1;
}

/** `string` with lines longer than `width` broken at spaces (or anywhere, if a word is longer). */
function wrap(string, width) {
  return string
    .split("\n")
    .flatMap((line) => {
      const lines = [];
      while (line.length > width) {
        const space = line.lastIndexOf(" ", width);
        const cut = space > 0 ? space : width;
        lines.push(line.slice(0, cut).trimEnd());
        line = line.slice(cut).trimStart();
      }
      lines.push(line);
      return lines;
    })
    .join("\n");
}

function inspector(value, {limit = 200, quote = "double", indent = null} = {}) {
  if (isMultiline(value)) return value;
  if (typeof value === "string" && !quote) return value;
  if (!quote) quote = "double";
  const string = objectInspector(value, {indent, quoteStyle: quote});
  // An error isn't cut short, but wrapped: its message is all the user has.
  if (value instanceof Error) return wrap(string, limit);
  if (string.length > limit) return string.slice(0, limit) + "…";
  return string;
}

export class Inspector {
  constructor(value, options = {}) {
    this.value = value;
    this.options = options;
  }
  format() {
    return inspector(this.value, this.options);
  }
}

export function inspect(value, options) {
  return new Inspector(value, options);
}
