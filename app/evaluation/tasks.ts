import type {TaskDefinition} from "./types.ts";

export const tasks: TaskDefinition[] = [
  // Easy tasks (1-4): warm-up, almost procedural
  {
    id: "1",
    title: "Emoji Bar Chart",
    difficulty: "easy",
    code: `// Task 1: Emoji Bar Chart
// Given the data below, create a horizontal bar chart where each fruit
// is represented by its emoji repeated \`count\` times.
//
// Expected output (each fruit label right-aligned, followed by its emoji bar):
//   apple | 🍎🍎🍎🍎🍎
//  cherry | 🍒🍒🍒
//   grape | 🍇🍇🍇🍇🍇🍇🍇
//  banana | 🍌🍌🍌🍌
//
// Hints:
// - Use string.padStart() to align labels
// - Use string.repeat() to create the emoji bars
// - Use echo() to display each row, or join with "\\n"

const fruits = [
  {name: "apple", emoji: "🍎", count: 5},
  {name: "cherry", emoji: "🍒", count: 3},
  {name: "grape", emoji: "🍇", count: 7},
  {name: "banana", emoji: "🍌", count: 4},
];

// Your code here
`,
  },
  {
    id: "2",
    title: "Box Frame",
    difficulty: "easy",
    code: `// Task 2: Box Frame
// Draw a rectangular frame using box-drawing characters.
// The frame should be \`width\` characters wide and \`height\` rows tall.
//
// Use these box-drawing characters:
//   ┌ (top-left)  ─ (horizontal)  ┐ (top-right)
//   │ (vertical)                   │
//   └ (bottom-left) ─             ┘ (bottom-right)
//
// Expected output for width=20, height=5:
// ┌──────────────────┐
// │                  │
// │                  │
// │                  │
// └──────────────────┘
//
// Hints:
// - The interior width is (width - 2) because of the two corner/side characters
// - Use string.repeat() for the horizontal lines and spaces

const width = 20;
const height = 5;

// Your code here
`,
  },
  {
    id: "3",
    title: "Gradient Strip",
    difficulty: "easy",
    code: `// Task 3: Gradient Strip
// Create a vertical gradient using the block shade characters:
//   " " (space), "░", "▒", "▓", "█"
//
// Build a strip that is \`stripWidth\` characters wide.
// Each row uses a single shade character, transitioning from
// light (space) at the top to dark (█) at the bottom,
// then back to light.
//
// Expected output for stripWidth=20:
//
// ░░░░░░░░░░░░░░░░░░░░
// ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ████████████████████
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
// ░░░░░░░░░░░░░░░░░░░░
//
// Hints:
// - Define an array of shade characters in order
// - Build the gradient by going forward then backward through the array
// - Use string.repeat() for each row

const shades = [" ", "░", "▒", "▓", "█"];
const stripWidth = 20;

// Your code here
`,
  },
  {
    id: "4",
    title: "Emoji Weather Forecast",
    difficulty: "easy",
    code: `// Task 4: Emoji Weather Forecast
// Display a 7-day weather forecast using emojis.
// For each day, show the day name, weather emoji, and temperature.
//
// Expected output:
//   Mon  ☀️   28°
//   Tue  🌤️   25°
//   Wed  🌧️   18°
//   Thu  ⛈️   15°
//   Fri  🌤️   22°
//   Sat  ☀️   30°
//   Sun  ☀️   29°
//
// Hints:
// - Use padEnd() or padStart() to align columns
// - Use echo() to display each line, or join them

const forecast = [
  {day: "Mon", weather: "☀️", temp: 28},
  {day: "Tue", weather: "🌤️", temp: 25},
  {day: "Wed", weather: "🌧️", temp: 18},
  {day: "Thu", weather: "⛈️", temp: 15},
  {day: "Fri", weather: "🌤️", temp: 22},
  {day: "Sat", weather: "☀️", temp: 30},
  {day: "Sun", weather: "☀️", temp: 29},
];

// Your code here
`,
  },

  // Medium tasks (5-8): small creative/debugging effort
  {
    id: "5",
    title: "Checkerboard",
    difficulty: "medium",
    code: `// Task 5: Checkerboard
// Create an 8x8 checkerboard pattern using block characters.
// Use "██" for black squares and "  " (two spaces) for white squares.
// Alternate the starting color for each row.
//
// Expected output:
// ██  ██  ██  ██
//   ██  ██  ██  ██
// ██  ██  ██  ██
//   ██  ██  ██  ██
// ██  ██  ██  ██
//   ██  ██  ██  ██
// ██  ██  ██  ██
//   ██  ██  ██  ██
//
// Hints:
// - Use a nested loop (row and column)
// - The color depends on whether (row + col) is even or odd
// - Use "██" (two block chars) so each cell looks square

const size = 8;

// Your code here
`,
  },
  {
    id: "6",
    title: "Sparkline",
    difficulty: "medium",
    code: `// Task 6: Sparkline
// Create a sparkline (inline mini chart) from an array of numbers.
// Map each value to one of the block characters: ▁▂▃▄▅▆▇█
// based on where it falls in the min-max range.
//
// For the data below, the output should look something like:
// ▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▂▁
//
// Then display it with a label:
// Sales Q1: ▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▂▁
//
// Hints:
// - Find the min and max of the data
// - Map each value to an index 0-7 in the blocks array
// - Math.round() can help map to the nearest block character

const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

const salesData = [2, 3, 5, 7, 8, 7, 5, 3, 2, 1, 2, 3, 5, 7, 8, 7, 5, 3, 2, 1];

// Your code here
`,
  },
  {
    id: "7",
    title: "Diamond Pattern",
    difficulty: "medium",
    code: `// Task 7: Diamond Pattern
// Draw a diamond shape using a character of your choice.
// The diamond should have a "radius" of \`size\` rows from center to tip.
//
// Expected output for size=5 using "◆":
//     ◆
//    ◆◆◆
//   ◆◆◆◆◆
//  ◆◆◆◆◆◆◆
// ◆◆◆◆◆◆◆◆◆
//  ◆◆◆◆◆◆◆
//   ◆◆◆◆◆
//    ◆◆◆
//     ◆
//
// Hints:
// - The diamond has (2 * size - 1) rows
// - For each row, calculate how many characters to draw
// - Use padStart() or leading spaces to center each row
// - The top half grows, the bottom half shrinks

const size = 5;
const char = "◆";

// Your code here
`,
  },
  {
    id: "8",
    title: "Interactive Histogram",
    difficulty: "medium",
    code: `// Task 8: Interactive Histogram
// Create a vertical histogram that updates when the user clicks "Regenerate".
// Generate \`count\` random integers between 0 and \`maxVal\`, group them into
// bins, and draw vertical bars using "█" characters.
//
// Use recho.button() to add a "Regenerate" button.
// Use echo.clear() before redrawing.
//
// Example output (will vary with random data):
//       █
//    █  █     █
//  █ █  █  █  █  █
//  █ ██ █ ██  █  █ █
//  █████████ ██ ██ █
// ████████████████████
//
// Hints:
// - Use Math.random() to generate numbers
// - Group values into bins (e.g., bins of width 5)
// - For each column, calculate height relative to max bin count
// - Build the output row by row from top to bottom
// - Use echo.set("compact", true) for tight output

const count = 200;
const maxVal = 50;

// Your code here
`,
  },

  // Hard tasks (9-12): richer case-study potential
  {
    id: "9",
    title: "Wave Animation",
    difficulty: "hard",
    code: `// Task 9: Wave Animation
// Create an animated sine wave using block characters (▁▂▃▄▅▆▇█).
// The wave should scroll horizontally over time.
//
// Use recho.now() to get a continuously updating timestamp,
// and echo.clear() to redraw each frame.
//
// The wave should be \`waveWidth\` characters wide.
// Map sin(x + time) to block characters for each column.
//
// Hints:
// - recho.now() returns a number that increases over time (ms)
// - Use Math.sin() to compute the wave value for each column
// - Map the sin value (range -1 to 1) to a block index (0 to 7)
// - Use echo.set("compact", true) to prevent extra spacing
// - Dividing recho.now() by a larger number makes the animation slower

const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
const waveWidth = 50;
const now = recho.now();

// Your code here
`,
  },
  {
    id: "10",
    title: "Emoji Race",
    difficulty: "hard",
    code: `// Task 10: Emoji Race
// Create an animated race with different characters moving at different speeds.
// Each racer moves across a track of \`trackLength\` characters.
//
// Use recho.interval(ms) to create different timers for each racer.
// Faster racers have a smaller interval.
//
// The output should look like:
// 🏁                         🐌💨
// 🏁                    🐢💨
// 🏁              🏃💨
// 🏁    🚗💨
// 🏁🚀💨
//
// When a racer reaches the start (position 0), they should wrap around.
//
// Hints:
// - recho.interval(ms) returns a count that increments every ms milliseconds
// - Use padStart() to position each racer
// - The position can be computed as: trackLength - (count % trackLength)
// - Show the finish line 🏁 at the left edge of each track

const trackLength = 30;

// Define racers with different intervals (slower = higher ms)
// Your code here
`,
  },
  {
    id: "11",
    title: "Landscape Scene",
    difficulty: "hard",
    code: `// Task 11: Landscape Scene
// Create a layered landscape scene using emojis and block characters.
// The scene should have these layers from top to bottom:
//
// 1. Sky: a row with sun/moon and clouds (☀️ ☁️ or 🌙 ⭐)
// 2. Mountains: a mountain range using /\\ characters or block chars
// 3. Trees: a row of trees (🌲🌳🌴) on a ground line
// 4. Ground: grass using ▓ or 🟩 characters
// 5. Water: a lake or river using 🌊 or ～ characters
//
// The scene should be \`sceneWidth\` characters wide.
// Feel free to get creative with the composition!
//
// Bonus: Use recho.now() to add subtle animation
// (e.g., twinkling stars, moving clouds, or rippling water).
//
// Hints:
// - Build each layer as a string, then join with "\\n"
// - Use string.repeat() for filling rows
// - Mix emojis and Unicode characters freely
// - echo.set("compact", true) helps keep the scene tight

const sceneWidth = 40;

// Your code here
`,
  },
  {
    id: "12",
    title: "Emoji Heatmap",
    difficulty: "hard",
    code: `// Task 12: Emoji Heatmap
// Create a heatmap visualization of a 2D data grid using colored square emojis.
// Map numeric values to a color scale:
//   0-1: ⬜  1-2: 🟦  2-3: 🟩  3-4: 🟨  4-5: 🟧  5+: 🟥
//
// Display the heatmap with row and column labels.
//
// Expected output:
//     0  1  2  3  4  5  6
//  0  🟥 🟧 🟩 🟦 🟩 🟧 🟥
//  1  🟧 🟨 🟩 🟦 🟩 🟨 🟧
//  2  🟩 🟩 🟦 ⬜ 🟦 🟩 🟩
//  3  🟦 🟦 ⬜ ⬜ ⬜ 🟦 🟦
//  ...
//
// Then add a legend at the bottom showing the color scale.
//
// Hints:
// - Use nested loops to iterate the grid
// - Map each value to the appropriate emoji
// - Use padStart/padEnd for alignment
// - The sample data below generates a radial gradient pattern —
//   values increase toward the center

const rows = 7;
const cols = 7;

// Generate sample data: distance from center creates a radial pattern
const data = [];
for (let r = 0; r < rows; r++) {
  const row = [];
  for (let c = 0; c < cols; c++) {
    const dist = Math.sqrt((r - 3) ** 2 + (c - 3) ** 2);
    row.push(Math.round(dist * 10) / 10);
  }
  data.push(row);
}

echo(data);

// Your code here: visualize the data as an emoji heatmap
`,
  },
];

export function getTaskById(id: string): TaskDefinition | undefined {
  return tasks.find((t) => t.id === id);
}
