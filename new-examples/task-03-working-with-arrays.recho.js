// Task 3: Working with Arrays
// In this task you will use echo to watch how array methods transform data.
// Each method creates a NEW array, leaving the original untouched.

// 1. Start by creating an array of numbers and echoing it.
//    You can also echo .length to see how many items are in the array.
//
// Save the document (Ctrl+S, or Cmd+S on Mac) to see the output.

const numbers = echo([2, 5, 8, 11, 14, 17, 20]);
echo(numbers.length);

// ----------------------------------------------------------------------------

// 2. .map() creates a new array by applying a function to every element.
//
// Uncomment the following lines one at a time and save.

// const doubled = echo(numbers.map((n) => n * 2));

// const labels = echo(numbers.map((n) => "item-" + n));

// ----------------------------------------------------------------------------

// 3. .filter() creates a new array that keeps only the elements where the
//    function returns true.
//
// Uncomment each line and save.

// const evens = echo(numbers.filter((n) => n % 2 === 0));

// const bigOnes = echo(numbers.filter((n) => n > 10));

// ----------------------------------------------------------------------------

// 4. You can chain methods together. echo each step to see how the data
//    flows through the pipeline.

const data = echo([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const evenOnly = echo(data.filter((n) => n % 2 === 0));
const squared = echo(evenOnly.map((n) => n * n));
echo(squared);

// ----------------------------------------------------------------------------

// 5. .reduce() collapses an entire array down to a single value.
//    It takes a function and a starting value.
//
// Uncomment the following lines and save. The first argument to the function
// is the "accumulator" (the running result), and the second is the current item.

// const total = echo(numbers.reduce((sum, n) => sum + n, 0));

// const product = echo([1, 2, 3, 4, 5].reduce((acc, n) => acc * n, 1));

// ----------------------------------------------------------------------------

// 6. Task: Given the array of fruits below, write code to:
//    - Filter to keep only fruits with more than 5 characters
//    - Map the remaining fruits to uppercase
//    - Echo each step so you can see the transformation

{
  const fruits = ["apple", "banana", "cherry", "date", "elderberry"];
  // Write the code here...
}

// ----------------------------------------------------------------------------

// 7. Task: Given the array of numbers below, find the sum of all unique values.
//    Hint: you can use new Set(array) to remove duplicates, then use
//    Array.from() to convert it back to an array, then .reduce() to sum.
//    Echo each step.

{
  const values = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
  // Write the code here...
}
