import type {TaskDefinition} from "./types.ts";

export const tasks: TaskDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // EASY TASKS (1-8): Warm-up, almost procedural
  // ═══════════════════════════════════════════════════════════════

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
  {
    id: "5",
    title: "Progress Bars",
    difficulty: "easy",
    code: `// Task 5: Progress Bars
// Display a set of progress bars for project milestones.
// Each bar shows a label, a visual bar using "█" and "░", and a percentage.
//
// Expected output:
//   Design  ████████████████████░░░░░░░░░░  65%
//   Backend ██████████████████████████████  100%
//   Testing ████████░░░░░░░░░░░░░░░░░░░░░░  28%
//   Deploy  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%
//
// Hints:
// - The total bar width is \`barWidth\` characters
// - Filled portion: Math.round(percent / 100 * barWidth)
// - Use padEnd() to align labels, padStart() for percentages
// - "█".repeat(filled) + "░".repeat(barWidth - filled) for the bar

const barWidth = 30;
const milestones = [
  {label: "Design", percent: 65},
  {label: "Backend", percent: 100},
  {label: "Testing", percent: 28},
  {label: "Deploy", percent: 0},
];

// Your code here
`,
  },
  {
    id: "6",
    title: "Multiplication Table",
    difficulty: "easy",
    code: `// Task 6: Multiplication Table
// Display a multiplication table from 1 to \`n\`.
// Use box-drawing characters for the header separator.
//
// Expected output for n=5:
//   ×  │  1   2   3   4   5
//  ────┼────────────────────
//   1  │  1   2   3   4   5
//   2  │  2   4   6   8  10
//   3  │  3   6   9  12  15
//   4  │  4   8  12  16  20
//   5  │  5  10  15  20  25
//
// Hints:
// - Use padStart() to right-align numbers in fixed-width columns
// - Use "─" for the horizontal separator and "│" for the vertical
// - "┼" for the intersection

const n = 5;

// Your code here
`,
  },
  {
    id: "7",
    title: "Emoji Mood Tracker",
    difficulty: "easy",
    code: `// Task 7: Emoji Mood Tracker
// Display a weekly mood tracker where each mood level maps to an emoji face.
// Show the day, mood emoji, and a mini bar of colored squares.
//
// Mood scale: 1=😢, 2=😕, 3=😐, 4=🙂, 5=😄
// Bar: 🟥 for 1, 🟧 for 2, 🟨 for 3, 🟩 for 4, 🟦 for 5
//
// Expected output:
//  Mon  😄  🟦🟦🟦🟦🟦
//  Tue  🙂  🟩🟩🟩🟩
//  Wed  😐  🟨🟨🟨
//  Thu  😕  🟧🟧
//  Fri  😄  🟦🟦🟦🟦🟦
//  Sat  🙂  🟩🟩🟩🟩
//  Sun  😄  🟦🟦🟦🟦🟦
//
// Hints:
// - Create lookup objects/arrays for mood→emoji and mood→color
// - Repeat the color square \`mood\` times to form the bar

const week = [
  {day: "Mon", mood: 5},
  {day: "Tue", mood: 4},
  {day: "Wed", mood: 3},
  {day: "Thu", mood: 2},
  {day: "Fri", mood: 5},
  {day: "Sat", mood: 4},
  {day: "Sun", mood: 5},
];

// Your code here
`,
  },
  {
    id: "8",
    title: "Number Ruler",
    difficulty: "easy",
    code: `// Task 8: Number Ruler
// Draw a horizontal ruler using box-drawing characters and numbers.
// Major ticks every 10 units, minor ticks every 5 units.
//
// Expected output for length=40:
// 0         10        20        30        40
// ├────┬────├────┬────├────┬────├────┬────┤
//
// The top row shows numbers at every major tick (every 10),
// positioned above the tick mark. The bottom row uses:
//   ├ for major ticks (multiples of 10)
//   ┬ for minor ticks (multiples of 5, but not 10)
//   ─ for regular positions
//   ┤ for the final position
//
// Hints:
// - Build both lines character by character
// - For the label line, place the number at each multiple of 10
//   using padStart/padEnd to position them correctly

const length = 40;

// Your code here
`,
  },

  // ═══════════════════════════════════════════════════════════════
  // MEDIUM TASKS (9-20): Small creative or debugging effort
  // ═══════════════════════════════════════════════════════════════

  {
    id: "9",
    title: "Checkerboard",
    difficulty: "medium",
    code: `// Task 9: Checkerboard
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
    id: "10",
    title: "Sparkline",
    difficulty: "medium",
    code: `// Task 10: Sparkline
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
    id: "11",
    title: "Diamond Pattern",
    difficulty: "medium",
    code: `// Task 11: Diamond Pattern
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
    id: "12",
    title: "Interactive Histogram",
    difficulty: "medium",
    code: `// Task 12: Interactive Histogram
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
  {
    id: "13",
    title: "Mini Calendar",
    difficulty: "medium",
    code: `// Task 13: Mini Calendar
// Display the current month as a calendar grid using box-drawing characters.
//
// Expected output (for March 2026):
// ┌──────────────────────────────┐
// │        March 2026            │
// ├────┬────┬────┬────┬────┬────┬────┤
// │ Su │ Mo │ Tu │ We │ Th │ Fr │ Sa │
// ├────┼────┼────┼────┼────┼────┼────┤
// │  1 │  2 │  3 │  4 │  5 │  6 │  7 │
// │  8 │  9 │ 10 │ 11 │ 12 │ 13 │ 14 │
// │ 15 │ 16 │ 17 │ 18 │ 19 │ 20 │ 21 │
// │ 22 │ 23 │ 24 │ 25 │ 26 │ 27 │ 28 │
// │ 29 │ 30 │ 31 │    │    │    │    │
// └────┴────┴────┴────┴────┴────┴────┘
//
// Hints:
// - new Date(year, month, 0).getDate() → days in month
// - new Date(year, month-1, 1).getDay() → day of week for 1st (0=Sun)
// - Use padStart()/padEnd() to align day numbers in cells
// - Build it row by row using box-drawing characters:
//   ┌─┬─┐  top    │ │  body    ├─┼─┤  mid    └─┴─┘  bottom

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth(); // 0-indexed

// Your code here
`,
  },
  {
    id: "14",
    title: "ASCII Data Table",
    difficulty: "medium",
    code: `// Task 14: ASCII Data Table
// Render a data table with box-drawing borders that auto-sizes
// columns to fit the widest content in each column.
//
// Expected output:
// ┌──────┬────────┬───────┬───────────┐
// │ Rank │ Name   │ Score │ Grade     │
// ├──────┼────────┼───────┼───────────┤
// │    1 │ Alice  │    95 │ ★★★★★     │
// │    2 │ Bob    │    87 │ ★★★★      │
// │    3 │ Carol  │    72 │ ★★★       │
// │    4 │ Dave   │    68 │ ★★★       │
// │    5 │ Eve    │    54 │ ★★        │
// └──────┴────────┴───────┴───────────┘
//
// Hints:
// - First, compute the max width for each column
// - Use ┌─┬─┐ for top, ├─┼─┤ for header separator, └─┴─┘ for bottom
// - padEnd() for left-aligned text columns
// - padStart() for right-aligned number columns
// - Grade: one ★ per 20 points (Math.ceil(score/20))

const students = [
  {rank: 1, name: "Alice", score: 95},
  {rank: 2, name: "Bob", score: 87},
  {rank: 3, name: "Carol", score: 72},
  {rank: 4, name: "Dave", score: 68},
  {rank: 5, name: "Eve", score: 54},
];

// Your code here
`,
  },
  {
    id: "15",
    title: "Sierpinski Triangle",
    difficulty: "medium",
    code: `// Task 15: Sierpinski Triangle
// Draw a Sierpinski triangle of order \`n\` using characters.
// This is a fractal pattern where triangles contain smaller triangles.
//
// Expected output for n=4:
//                ▲
//               ▲ ▲
//              ▲▲▲▲
//             ▲      ▲
//            ▲ ▲    ▲ ▲
//           ▲▲▲▲  ▲▲▲▲
//          ▲              ▲
//         ▲ ▲            ▲ ▲
//        (... etc)
//
// Hints:
// - One approach: use Pascal's triangle mod 2
//   If C(row, col) is odd → draw a character; otherwise → space
// - The triangle has 2^n rows
// - C(row, col) % 2 can be computed with bitwise AND:
//   if (col & (row - col)) !== 0 then it's even (space), else odd (char)
// - Center the triangle using padStart with (2^n - row) spaces

const n = 5;
const char = "▲";

// Your code here
`,
  },
  {
    id: "16",
    title: "Interactive Color Mixer",
    difficulty: "medium",
    code: `// Task 16: Interactive Color Mixer
// Use three recho.number() sliders (R, G, B) to control color components.
// Display the resulting color as a block of colored emoji squares,
// the hex code, and a visual bar for each channel.
//
// Expected output:
//   R: ████████░░░░░░░░  128
//   G: ████████████░░░░  200
//   B: ████░░░░░░░░░░░░   64
//
//   Hex: #80C840
//   🟥🟩🟦 → 🟩 dominant
//
// Hints:
// - recho.number(value, {min, max, step}) creates an interactive slider
// - Map each 0-255 value to a bar of 16 characters
// - Convert to hex with .toString(16).padStart(2, "0")
// - Use echo.clear() to prevent stale output

const r = recho.number(128, {min: 0, max: 255, step: 1});
const g = recho.number(200, {min: 0, max: 255, step: 1});
const b = recho.number(64, {min: 0, max: 255, step: 1});

echo.clear();

// Your code here — display the color info
`,
  },
  {
    id: "17",
    title: "Emoji Slot Machine",
    difficulty: "medium",
    code: `// Task 17: Emoji Slot Machine
// Create a slot machine with 3 reels. Click "Spin!" to randomize.
// Display the result and whether it's a win (all 3 match).
//
// Expected output:
// ┌────────────────────┐
// │   🍒  🍋  🍒      │
// └────────────────────┘
// Try again!
//
// On a win:
// ┌────────────────────┐
// │   🍒  🍒  🍒      │
// └────────────────────┘
// 🎉 JACKPOT! 🎉
//
// Hints:
// - recho.button("Spin!", callback) to trigger spins
// - recho.state([...]) to store the current reel values
// - echo.clear() before each draw
// - Use Math.floor(Math.random() * symbols.length) for random selection

const symbols = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎"];

// Your code here
`,
  },
  {
    id: "18",
    title: "Pixel Art Canvas",
    difficulty: "medium",
    code: `// Task 18: Pixel Art Canvas
// Create a small pixel art canvas using recho.toggle() for each pixel.
// When a pixel is on, display "⬛"; when off, display "⬜".
//
// The canvas should be \`cols\` x \`rows\` pixels.
// Each pixel is an independent toggle that the user can click.
//
// Expected output (a 6x6 grid of toggleable squares):
// ⬜⬜⬛⬛⬜⬜
// ⬜⬛⬜⬜⬛⬜
// ⬛⬜⬜⬜⬜⬛
// ⬛⬜⬜⬜⬜⬛
// ⬜⬛⬜⬜⬛⬜
// ⬜⬜⬛⬛⬜⬜
//
// Hints:
// - Create a 2D array of recho.toggle(false) calls
// - Build each row by mapping toggles to "⬛"/"⬜"
// - Join columns directly (no separator) and rows with "\\n"
// - echo.set("compact", true) keeps the grid tight

const rows = 6;
const cols = 6;

// Your code here
`,
  },
  {
    id: "19",
    title: "Temperature Converter Dashboard",
    difficulty: "medium",
    code: `// Task 19: Temperature Converter Dashboard
// Build an interactive temperature converter using recho.number().
// The user inputs a value, selects the unit with recho.radio(),
// and sees conversions to all other units.
//
// Expected output:
// Input: 100 °C
//
// ┌────────────────────────────┐
// │  100.0 °C  (Celsius)      │
// │  212.0 °F  (Fahrenheit)   │
// │  373.1  K  (Kelvin)       │
// └────────────────────────────┘
//
//  °C  ████████████████████  100
//  °F  ████████████████████████████████████████  212
//   K  ██████████████████████████████████████████████████████████  373
//
// Hints:
// - recho.number(100, {min: -273, max: 1000, step: 1}) for input
// - recho.radio(0, ["Celsius", "Fahrenheit", "Kelvin"]) for unit
// - F = C * 9/5 + 32,  K = C + 273.15
// - Normalize all values for bar display (use a reasonable max)

const value = recho.number(100, {min: -273, max: 1000, step: 1});
const unit = recho.radio(0, ["Celsius", "Fahrenheit", "Kelvin"]);

echo.clear();

// Your code here
`,
  },
  {
    id: "20",
    title: "Interactive Quiz",
    difficulty: "medium",
    code: `// Task 20: Interactive Quiz
// Build a simple quiz with recho.radio() for answer selection
// and recho.button() to submit and show results.
//
// Display questions one at a time. After answering all questions,
// show the score with a visual bar and emoji feedback.
//
// Expected output:
// Q1: What does "🐍".length return in JavaScript?
//   ○ 1    ● 2    ○ 3    ○ undefined
//
// Q2: Which method removes the last element of an array?
//   ○ shift()    ○ splice()    ● pop()    ○ slice()
//
// ── Results ──────────────
// Score: 2/2  ████████████████████  100%
// 🎉 Perfect!
//
// Hints:
// - recho.radio(0, options) returns the selected option
// - Store questions with their correct answer index
// - Use recho.button() for "Show Results"
// - recho.state() to track whether results are shown

const questions = [
  {q: 'What does "🐍".length return in JavaScript?', opts: ["1", "2", "3", "undefined"], answer: 1},
  {q: "Which method removes the last element?", opts: ["shift()", "splice()", "pop()", "slice()"], answer: 2},
  {q: "What is NaN === NaN?", opts: ["true", "false", "TypeError", "undefined"], answer: 1},
];

// Your code here
`,
  },

  // ═══════════════════════════════════════════════════════════════
  // HARD TASKS (21-32): Richer case-study potential
  // ═══════════════════════════════════════════════════════════════

  {
    id: "21",
    title: "Wave Animation",
    difficulty: "hard",
    code: `// Task 21: Wave Animation
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
    id: "22",
    title: "Emoji Race",
    difficulty: "hard",
    code: `// Task 22: Emoji Race
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
    id: "23",
    title: "Landscape Scene",
    difficulty: "hard",
    code: `// Task 23: Landscape Scene
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
    id: "24",
    title: "Emoji Heatmap",
    difficulty: "hard",
    code: `// Task 24: Emoji Heatmap
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
  {
    id: "25",
    title: "Sorting Visualizer",
    difficulty: "hard",
    code: `// Task 25: Sorting Visualizer
// Create an animated visualization of a sorting algorithm.
// Display an array as vertical bars using block characters,
// highlighting the elements being compared/swapped.
//
// Use recho.interval() to step through the algorithm slowly.
// Use recho.button() to restart with a new random array.
//
// Expected output (one frame):
//       █
//    █  █     █
//  █ █  █  █  █
//  █ ██ █  █  █ █
//  █████████ ██ █
// ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
//     ↑↑ comparing
//
// Hints:
// - recho.state() to store the array and current step
// - recho.interval(300) to step through at a visible pace
// - Build vertical bars by checking each row from top to bottom
// - Use echo.set("compact", true) for tight rendering
// - Highlight compared positions with a marker row below

const arraySize = 15;

// Your code here
`,
  },
  {
    id: "26",
    title: "Game of Life",
    difficulty: "hard",
    code: `// Task 26: Game of Life
// Implement Conway's Game of Life on a grid.
// Use recho.interval() for automatic stepping and
// recho.button() for manual step / reset.
//
// Rules:
// 1. A live cell with 2 or 3 neighbors survives
// 2. A dead cell with exactly 3 neighbors becomes alive
// 3. All other cells die or stay dead
//
// Display: "⬛" for alive, "⬜" for dead
// Or use "█" / " " for a more compact look.
//
// Expected output:
// ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
// ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
// ⬜⬜⬜⬛⬛⬛⬜⬜⬜⬛⬛⬛⬜⬜⬜
// ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
// Generation: 1
//
// Hints:
// - Use a 2D array or flat array for the grid
// - Count neighbors using 8 surrounding cells (wrap edges or clamp)
// - recho.interval(200) for auto-step mode
// - recho.button("Step") for manual stepping
// - recho.button("Randomize") to reinitialize the grid
// - recho.state() to store the grid state

const gridWidth = 20;
const gridHeight = 15;

// Your code here
`,
  },
  {
    id: "27",
    title: "Digital Clock",
    difficulty: "hard",
    code: `// Task 27: Digital Clock
// Create a large animated digital clock using block characters.
// Each digit is rendered as a 5-row tall character using "█" and " ".
//
// Use recho.now() to get the current time and update every second.
//
// Expected output:
// ██  ██   ██  ██     ██  ██
//  █  ██      ██  ██   █  ██
// ██   █   ██  █      ██  ██
// █   ██      ██  ██  ██   █
// ██  ██   ██  ██     ██  ██
//
// (The above shows "12:34:56" in large digits)
//
// Hints:
// - Define each digit (0-9) and ":" as a 5-row, 3-column pattern
// - Use recho.now() to get the current timestamp
// - new Date(now) to extract hours, minutes, seconds
// - Build the output row by row: for each of the 5 rows,
//   concatenate the corresponding row of each digit
// - echo.set("compact", true) for tight display

const now = recho.now();

// Your code here
`,
  },
  {
    id: "28",
    title: "Interactive Data Dashboard",
    difficulty: "hard",
    code: `// Task 28: Interactive Data Dashboard
// Build a mini dashboard with multiple visualizations that
// respond to user controls.
//
// Use recho.radio() to select which dataset to view.
// Use recho.number() to adjust the visualization parameters.
// Display a horizontal bar chart AND a sparkline for the selected data.
//
// Expected output:
// Dataset: [Sales] Revenue  Visitors
// Period:  ◀ 12 ▶ months
//
// ── Bar Chart ──────────────
//   Jan  ██████████████     140
//   Feb  █████████████████  170
//   Mar  ████████████       120
//   ...
//
// ── Sparkline ──────────────
// ▃▅▄▆▇█▇▅▄▃▂▃
//
// ── Summary ────────────────
// Total: 1,820  Avg: 151.7  Max: 200 (Jun)
//
// Hints:
// - recho.radio(0, ["Sales", "Revenue", "Visitors"]) for dataset
// - recho.number(12, {min: 3, max: 12, step: 1}) for period
// - Display bar chart, sparkline, and summary statistics
// - Use echo.key() to separate sections

const datasets = {
  Sales:    [140, 170, 120, 155, 180, 200, 190, 165, 145, 130, 150, 175],
  Revenue:  [42, 51, 36, 47, 54, 60, 57, 50, 44, 39, 45, 53],
  Visitors: [3200, 4100, 2800, 3600, 4500, 5200, 4800, 3900, 3300, 2900, 3500, 4200],
};

// Your code here
`,
  },
  {
    id: "29",
    title: "Maze Generator",
    difficulty: "hard",
    code: `// Task 29: Maze Generator
// Generate a random maze using recursive backtracking and display it
// with box-drawing characters.
//
// Use recho.button() to generate a new maze.
// Optionally, show the solution path.
//
// Expected output:
// ┌───┬───────┬───┐
// │   │       │   │
// │   └───┐   │   │
// │       │   │   │
// ├───┐   └───┘   │
// │   │           │
// │   └───┐   ┌───┤
// │       │   │   │
// └───────┴───┴───┘
//
// Hints:
// - Create a grid where each cell has walls on all 4 sides
// - Use a stack-based DFS: pick a random unvisited neighbor,
//   remove the wall between them, and recurse
// - Render using box-drawing characters: ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼
// - Each cell is 4 characters wide, 2 rows tall in the output
// - recho.state() to store the maze grid
// - recho.button("New Maze") to regenerate

const mazeWidth = 8;
const mazeHeight = 6;

// Your code here
`,
  },
  {
    id: "30",
    title: "Animated Spirograph",
    difficulty: "hard",
    code: `// Task 30: Animated Spirograph
// Draw an animated spirograph pattern on a character grid.
// Use parametric equations to compute the curve and plot it
// using characters like "·", "●", or "█".
//
// The spirograph formula:
//   x = (R - r) * cos(t) + d * cos((R - r) / r * t)
//   y = (R - r) * sin(t) + d * sin((R - r) / r * t)
//
// Use recho.now() to animate the drawing — reveal more of the
// curve over time.
//
// Use recho.number() to adjust R, r, and d interactively.
//
// Hints:
// - Create a 2D character grid (e.g., 40x40)
// - Compute (x, y) for t from 0 to current time
// - Scale and center the coordinates to fit the grid
// - Plot each point: grid[Math.round(y)][Math.round(x)] = "●"
// - Use echo.set("compact", true) for tight rendering
// - recho.now() / 100 for a smooth reveal animation

const gridSize = 35;
const R = recho.number(10, {min: 3, max: 15, step: 1});
const r = recho.number(6, {min: 1, max: 14, step: 1});
const d = recho.number(8, {min: 1, max: 15, step: 1});

echo.clear();

// Your code here
`,
  },
  {
    id: "31",
    title: "Conway's Countdown",
    difficulty: "hard",
    code: `// Task 31: Conway's Countdown
// Build a visual countdown timer with multiple display modes.
//
// Features:
// 1. recho.number() to set the countdown duration (seconds)
// 2. recho.radio() to choose display mode:
//    - "Blocks": large digit display using block chars
//    - "Emoji": display using number emoji (0️⃣1️⃣2️⃣...)
//    - "Bar": a shrinking progress bar
// 3. recho.button("Start") to begin / recho.button("Reset") to reset
// 4. Animated using recho.interval(1000) for 1-second ticks
//
// Expected output (Bar mode, 7 seconds remaining of 10):
// ⏱️ Countdown: 7s
// ██████████████████████████████░░░░░░░░░░░░  70%
// 🟢🟢🟢🟢🟢🟢🟢⚪⚪⚪
//
// When finished:
// 🎉 TIME'S UP! 🎉
//
// Hints:
// - recho.state() to track running/remaining state
// - recho.interval(1000) returns a counter that ticks each second
// - Use the counter to calculate remaining time
// - Different display modes reuse the same countdown logic

const duration = recho.number(10, {min: 5, max: 60, step: 5});
const mode = recho.radio(0, ["Blocks", "Emoji", "Bar"]);

echo.clear();

// Your code here
`,
  },
  {
    id: "32",
    title: "Matrix Rain",
    difficulty: "hard",
    code: `// Task 32: Matrix Rain
// Create the iconic "Matrix digital rain" effect.
// Characters fall down the screen in columns at different speeds.
//
// Use recho.now() for smooth animation.
// Each column has a "drop" that falls at a random speed,
// leaving a trail of random characters that fade (use shade chars).
//
// Expected output (one frame):
//  ▓ ░  █    ░
//  █    ▓  ░ ▒
//  ▒ ░  █  ▓
//     ▒ ▓  █ ░
//  ░  █ ▒  ▓
//  ▓     ░ ▒ █
//     ░     █ ▓
//  ░  ▓  ▒   ▒
//
// Or with actual characters:
//  j     R
//  M  k  7  a
//     M  k
//  x  7  M  R
//
// Hints:
// - Create columns, each with a drop position and speed
// - Use recho.now() / speed to advance drop positions
// - For each cell, determine the character based on distance from drop head
// - Head of drop = bright char (█), trail fades: ▓ → ▒ → ░ → space
// - Or use random alphanumeric characters for the "Matrix" look
// - echo.set("compact", true) for tight frame rendering
// - Randomize initial positions so drops don't start aligned

const screenWidth = 30;
const screenHeight = 15;
const now = recho.now();

echo.clear();

// Your code here
`,
  },
];

export function getTaskById(id: string): TaskDefinition | undefined {
  return tasks.find((t) => t.id === id);
}
