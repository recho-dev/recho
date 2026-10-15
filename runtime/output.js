import {groups, max} from "d3-array";
import {getBorderCharacters, table} from "table";
import {ERROR_MARK, OUTPUT_MARK} from "./constant.js";
import {Inspector} from "./stdlib/inspect.js";

export const OUTPUT_PREFIX = `//${OUTPUT_MARK}`;

export const ERROR_PREFIX = `//${ERROR_MARK}`;

function isError(value) {
  return value instanceof Error;
}

/**
 * How a language writes output into its code: the output and error prefixes,
 * how one line of output is written, and how a value is displayed. This is
 * JavaScript's; other languages provide their own (see ./languages/index.js).
 */
export const JAVASCRIPT_OUTPUT = {
  outputPrefix: OUTPUT_PREFIX,
  errorPrefix: ERROR_PREFIX,
  formatLine: (prefix, line) => `${prefix} ${line}`,
  inspect: (value, options) => new Inspector(value, options),
};

export function addPrefix(string, prefix, formatLine = JAVASCRIPT_OUTPUT.formatLine) {
  const lines = string.split("\n");
  return lines.map((line) => formatLine(prefix, line)).join("\n");
}

function withTable(groups) {
  return groups.length > 1 || groups[0][0] !== undefined;
}

function columns(data, options) {
  const values = data[0].slice(1);
  let output = "";
  for (let i = 0; i < values.length; i++) {
    output += values[i];
    output += i < values.length - 1 ? "\n" : "";
  }
  return output;
}

function padStringWidth(string) {
  const lines = string.split("\n");
  const maxLength = max(lines, (line) => line.length);
  return lines.map((line) => line.padEnd(maxLength)).join("\n");
}

function padStringHeight(string, height) {
  const lines = string.split("\n");
  const diff = height - lines.length;
  return lines.join("\n") + "\n".repeat(diff);
}

function merge(...strings) {
  const maxHeight = max(strings, (string) => string.split("\n").length);
  const aligned = strings
    .map((string) => padStringHeight(string, maxHeight))
    .map((string) => padStringWidth(string))
    .map((string) => string.split("\n"));
  let output = "";
  for (let i = 0; i < maxHeight; i++) {
    for (let j = 0; j < aligned.length; j++) {
      const line = aligned[j][i];
      output += line;
      output += j < aligned.length - 1 ? " " : "";
    }
    output += i < maxHeight - 1 ? "\n" : "";
  }
  return output;
}

export function makeOutput(values, outputFormat = JAVASCRIPT_OUTPUT) {
  // Group values by key. Each group is a row if using table, otherwise a column.
  const groupValues = groups(values, (v) => v.options?.key);

  // We need to remove the trailing newline for table.
  const format = withTable(groupValues) ? (...V) => table(...V).trimEnd() : columns;

  // If any value is an error, set the error flag.
  let error = false;

  // Create a table to store the formatted values.
  const data = [];

  for (const [key, V] of groupValues) {
    const values = V.map((v) => v.values);

    // Format the key as a header for table.
    const row = ["{" + key + "}"];

    for (let i = 0; i < values.length; i++) {
      const line = values[i];
      const n = line.length;

      // Each cell can have multiple values. Format each value as a string.
      const items = line.map((v) => {
        if (isError(v)) error = true;

        // Disable string quoting for multi-value outputs to improve readability.
        // Example: echo("a =", 1) produces "a = 1" instead of "a = "1""
        const options = n === 1 ? {} : {quote: false};
        const inspector = v instanceof Inspector ? v : outputFormat.inspect(v, options);
        return inspector.format();
      });

      // Merge all formatted values into a single cell.
      row.push(merge(...items));
    }

    data.push(row);
  }

  // Format the table into a single string and add prefix.
  const formatted = format(data, {
    border: getBorderCharacters("ramac"),
    columnDefault: {alignment: "right"},
  });
  const prefixed = addPrefix(
    formatted,
    error ? outputFormat.errorPrefix : outputFormat.outputPrefix,
    outputFormat.formatLine,
  );

  return {output: prefixed, error};
}
