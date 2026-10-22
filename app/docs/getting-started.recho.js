/**
 * @title Getting Started
 */

/**
 * ============================================================================
 * =                            Getting Started                               =
 * ============================================================================
 *
 * This page will quickly guide you through the core concepts of Recho. After
 * reading this, you will be able to create your own notebooks!
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                              Inline Echoing
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * Recho allows you to echo output inline with your code. This is useful for
 * quickly inspecting your variables and display the output as comments. Each
 * line of output is prefixed with `//➜`.
 *
 * To echo output, you can use the `echo` function:
 */

//➜ "Hello, World!"
echo("Hello, World!");

/**
 * The `echo` function returns the value as is, so you can define a echoing
 * variable like this:
 */

//➜ "Hello, World!"
const message = echo("Hello, World!");

/**
 * You can echo all kinds of values, including numbers, strings, arrays, objects,
 * functions, classes, maps, sets, dates, and more.
 */

//➜ [ 1, 2, 3 ]
const array = echo([1, 2, 3]);

//➜ { a: 1, b: 2 }
const object = echo({a: 1, b: 2});

//➜ [Function: add]
const foo = echo(function add(a, b) {
  return a + b;
});

/**
 * Refer to https://recho.dev/docs/inline-echoing for more details.
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                             Reactive Blocks
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * Blocks are the fundamentals of Recho's reactive system. Each top-level
 * statement is a block. The output always appears above the block. Once the
 * upstream blocks change, the downstream blocks will be re-evaluated.
 *
 * For example, if you update the value of `a`, then click the run button, `b`
 * will be re-evaluated.
 */

const a = 1;

//➜ 2
const b = echo(a + 1);

/**
 * A best practice is using **Block Statements** to group related blocks
 * together for complex echoing.
 */

//➜ "abcdefghij"
{
  let output = "";
  for (let i = 0; i < 10; i++) {
    output += String.fromCharCode(97 + i);
  }
  echo(output);
}

/**
 * Unlike vanilla JavaScript, you can define blocks in any order. Recho will
 * automatically execute the blocks in the correct order.
 */

//➜ "I'll be executed first!"
echo(c);

const c = "I'll be executed first!";

/**
 * !! NOTE: You should not use **let** to define top-level variables for now !!
 *
 * Refer to https://recho.dev/docs/reactive-blocks for more details.
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                             Animations Authoring
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * Recho provides two built-in functions to create fluid animations. The first
 * one is `recho.now()`, which returns a generator that yields the current time
 * continuously.
 */

const now = recho.now();

//➜ 1757422717279
echo(now);

/**
 * You can define a variable that depends on `now`. Once it changes, the
 * variable will be re-evaluated, resulting in a fluid animation.
 */

//➜ 7
const x = echo(Math.abs(~~(Math.sin(now / 1000) * 22)));

//➜ "~~~~~~~(๑•̀ㅂ•́)و✧"
echo("~".repeat(x) + "(๑•̀ㅂ•́)و✧");

/**
 * The second one is `recho.interval(milliseconds)`, which returns a generator
 * that yields values at a specified interval. For example, let's create a
 * counter:
 */

const counter = recho.interval(1000);

//➜ 4
echo(counter);

/**
 * Refer to https://recho.dev/docs/fluid-animation for more details.
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                         Interactive Input Controls
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * Recho provides interactive input controls that allow users to modify values
 * directly in the editor. These controls update the code as users interact
 * with them, making it easy to explore different parameter values.
 *
 * The `recho.toggle` function creates a checkbox control for boolean values:
 */

const showDetails = recho.toggle(true);

//➜ "Details: Enabled"
echo(`Details: ${showDetails ? "Enabled" : "Disabled"}`);

/**
 * The `recho.radio` function creates a radio button group for selecting from
 * multiple options:
 */

const theme = recho.radio(0, ["light", "dark", "auto"]);

//➜ "Current theme: light"
echo(`Current theme: ${theme}`);

/**
 * The `recho.number` function creates a number input with increment/decrement
 * buttons. You can specify constraints like min, max, and step:
 */

const rating = recho.number(5, {min: 1, max: 10, step: 0.5});

//➜ "Rating: ▓▓▓▓▓▒▒▒▒▒ (5/10)"
{
  const filled = "▓".repeat(Math.floor(rating));
  const empty = "▒".repeat(Math.floor(10 - rating));
  echo(`Speed: ${filled}${empty} (${rating}/10)`);
}

/**
 * These controls work seamlessly with Recho's reactive system. When you change
 * a control value, all dependent blocks are automatically re-evaluated:
 */

const size = recho.number(3, {min: 1, max: 8});

//➜ ⬛⬛⬛
//➜ ⬛⬛⬛
//➜ ⬛⬛⬛
{
  let grid = "";
  for (let i = 0; i < size; i++) {
    grid += "⬛".repeat(size) + "\n";
  }
  echo(grid.trimEnd());
}

/**
 * Interactive controls make it easy to experiment with your code and create
 * engaging, interactive notebooks.
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                           Asynchronous Operations
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * There are some asynchronous operations that you need to handle, such as
 * fetching data from an API, requiring external packages, or waiting for a
 * user action. These operations can be represented as promises in JavaScript.
 * In Recho, top-level await is supported.
 */

const string = await new Promise((resolve) => setTimeout(() => resolve("I'm a string!"), 1000));

//➜ "I'm a string!"
echo(string);

/**
 * If one of the upstream blocks is a promise, the downstream blocks will wait
 * for the promise to be resolved before being evaluated. For example, let's
 * fetch data from an mock API and post-process it.
 */

const numbers = new Promise((resolve) => setTimeout(() => resolve([1, 2, 3]), 1000));
const scale = 2;

//➜ 12
const sum = echo(numbers.reduce((a, b) => a + scale * b, 0));

/**
 * Refer to https://recho.dev/docs/asynchronous-operations for more details.
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                           Libraries Imports
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * Recho allows you to import external browser-based libraries using the
 * `recho.require` function. The import specifiers must be valid npm package
 * names with optional version specifiers.
 *
 * For example, let's import the `d3-array` package:
 */

const d3 = recho.require("d3-array");

//➜ [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
echo(d3.range(10));

/**
 * This is quite useful when you want to create something complex! Refer to
 * https://recho.dev/docs/libraries-requiring for more details.
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                           Errors Handling
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * Errors are echoed as normal output. For syntax errors, they will be
 * positioned at the start of the line where the error occurred. For runtime
 * errors, they will be positioned above the block that caused the error.
 */

//➜ { [TypeError: Assignment to constant variable.] [Symbol(next.console.error.digest)]: "NEXT_CONSOLE_ERROR" }
{
  const a = 1;
  a = 2;
}

/**
 * Refer to https://recho.dev/docs/errors-handling for more details.
 *
 *   ____                            _         _       _   _
 *  / ___|___  _ __   __ _ _ __ __ _| |_ _   _| | __ _| |_(_) ___  _ __  ___
 * | |   / _ \| '_ \ / _` | '__/ _` | __| | | | |/ _` | __| |/ _ \| '_ \/ __|
 * | |__| (_) | | | | (_| | | | (_| | |_| |_| | | (_| | |_| | (_) | | | \__ \
 *  \____\___/|_| |_|\__, |_|  \__,_|\__|\__,_|_|\__,_|\__|_|\___/|_| |_|___/
 *                   |___/
 *
 * You've already mastered the basics of Recho! We highly recommend you to go
 * to the editor: https://recho.dev and start creating your own notebooks!
 *
 * If you need inspiration, you can check out the examples page:
 * https://recho.dev/explore to see what you can create with Recho.
 *
 * Of course, we'll not stop you if you want to dive into the details of Recho.
 *
 * Hackers and painters, let's paint by code!
 */
