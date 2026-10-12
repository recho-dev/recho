// Task 8: Drawing Text Patterns
// In this notebook you will draw text-based patterns using loops,
// string.repeat, and blocks. Each section builds a new shape.

// 1. The simplest pattern is a horizontal line. The string method .repeat(n)
//    duplicates a character n times. Save the document to see the output.

echo("█".repeat(10));

// ----------------------------------------------------------------------------

// 2. To draw a vertical line, we need a loop inside a block. Each iteration
//    echos one character, producing one line of output.
//
// Uncomment the block below and save the document.

// {
//   let line = "";
//   for (let i = 0; i < 6; i++) {
//     line += "█\n";
//   }
//   echo(line.trimEnd());
// }

// ----------------------------------------------------------------------------

// 3. A filled rectangle is just a loop that echos the same horizontal line
//    multiple times. Here we draw a rectangle 8 characters wide and 4 tall.
//
// Save the document to see the rectangle.

{
  let rect = "";
  for (let row = 0; row < 4; row++) {
    rect += "█".repeat(8) + "\n";
  }
  echo(rect.trimEnd());
}

// ----------------------------------------------------------------------------

// 4. A right triangle grows by one character on each row. Row 1 has 1 block,
//    row 2 has 2 blocks, and so on.
//
// Uncomment the block below and save the document.

// {
//   let triangle = "";
//   for (let i = 1; i <= 5; i++) {
//     triangle += "█".repeat(i) + "\n";
//   }
//   echo(triangle.trimEnd());
// }

// ----------------------------------------------------------------------------

// 5. To right-align a triangle, pad each row with spaces on the left.
//    If the triangle has `size` rows, row i needs (size - i) spaces before
//    the blocks.
//
//    The output for size = 5 looks like:
//        █
//       ██
//      ███
//     ████
//    █████
//
//    Here is how it works:
//
// {
//   const size = 5;
//   let tri = "";
//   for (let i = 1; i <= size; i++) {
//     tri += " ".repeat(size - i) + "█".repeat(i) + "\n";
//   }
//   echo(tri.trimEnd());
// }
//
// Now reproduce it yourself in the empty block below.

{
  // Reproduce the right-aligned triangle here...
}

// ----------------------------------------------------------------------------

// 6. Task: Draw a staircase with 5 steps. Each step is 2 characters wide
//    and 1 character tall. Each step is indented 2 more spaces than the
//    previous one.
//
//    The output should look like:
//    ██
//      ██
//        ██
//          ██
//            ██
//
//    Hint: Step i (starting from 0) needs (i * 2) spaces of indentation
//    followed by "█".repeat(2).

{
  // Write your code here...
}

// ----------------------------------------------------------------------------

// 7. Task: Draw a diamond shape. Use `let height = 5;` (an odd number).
//    The widest row has `height` characters. The top half widens from 1 to
//    height, and the bottom half narrows back to 1. Only odd-width rows
//    appear.
//
//    For height = 5, the output should look like:
//        █
//       ███
//      █████
//       ███
//        █
//
//    Hint: The top half has rows with width 1, 3, 5 (i.e., 2*i - 1 for
//    i = 1, 2, ..., ceil(height/2)). Each row is centered by padding with
//    spaces: (height - width) / 2 spaces on the left. The bottom half
//    mirrors the top half (excluding the middle row).

let height = 5;

{
  // Write your code here...
}
