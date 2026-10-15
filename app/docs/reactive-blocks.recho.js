/**
 * @title Reactive Blocks
 */

/**
 * ============================================================================
 * =                            Reactive Blocks                               =
 * ============================================================================
 *
 * Reactive blocks are the fundamentals of Recho's reactive system, which is
 * built on the reactive model of Observable Notebook Kit[1].
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                            Top-level Statements
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * Each top-level statement is a block, such as Variable Declaration,
 * ExpressionStatement, ForStatement, IfStatement, and more. The output of a
 * block always appears above the block.
 */

//➜ 1
const declaration = echo(1);

//➜ 0.13787417441979044
echo(Math.random());

//➜ 0
//➜ 1
//➜ 2
for (let i = 0; i < 3; i++) echo(i);

//➜ "Odd"
if (Date.now() % 2 === 0) echo("Even");
else echo("Odd");

/**
 * A best practice is using **Block Statements** to group related blocks to
 * have a single output. Let's say we want to generate alphabets from "a" to
 * "z" and then echo them. We can do this:
 */

//➜ "abcdefghijklmnopqrstuvwxyz"
{
  let output = "";
  for (let i = 0; i < 26; i++) output += String.fromCharCode(97 + i);
  echo(output);
}

/**
 * If you need a non-echoing top-level variable computed this way, you can
 * also use an IIFE (Immediately Invoked Function Expression) to create a
 * block and return the variable, or use a top-level `let` (see below).
 */

const alphabet = (() => {
  let output = "";
  for (let i = 0; i < 26; i++) output += String.fromCharCode(97 + i);
  return output;
})();

//➜ "abcdefghijklmnopqrstuvwxyz"
echo(alphabet);

/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                             Reactive Data Flow
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * All the blocks run automatically like running a vanilla JavaScript script.
 * The difference is that blocks in Recho run in topological order determined
 * by top-level variable references (a.k.a. **dataflow**), rather than the
 * top-down document order[2].
 *
 * For example, we have three blocks: `sum`, `a`, and `b` in top-down order.
 * Since `sum` depends on `a` and `b`, it will be evaluated after `a` and `b`.
 */

//➜ 3
const sum = echo(a + b);
const a = 1;
const b = 2;

/**
 * Since code (blocks) runs independent of its order in notebook, you can
 * arrange code however you want.
 *
 * In addition to that, when a block (`const sum = echo(a + b)`) references
 * top-level variables (`a` and `b`) defined by other blocks, the referencing
 * block automatically runs after the defining blocks. For example, you can
 * change the value of `a` or `b` and click ▶️ button to see the updated value
 * of `sum`.
 *
 * Note that all the evaluation of blocks is **incremental**, which means that
 * only the blocks that are affected by the changes will be re-evaluated. For
 * example, if you change the constant value from `1` to `2` and click ▶️
 * button, the `random` block will still display the same random value.
 */

//➜ 1
const constant = echo(1);

//➜ 0.6058679147506848
const random = echo(Math.random());

/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                              Top-level `let`
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * A variable declared with a top-level `let` can be changed by other blocks.
 * Blocks that read it re-run whenever it changes.
 */

let letters = "";

for (let i = 0; i < 5; i++) letters += String.fromCharCode(97 + i);

//➜ "abcde"
echo(letters);

/**
 * Changes can also happen later, for example from a timer or a button. Click
 * the button to see the count go up.
 */

let clicks = 0;

recho.button("Click me!", () => clicks++);

//➜ 0
echo(clicks);

/**
 * A few rules keep this predictable:
 *
 * - A block "changes" a variable when it assigns to it, or uses a function
 *   that does: with `function addClick() { clicks++; }`, a block calling
 *   `addClick()` changes `clicks` too.
 * - Blocks that change a variable run in document order, and blocks reading
 *   it see the value after all of them ran, like in a plain script.
 * - Editing the `let` or a block that changes the variable re-runs all of
 *   them, so the variable starts over from its initial value.
 * - A block that changes a variable doesn't re-run when the variable changes
 *   (otherwise it would re-run itself forever). Put reads that should stay up
 *   to date in their own block, like `echo(clicks)` above.
 * - When a block that changes a variable re-runs because something else it
 *   reads changed, such as `recho.interval`, it changes the variable again,
 *   starting from the current value. Other blocks that change it don't re-run.
 *   Use this to accumulate values over time.
 * - A block can't read a variable and also change it, for example by calling
 *   a function that changes it: `echo(clicks, addClick())`. Split it into two
 *   blocks. This is only caught when the change happens right away: a block
 *   that reads `clicks` and changes it later, say in `setTimeout`, re-runs on
 *   every change.
 * - Changing an object in place, like `list.push(1)`, doesn't notify other
 *   blocks. Assign it again (`list = list`) to notify them.
 */

/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                            "Cleaning Up" Block
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * With reactive evaluation, blocks can run multiple times. If you need to
 * "clear up" a block, say to cancel an animation loop or close a socket, use
 * echo.dispose to register a disposal hook.
 */

//➜ 9
{
  let count = echo(10);

  const timer = setInterval(() => {
    if (count-- <= 0) clearInterval(timer);
    else {
      echo.clear();
      echo(count);
    }
  }, 1000);

  // Clear the interval when the block is re-run.
  echo.dispose(() => clearInterval(timer));
}

/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                                References
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * - [1] Observable Notebook Kit: https://github.com/observablehq/notebook-kit
 * - [2] Observable Framework: https://observablehq.com/framework/reactivity
 */
