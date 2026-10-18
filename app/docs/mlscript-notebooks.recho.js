/**
 * @title MLscript Notebooks
 */

/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                             MLscript Notebooks
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * Besides JavaScript, you can write notebooks in MLscript
 * (https://github.com/hkust-taco/mlscript). To start one, open a new notebook,
 * pick "MLscript" in the language picker next to "Create", and click Create.
 * The MLscript compiler is downloaded only when you open an MLscript notebook.
 *
 * Each top-level definition is a reactive block, just like in JavaScript.
 * Blocks are separated by blank lines, and a block runs again when a value it
 * uses changes. Things that must be defined together go in the same block:
 * a class and its companion module, or mutually recursive functions.
 *
 *   class Point(val x: Int, val y: Int) with
 *     fun norm1 = x + y
 *   module Point with
 *     fun origin = Point(0, 0)
 *
 *   fun even(n) = if n == 0 then true else odd(n - 1)
 *   fun odd(n) = if n == 0 then false else even(n - 1)
 *
 * `echo` works as in JavaScript. Its output is shown above the block as lines
 * starting with `//➜`, which are MLscript comments:
 *
 *   //➜ Point(3, 4) 7
 *   echo(Point(3, 4), Point(3, 4).norm1)
 *
 * The standard library is available as `recho`. `recho.interval`,
 * `recho.now`, `recho.state` and `recho.inspect` work as usual. For state,
 * bind the pair first, then use `.0` for the value and `.1` for the setter:
 *
 *   val st = recho.state(0)
 *   val count = st.0
 *   val setCount = st.1
 *
 * Controls such as `recho.number`, `recho.toggle` and `recho.radio` return
 * their value, but don't show inline widgets in MLscript notebooks yet.
 *
 * MLscript's own standard library is imported from `std/`:
 *
 *   import "std/Option.mls"
 *
 *   echo(Option.Some(1))
 *
 * See the MLscript examples on https://recho.dev/examples for more.
 */
