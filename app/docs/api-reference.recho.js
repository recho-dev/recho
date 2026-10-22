/**
 * @title API Reference
 */

/**
 * ============================================================================
 * =                            API Reference                                =
 * ============================================================================
 *
 * Recho provides a set of APIs to help you create reactive notebooks and
 * interactive visualizations. This page provides an overview of all available
 * APIs.
 *
 * Click on any API below to see detailed documentation and examples.
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                                Core APIs
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * - echo(...values) - Echo values inline with your code as comments (https://recho.dev/docs/api-echo)
 * - echo.clear() - Clear the output of the current block (https://recho.dev/docs/api-echo-clear)
 * - echo.key(key) - Specify a key for the following output values (https://recho.dev/docs/api-echo-key)
 * - echo.dispose(callback) - Register a disposal callback before re-running the current block (https://recho.dev/docs/api-echo-dispose)
 * - recho.state(value) - Create reactive state variables for mutable values (https://recho.dev/docs/api-state)
 * - recho.inspect(value[, options]) - Format values for inspection (https://recho.dev/docs/api-inspect)
 * - recho.md`markdown` - Render Markdown as coloured text (https://recho.dev/docs/api-md)
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                                 Inputs
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * - recho.toggle(value) - Interactive toggle (checkbox) control (https://recho.dev/docs/api-toggle)
 * - recho.radio(index, options) - Interactive radio button group (https://recho.dev/docs/api-radio)
 * - recho.number(value[, options]) - Interactive number input control (https://recho.dev/docs/api-number)
 * - recho.button(label[, id], callback) - Interactive button control (https://recho.dev/docs/api-button)
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                               Generators
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * - recho.now() - Generator that yields the current time continuously (https://recho.dev/docs/api-now)
 * - recho.interval(milliseconds) - Generator that yields values at intervals (https://recho.dev/docs/api-interval)
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                                Helpers
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * - recho.require(...names) - Import JavaScript packages from npm (https://recho.dev/docs/api-require)
 */
