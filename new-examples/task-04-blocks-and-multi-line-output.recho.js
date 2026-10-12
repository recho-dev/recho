// Task 4: Blocks and Multi-Line Output
// The first few parts are worked out for you.
// Complete the remaining parts by uncommenting, reproducing, or writing new code.

// 1. A block groups several statements together. You can build a string piece
//    by piece inside a block, then echo the final result.
//
// Save the document to see the output.

{
  let list = "";
  const items = ["apples", "bread", "milk", "eggs"];
  for (let i = 0; i < items.length; i++) {
    list += (i + 1) + ". " + items[i] + "\n";
  }
  echo(list.trimEnd());
}

// ----------------------------------------------------------------------------

// 2. Template literals (backtick strings) make formatting cleaner inside loops.
//    They let you embed expressions with ${...} instead of concatenating with +.
//
// Uncomment the block below and save the document.

// {
//   const names = ["Alice", "Bob", "Carol"];
//   let output = "";
//   for (let i = 0; i < names.length; i++) {
//     output += `Guest #${i + 1}: ${names[i]}\n`;
//   }
//   echo(output.trimEnd());
// }

// ----------------------------------------------------------------------------

// 3. You can use .repeat() to draw simple text-based visualizations.
//    "*".repeat(4) produces "****".
//
// Uncomment the block below and save the document.

// {
//   const values = [3, 6, 2, 5];
//   let chart = "";
//   for (const v of values) {
//     chart += "*".repeat(v) + " " + v + "\n";
//   }
//   echo(chart.trimEnd());
// }

// ----------------------------------------------------------------------------

// 4. Here is an example that builds a small multiplication snippet.
//    Read it carefully, then reproduce it yourself in the empty block below.
//
// {
//   const base = 3;
//   let table = "";
//   for (let i = 1; i <= 4; i++) {
//     table += `${base} x ${i} = ${base * i}\n`;
//   }
//   echo(table.trimEnd());
// }
//
// The output should look like:
//   3 x 1 = 3
//   3 x 2 = 6
//   3 x 3 = 9
//   3 x 4 = 12
//
// Try to reproduce it from memory. Save the document after each line.

{
  // Write your code here...
}

// ----------------------------------------------------------------------------

// 5. Task: Given the array below, write a block that produces a numbered list.
//
// The output should look like:
//   1. apple
//   2. banana
//   3. cherry
//   4. date

const fruits = ["apple", "banana", "cherry", "date"];

{
  // Write your code here...
}

// ----------------------------------------------------------------------------

// 6. Task: Given the array below, write a block that produces a simple
//    horizontal bar chart. Each score becomes a row of █ characters
//    followed by the number.
//
// The output should look like:
//   ███ 3
//   ███████ 7
//   ██ 2
//   █████ 5
//   ████████ 8
//
// Hint: "█".repeat(3) produces "███".

const scores = [3, 7, 2, 5, 8];

{
  // Write your code here...
}
