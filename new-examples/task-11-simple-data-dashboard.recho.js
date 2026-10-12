// Task 11: Simple Data Dashboard
// In this notebook you will build a tiny data dashboard from an array of
// student records. You will extract fields, compute statistics, display
// a table with echo.key, and format a leaderboard.

// Here is the dataset we will work with throughout this notebook.

const students = [
  {name: "Alice", subject: "Math", score: 92},
  {name: "Bob", subject: "English", score: 75},
  {name: "Charlie", subject: "Math", score: 88},
  {name: "Diana", subject: "English", score: 68},
  {name: "Eve", subject: "Math", score: 55},
];

// ----------------------------------------------------------------------------

// 1. Let's start by echoing the entire array to see what we are working with.
//
// Save the document to see the output.

echo(students);

// ----------------------------------------------------------------------------

// 2. Use .map() to extract just the student names into a new array.
//
// Uncomment the line below and save the document.

// const names = echo(students.map(s => s.name));

// ----------------------------------------------------------------------------

// 3. Compute the average score across all students using .reduce().
//    .reduce() accumulates a running total, then we divide by the count.
//
// Uncomment the block below and save the document.

// const total = students.reduce((sum, s) => sum + s.score, 0);
// const average = echo(total / students.length);

// ----------------------------------------------------------------------------

// 4. echo.key lets you display labeled values that line up in a table.
//    When you call echo.key("column")(value) inside a loop, Recho collects
//    the values and shows them as aligned columns.
//
// Save the document to see the table.

for (const s of students) {
  echo.key("Name")(s.name);
  echo.key("Subject")(s.subject);
  echo.key("Score")(s.score);
}

// ----------------------------------------------------------------------------

// 5. To find the student with the highest score, use .reduce() to compare
//    each student's score and keep the one with the larger value.
//
// Uncomment the lines below and save the document.

// const best = echo(
//   students.reduce((top, s) => s.score > top.score ? s : top)
// );

// ----------------------------------------------------------------------------

// 6. Task: Group the students by subject. Write code that produces an object
//    where each key is a subject name and each value is an array of student
//    names who take that subject.
//
//    The output should look like:
//      {Math: ["Alice", "Charlie", "Eve"], English: ["Bob", "Diana"]}
//
//    Hint: Use .reduce(). For each student, check if the subject key already
//    exists in the accumulator. If not, create an empty array first.

{
  // Write your code here...
}

// ----------------------------------------------------------------------------

// 7. Task: Write a block that displays a leaderboard — students sorted by
//    score from highest to lowest, with a rank number and a bar chart.
//
//    The output should look like:
//      1. Alice     92 ███████████████████████
//      2. Charlie   88 ██████████████████████
//      3. Bob       75 ███████████████████
//      4. Diana     68 █████████████████
//      5. Eve       55 ██████████████
//
//    Hint: First sort a copy of the array with .slice().sort().
//    Use .padEnd() to align names, and "█".repeat(Math.round(score / 4))
//    to scale the bars so they fit nicely.

{
  // Write your code here...
}
