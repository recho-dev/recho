/**
 * @title Introduction
 */

/**
 *  __        __   _                            _
 *  \ \      / /__| | ___ ___  _ __ ___   ___  | |_ ___
 *   \ \ /\ / / _ \ |/ __/ _ \| '_ ` _ \ / _ \ | __/ _ \
 *    \ V  V /  __/ | (_| (_) | | | | | |  __/ | || (_) |
 *     \_/\_/ \___|_|\___\___/|_| |_| |_|\___|  \__\___/
 *   ____           _
 *  |  _ \ ___  ___| |__   ___
 *  | |_) / _ \/ __| '_ \ / _ \
 *  |  _ <  __/ (__| | | | (_) |
 *  |_| \_\___|\___|_| |_|\___/
 *
 * ============================================================================
 * =                            Introduction                                  =
 * ============================================================================
 *
 * > We want to live in the editor forever. — Luyu Cheng[1]
 *
 * Recho[2] is a free, open-source, reactive editor for algorithms and ASCII
 * art. It introduces a plain code format for notebooks — echoing output inline
 * as comments for live, in-situ coding with instant feedback. Built on vanilla
 * JavaScript and the reactive model of Observable Notebook Kit[3], Recho lets
 * developers, artists, and learners explore and create directly in code.
 *
 * Here is a word counting example to show the core feature of Recho:
 * echoing output inline as comments. By calling `echo(results)`, the results
 * are displayed as comments above the statement! Now we can better understand
 * this piece of code by better "seeing" every manipulation. Notice that there
 * is no need to switch to console to see the results, which results in an
 * in-situ experience. And of course, we can be a little creative at last:
 * writing a few lines of code to create a simple visualization!
 */

const text = `The dog, cat, and mouse were playing in the yard. Dog barked loudly, while cat ran quickly. 
Mouse hid under the bench, but the dog kept looking. Cat jumped over a small fence; dog followed. 
Bird watched silently as dog, cat, and mouse moved around.`;

const ignoredWords = ["the", "was", "not", "over", "and", "in", "were", "a", "while", "but", "as", "around"];

//➜ the dog cat and mouse were playing in the yard dog barked loudly while cat ran quickly
//➜ mouse hid under the bench but the dog kept looking cat jumped over a small fence dog followed
//➜ bird watched silently as dog cat and mouse moved around
const clean = echo(text.toLowerCase().replace(/[.,!?;]/g, ""));

//➜ [ "the", "dog", "cat", "and", "mouse", "were", "playing", "in", "the", "yard", "dog", "barked", "loudly", "while", "cat", "ran", "quickly", "mouse", "hid", "under", "the", "bench", "but", "the", "dog"…
const words = echo(clean.split(/\s+/));

//➜ [ "dog", "cat", "mouse", "playing", "yard", "dog", "barked", "loudly", "cat", "ran", "quickly", "mouse", "hid", "under", "bench", "dog", "kept", "looking", "cat", "jumped", "small", "fence", "dog", "f…
const filtered = echo(words.filter((w) => !ignoredWords.includes(w)));

//➜ { dog: 5, cat: 4, mouse: 3, playing: 1, yard: 1, barked: 1, loudly: 1, ran: 1, quickly: 1, hid: 1, under: 1, bench: 1, kept: 1, looking: 1, jumped: 1, small: 1, fence: 1, followed: 1, bird: 1, watched…
const frequencies = echo(filtered.reduce((acc, w) => ((acc[w] = (acc[w] || 0) + 1), acc), {}));

//➜ 🟩🟩🟩🟩🟩 dog
//➜ 🟩🟩🟩🟩 cat
//➜ 🟩🟩🟩 mouse
//➜ 🟩 playing
//➜ 🟩 yard
//➜ 🟩 barked
//➜ 🟩 loudly
//➜ 🟩 ran
//➜ 🟩 quickly
//➜ 🟩 hid
//➜ 🟩 under
//➜ 🟩 bench
//➜ 🟩 kept
//➜ 🟩 looking
//➜ 🟩 jumped
//➜ 🟩 small
//➜ 🟩 fence
//➜ 🟩 followed
//➜ 🟩 bird
//➜ 🟩 watched
//➜ 🟩 silently
//➜ 🟩 moved
echo(
  Object.entries(frequencies)
    .map(([word, count]) => "🟩".repeat(count) + " " + word)
    .join("\n"),
);

/**
 * You want to be more creative? Let's try to create a Mandelbrot set[4]!
 */

const cols = 80;
const rows = 30;
const maxIter = 80;

//➜
//➜
//➜                                                        0
//➜                                                      0000
//➜                                                      0000
//➜                                              0       000
//➜                                              00  000000000000
//➜                                              00000000000000000000
//➜                                              0000000000000000000
//➜                                            0000000000000000000000
//➜                                          00000000000000000000000000
//➜                                0  0       000000000000000000000000
//➜                                00000000  00000000000000000000000000
//➜                               0000000000 0000000000000000000000000
//➜                              00000000000 000000000000000000000000
//➜             000000000000000000000000000000000000000000000000000
//➜                              00000000000 000000000000000000000000
//➜                               0000000000 0000000000000000000000000
//➜                                00000000  00000000000000000000000000
//➜                                0  0       000000000000000000000000
//➜                                          00000000000000000000000000
//➜                                            0000000000000000000000
//➜                                              0000000000000000000
//➜                                              00000000000000000000
//➜                                              00  000000000000
//➜                                              0       000
//➜                                                      0000
//➜                                                      0000
//➜                                                        0
//➜
{
  let output = "";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const re = map(x, 0, cols, -2.5, 1);
      const im = map(y, 0, rows, -1, 1);
      let [a, b, i] = [0, 0, 0];
      while (i < maxIter) {
        [a, b] = [a * a - b * b + re, 2 * a * b + im];
        if (a * a + b * b > 4) break;
        i++;
      }
      output += i === maxIter ? "0" : " ";
    }
    output += y === rows - 1 ? "" : "\n";
  }
  echo(output);
}

function map(x, d0, d1, r0, r1) {
  return r0 + ((r1 - r0) * (x - d0)) / (d1 - d0);
}

/**
 * Please visit the GitHub repository for more details:
 *
 * > https://github.com/recho-dev/notebook
 *
 * - [1] https://luyu.computer/
 * - [2] https://recho.dev/
 * - [3] https://github.com/observablehq/notebook-kit
 * - [4] https://recho.dev/explore/mandelbrot-set
 * - [5] https://en.wikipedia.org/wiki/Mandelbrot_set
 * - [6] https://recho.dev/docs/getting-started
 */
