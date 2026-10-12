// Task 6: Interactive Numbers with recho.number
// The first few parts are worked out for you.
// Complete the remaining parts by uncommenting, reproducing, or writing new code.

// 1. recho.number creates an interactive numeric control right inside the editor.
//    Click the + and − buttons that appear next to the number to change the value.
//
// Try clicking + and − on the number below. Watch how the line of █ changes.

{
  const width = recho.number(10, {min: 1, max: 30, step: 1});
  echo("█".repeat(width));
}

// ----------------------------------------------------------------------------

// 2. You can add constraints to the number control with min, max, and step.
//    The step option controls how much the value changes per click.
//
// Uncomment the block below, save, and try clicking the controls.
// Notice the value jumps by 5 each time you click.

// {
//   const count = recho.number(10, {min: 0, max: 100, step: 5});
//   echo(`Count is ${count}`);
//   echo("█".repeat(count));
// }

// ----------------------------------------------------------------------------

// 3. Since recho.number returns the current value, you can use it in any
//    computation — just like a normal variable.
//
// Uncomment the block below and try changing the side length.

// {
//   const side = recho.number(5, {min: 1, max: 20, step: 1});
//   echo(`Side length: ${side}`);
//   echo(`Perimeter: ${side * 4}`);
//   echo(`Area: ${side * side}`);
// }

// ----------------------------------------------------------------------------

// 4. You can use multiple number controls together in the same block.
//    Here, width and height work together to draw a rectangle of █ characters.
//
// Try adjusting both controls to reshape the rectangle.

{
  const width = recho.number(8, {min: 1, max: 20, step: 1});
  const height = recho.number(4, {min: 1, max: 10, step: 1});
  let output = "";
  for (let row = 0; row < height; row++) {
    output += "█".repeat(width) + "\n";
  }
  echo(output.trimEnd());
}

// ----------------------------------------------------------------------------

// 5. Task: Create a number control for `sides` (min: 3, max: 10, step: 1) and
//    echo a polygon description. For example:
//      "A polygon with 5 sides is called a pentagon."
//
//    Use this lookup to find the name:
//      3 → triangle, 4 → square, 5 → pentagon, 6 → hexagon,
//      7 → heptagon, 8 → octagon, 9 → nonagon, 10 → decagon
//
//    Hint: You can store the names in an object like {3: "triangle", ...}
//    and look up the name with names[sides].

{
  // Write your code here...
}

// ----------------------------------------------------------------------------

// 6. Task: Create two number controls: `price` (min: 1, max: 100, step: 1)
//    and `quantity` (min: 1, max: 20, step: 1). Echo three lines:
//      Subtotal: $50.00
//      Tax (10%): $5.00
//      Total: $55.00
//
//    Hint: Use .toFixed(2) to format numbers with two decimal places.
//    For example: (12.5).toFixed(2) produces "12.50".

{
  // Write your code here...
}
