// Task 7: Toggle and Radio Controls
// The first few parts are worked out for you.
// Complete the remaining parts by uncommenting, reproducing, or writing new code.

// 1. recho.toggle creates a checkbox control that returns true or false.
//    Click the checkbox to flip the value.
//
// Try clicking the checkbox that appears. Watch the echoed value change.

{
  const enabled = recho.toggle(true);
  echo(enabled);
}

// ----------------------------------------------------------------------------

// 2. Since the toggle returns a boolean, you can use it with an if/else to
//    control what gets displayed.
//
// Uncomment the block below, save, and try toggling the checkbox.

// {
//   const showGreeting = recho.toggle(true);
//   if (showGreeting) {
//     echo("Hello!");
//   } else {
//     echo("Goodbye!");
//   }
// }

// ----------------------------------------------------------------------------

// 3. recho.radio creates a group of radio buttons for picking one option from
//    a list. The first argument is the default index (0-based), and the second
//    is an array of options. It returns the selected option's value.
//
// Try clicking each radio button to change the selection.

{
  const size = recho.radio(1, ["small", "medium", "large"]);
  echo(`You picked: ${size}`);
}

// ----------------------------------------------------------------------------

// 4. You can use the radio selection to control output. Here, the chosen size
//    determines how long a line of █ characters is drawn.
//
// Uncomment the block below and try switching between the options.

// {
//   const size = recho.radio(1, ["small", "medium", "large"]);
//   const lengths = {small: 5, medium: 10, large: 20};
//   echo("█".repeat(lengths[size]));
// }

// ----------------------------------------------------------------------------

// 5. You can combine toggle and radio in the same block. Here is an example
//    that lets you pick a shape and decide whether to show its area.
//
// Read through the example below, then try to reproduce it from memory in
// the empty block that follows.
//
// {
//   const shape = recho.radio(0, ["circle", "square"]);
//   const showArea = recho.toggle(true);
//   const side = 5;
//   if (shape === "circle") {
//     echo(`Shape: circle (radius ${side})`);
//     if (showArea) echo(`Area: ${(Math.PI * side * side).toFixed(2)}`);
//   } else {
//     echo(`Shape: square (side ${side})`);
//     if (showArea) echo(`Area: ${side * side}`);
//   }
// }

{
  // Reproduce the example above here...
}

// ----------------------------------------------------------------------------

// 6. Task: Create a radio control that lets the user pick a unit from
//    ["meters", "feet", "inches"]. Create a number control for a distance
//    value (min: 1, max: 100, step: 1). Echo the converted value in the
//    other two units.
//
//    Conversion rates:
//      1 meter  = 3.281 feet  = 39.37 inches
//      1 foot   = 0.3048 meters = 12 inches
//      1 inch   = 0.0254 meters = 0.0833 feet
//
//    For example, if the user picks "meters" and the value is 5:
//      5 meters = 16.40 feet
//      5 meters = 196.85 inches
//
//    Hint: Convert the input to meters first, then convert from meters
//    to the other two units. Use .toFixed(2) for formatting.

{
  // Write your code here...
}

// ----------------------------------------------------------------------------

// 7. Task: Create a toggle called `uppercase` and a radio to pick a greeting
//    from ["hello", "bonjour", "hola", "ciao"]. If uppercase is true, echo
//    the greeting in uppercase. Otherwise echo it normally.
//
//    For example:
//      uppercase on  + "bonjour" → "BONJOUR"
//      uppercase off + "bonjour" → "bonjour"
//
//    Hint: Use .toUpperCase() to convert a string to uppercase.

{
  // Write your code here...
}
