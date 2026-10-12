// Task 1: Inline Echo Basics
// The first few parts are worked out for you.
// Complete the remaining parts by filling the blanks and uncommenting them.

// 1. The first thing you need to know is that you can echo output inline as
//    comments. Each line of output is prefixed with `//➜`.
//
// Try to save (Ctrl+S, or Cmd+S on Mac) the document.

echo("Hello, World!");

// ----------------------------------------------------------------------------

// 2. In addition to a string, you can echo any value, including numbers,
//    arrays, objects, functions, classes, maps, sets, and dates.
//
// Uncomment the following lines one by one and then save the document.
// Press Ctrl + / or (Cmd + / on Mac) to comment/uncomment the line.

// echo(1);

// echo([1, 2, 3]);

// echo({a: 1, b: 2});

// ----------------------------------------------------------------------------

// 3. Unlike console.log, echo will return the value itself.

// const answer = echo(42);

// What is the value of `answer`?

// echo(answer);

// ----------------------------------------------------------------------------

// 4. echo is useful for helping you understand the code step by step by
//    "seeing" every manipulation in place.
//

// const string = echo("dog");
// const chars = echo(string.split(""));
// const reversed = echo(chars.slice().reverse());
// echo(reversed.join(""));
//
// Try to reproduce the example above. Save the document after you type each line.

// ----------------------------------------------------------------------------

// 5. Each `echo` call always occupies the entire line. If you want to show a
//    value computed by multiple statements, use a block.
//
// {
//   let sum = 0, n = 100;
//   for (let i = 1; i <= n; i++) {
//     sum += i;
//   }
//   echo(`The sum from 1 to ${n} is ${sum}.`);
// }
//
// Now, try to print the sum of the square of all integers from 1 to 100.

{
  // Write the code here...
}

// ----------------------------------------------------------------------------

// 6. Recho Notebook is reactive. Try changing only the value of `n`.

let n = 100;

function sum(n) {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}

echo(sum(n));
