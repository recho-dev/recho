// Task 5: Tracing Iterations with echo.key
// The first few parts are worked out for you.
// Complete the remaining parts by uncommenting, reproducing, or writing new code.

// 1. When you call echo.key("name")(value) inside a loop, Recho collects
//    every value for each key and displays them as a table. Each key becomes
//    a row, and each iteration becomes a column.
//
// Save the document to see the table.

for (let i = 0; i < 5; i++) {
  echo.key("i")(i);
  echo.key("i squared")(i * i);
}

// ----------------------------------------------------------------------------

// 2. You can add more rows to the table by adding more echo.key calls.
//    Uncomment the line below to add a third row showing the cube of i.
//
// Save after uncommenting.

// for (let i = 0; i < 5; i++) {
//   echo.key("i")(i);
//   echo.key("i squared")(i * i);
//   echo.key("i cubed")(i * i * i);
// }

// ----------------------------------------------------------------------------

// 3. echo.key is especially useful for tracking how a value accumulates.
//    Here we trace a running total as we add each number from an array.
//
// Save the document to see how the total grows.

{
  const numbers = [10, 25, 5, 40, 15];
  let total = 0;
  for (const num of numbers) {
    total += num;
    echo.key("number")(num);
    echo.key("running total")(total);
  }
}

// ----------------------------------------------------------------------------

// 4. Here is another practical trace: computing a factorial step by step.
//    Uncomment the block below and save the document.

// {
//   let product = 1;
//   for (let factor = 1; factor <= 5; factor++) {
//     product = product * factor;
//     echo.key("factor")(factor);
//     echo.key("product so far")(product);
//   }
// }

// ----------------------------------------------------------------------------

// 5. Here is an example that traces a countdown. Read the commented code,
//    then reproduce it yourself in the empty block below.
//
// {
//   let value = 10;
//   for (let step = 1; value > 0; step++) {
//     echo.key("step")(step);
//     echo.key("value")(value);
//     value -= 2;
//   }
// }
//
// The table should look like:
//   step  |  1   2   3   4   5
//   value | 10   8   6   4   2
//
// Try to reproduce it from memory.

{
  // Write your code here...
}

// ----------------------------------------------------------------------------

// 6. Task: Write a block with echo.key that traces the first 6 powers of 2.
//    The table should have two rows:
//      exponent | 0  1  2  3   4   5
//      result   | 1  2  4  8  16  32
//
// Hint: 2 ** n gives you 2 raised to the power of n.

{
  // Write your code here...
}

// ----------------------------------------------------------------------------

// 7. Task: Write a block with echo.key that traces this process:
//    Start with the word "ABCDE". In each iteration, remove the last
//    character. Track "step" (starting at 1) and "word" across iterations.
//
// The table should look like:
//   step |  1       2      3     4    5
//   word | ABCDE   ABCD   ABC   AB   A
//
// Hint: word.slice(0, -1) removes the last character from a string.

{
  // Write your code here...
}
