/**
 * @title recho.state(value)
 */

/**
 * ============================================================================
 * =                           recho.state(value)                            =
 * ============================================================================
 *
 * Creates a reactive state variable that can be mutated over time. This is
 * similar to React's useState hook and enables mutable reactive values that
 * automatically trigger re-evaluation of dependent blocks when changed.
 *
 * For most cases, a top-level `let` is simpler: assign to it from any block
 * and the blocks reading it re-run. See "Top-level `let`" in Reactive Blocks.
 *
 * @param {any} value - The initial state value.
 * @returns {[any, Function, Function]} A tuple containing:
 *   - state: The reactive state value that can be read directly
 *   - setState: Function to update the state (accepts value or updater function)
 *   - getState: Function to get the current state value
 */

// Basic counter that increments after 1 second
const [count1, setCount1] = recho.state(0);

setTimeout(() => {
  setCount1(count1 => count1 + 1);
}, 1000);

//➜ 1
echo(count1);

// Timer that counts down from 10
const [timer, setTimer] = recho.state(10);

{
  const interval = setInterval(() => {
    setTimer(t => {
      if (t <= 0) {
        clearInterval(interval);
        return 0;
      }
      return t - 1;
    });
  }, 1000);

  echo.dispose(() => clearInterval(interval));
}

//➜ 8
echo(`Time remaining: ${timer}s`);

// State can be updated with a direct value
const [message, setMessage] = recho.state("Hello");

setTimeout(() => {
  setMessage("Hello, World!");
}, 2000);

//➜ "Hello, World!"
echo(message);

// Multiple states can be used together
const [firstName, setFirstName] = recho.state("John");
const [lastName, setLastName] = recho.state("Doe");

setTimeout(() => {
  setFirstName("Jane");
  setLastName("Smith");
}, 1500);

//➜ "Jane Smith"
echo(`${firstName} ${lastName}`);

