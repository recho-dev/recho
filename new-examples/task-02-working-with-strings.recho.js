// Task 2: Working with Strings
// In this task you will use echo to watch how string methods transform text,
// one step at a time.

// 1. String methods in JavaScript create NEW strings. They never change the
//    original. echo makes this easy to verify.
//
// Save the document (Ctrl+S, or Cmd+S on Mac) to see the output.

const greeting = echo("hello world");
const shouted = echo(greeting.toUpperCase());
echo(greeting);

// Notice that `greeting` is still "hello world". toUpperCase returned a
// brand-new string without touching the original.

// ----------------------------------------------------------------------------

// 2. Here are a few more useful string methods.
//
// Uncomment each line one at a time (Ctrl+/ or Cmd+/) and save.

// echo("  too much space  ".trim());

// echo("LOUD NOISES".toLowerCase());

// echo("hello world".slice(0, 5));

// echo("hello world".slice(6));

// ----------------------------------------------------------------------------

// 3. You can split a string into an array of characters with .split("").
//    echo every step so you can see the transformation happen.

const word = echo("hello");
const chars = echo(word.split(""));
const upper = echo(chars.map((c) => c.toUpperCase()));
echo(upper.join(""));

// ----------------------------------------------------------------------------

// 4. Splitting on a space gives you individual words. Joining with a
//    different separator puts them back together in a new way.
//
// Uncomment the following lines and save.

// const sentence = echo("the quick brown fox");
// const words = echo(sentence.split(" "));
// const dashed = echo(words.join("-"));

// ----------------------------------------------------------------------------

// 5. Here is a small chain: split a phrase into words, reverse the array,
//    then join the words back together.

const original = echo("one two three");
const parts = echo(original.split(" "));
const reversed = echo(parts.slice().reverse());
echo(reversed.join(" "));

// Now, try to reproduce the same steps for the string "red green blue".
// Save after each line to see the intermediate results.



// ----------------------------------------------------------------------------

// 6. Task: Given the string "JavaScript is fun", write code to:
//    - Split it into words
//    - Make each word uppercase (hint: use .map())
//    - Join the words with " | "
//    Echo each step so you can see the transformation.

{
  const text = "JavaScript is fun";
  // Write the code here...
}

// ----------------------------------------------------------------------------

// 7. Task: Given the string "racecar", check if it reads the same forwards
//    and backwards.
//    - Echo the original string
//    - Split it into characters, reverse, and join to get the reversed string
//    - Echo the reversed string
//    - Echo whether the original and reversed strings are equal

{
  const text = "racecar";
  // Write the code here...
}
