// Task 10: Text Processing
// In this notebook you will process a paragraph of text step by step —
// normalizing, tokenizing, filtering, counting, and visualizing word
// frequencies. Each section builds on the previous one.

// Here is the text we will work with throughout this notebook.

const text = "The dog and the cat were playing in the yard. The dog barked loudly and the cat ran quickly. The mouse hid under the bench but the dog kept looking. The cat jumped over the fence and the dog followed.";

// ----------------------------------------------------------------------------

// 1. Let's start by echoing the raw text and then a lowercased version.
//    Lowercasing ensures that "The" and "the" are treated as the same word.
//
// Save the document to see the output.

echo(text);

const lower = echo(text.toLowerCase());

// ----------------------------------------------------------------------------

// 2. Next, remove punctuation and split the string into an array of words.
//    .replace(/[^a-z\s]/g, "") removes anything that is not a letter or space.
//    .split(/\s+/) splits on whitespace into individual words.
//
// Save the document to see each step.

const cleaned = echo(lower.replace(/[^a-z\s]/g, ""));

const words = echo(cleaned.split(/\s+/));

// ----------------------------------------------------------------------------

// 3. Short words like "in", "a", "the" are often uninteresting.
//    Filtering them out reduces noise in our analysis.
//
// Uncomment the line below and save the document.

// const filtered = echo(words.filter(w => w.length >= 3));

// ----------------------------------------------------------------------------

// 4. Now count how often each word appears. We use .reduce() to build an
//    object where keys are words and values are counts.
//
// Uncomment the block below and save the document.

// const counts = echo(
//   filtered.reduce((acc, word) => {
//     acc[word] = (acc[word] || 0) + 1;
//     return acc;
//   }, {})
// );

// ----------------------------------------------------------------------------

// 5. To see which words appear most often, convert the counts object to an
//    array of [word, count] pairs, then sort by count descending.
//
// Uncomment the lines below and save the document.

// const sorted = echo(
//   Object.entries(counts)
//     .sort((a, b) => b[1] - a[1])
// );

// ----------------------------------------------------------------------------

// 6. Task: Using the variables already defined above (words, filtered, etc.),
//    write a block that echos three statistics:
//      - The total number of words (from `words`)
//      - The number of unique words (from `counts`)
//      - The average word length rounded to 1 decimal place (from `filtered`)
//
//    The output should look something like:
//      Total words: 38
//      Unique words (3+ letters): 14
//      Average word length: 4.2
//
//    Hint: To compute the average length, sum all character counts from
//    `filtered` with .reduce(), then divide by filtered.length.
//    Use .toFixed(1) to round to one decimal place.

{
  // Write your code here...
}

// ----------------------------------------------------------------------------

// 7. Task: Write a block that displays a bar chart of the top 5 most frequent
//    words from `sorted`. Use "█".repeat(count) for the bars.
//
//    The output should look something like:
//      the     ████████ 8
//      dog     ████ 4
//      cat     ███ 3
//      and     ███ 3
//      ran     ██ 2
//
//    Hint: Use .padEnd(maxLength) on the word to align the bars.
//    You can find the longest word with Math.max(...names.map(n => n.length)).

{
  // Write your code here...
}
