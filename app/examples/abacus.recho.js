/**
 * @title Abacus
 * @author Bairui Su
 * @created 2026-01-01
 * @github pearmini
 * @pull_request 206
 * @thumbnail_start 40
 * @label Algorithm
 * @tui true
 */

/**
 * ============================================================================
 * =                            Abacus                                        =
 * ============================================================================
 *
 * Learning classic Chinese abacus (5+2). An abacus can be considered a a way
 * of visualizing numbers.
 *
 *  - Ref. https://www.youtube.com/watch?v=FTVXUG_PngE&t=15s
 */

const n = recho.number(0, {min: 0, max: Infinity, step: 1});

//➜ n = 7
//➜ ╔═════════════╗
//➜ ║●●●●●●●●●●●●●║
//➜ ║●●●●●●●●●●●● ║
//➜ ║            ●║
//➜ ║═════════════║
//➜ ║            ●║
//➜ ║            ●║
//➜ ║●●●●●●●●●●●● ║
//➜ ║●●●●●●●●●●●● ║
//➜ ║●●●●●●●●●●●●●║
//➜ ║●●●●●●●●●●●●●║
//➜ ║●●●●●●●●●●●●●║
//➜ ╚═════════════╝
abacus(n);

const x = recho.interval(200);

//➜ n = 152
//➜ ╔═════════════╗
//➜ ║●●●●●●●●●●●●●║
//➜ ║●●●●●●●●●●● ●║
//➜ ║           ● ║
//➜ ║═════════════║
//➜ ║          ● ●║
//➜ ║            ●║
//➜ ║●●●●●●●●●● ● ║
//➜ ║●●●●●●●●●●●● ║
//➜ ║●●●●●●●●●●●●●║
//➜ ║●●●●●●●●●●●●●║
//➜ ║●●●●●●●●●●●●●║
//➜ ╚═════════════╝
abacus(x);

function abacus(x = 0) {
  const bits = (x + "").padStart(13, "0");
  const canvas = new Canvas(15, 13);
  canvas.frame(0, 0, 15, 13);
  canvas.lineY(4, 1, 13, "═");
  for (let i = 0; i < bits.length; i++) {
    const n = parseInt(bits[i]);
    let line = "";
    // prettier-ignore
    switch (n) {
      case 0: line = "1100011111"; break;
      case 1: line = "1101001111"; break;
      case 2: line = "1101100111"; break;
      case 3: line = "1101110011"; break;
      case 4: line = "1101111001"; break;
      case 5: line = "1010011111"; break;
      case 6: line = "1011001111"; break;
      case 7: line = "1011100111"; break;
      case 8: line = "1011110011"; break;
      case 9: line = "1011111001"; break;
    }
    line = line.slice(0, 3) + "x" + line.slice(3);
    for (let j = 0; j < line.length; j++) {
      const b = line[j];
      if (b === "x") continue;
      canvas.point(i + 1, j + 1, b === "1" ? "●" : " ");
    }
  }
  const styled = echo.set("compact", true).set("typeface", "Google Sans Code");
  styled("n = " + x + "\n" + canvas.toString());
}

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.clear();
  }
  frame(x, y, width, height) {
    this.lineY(y, x, x + width - 1, "═");
    this.lineY(y + height - 1, x, x + width - 1, "═");
    this.lineX(x, y, y + height - 1, "║");
    this.lineX(x + width - 1, y, y + height - 1, "║");
    this.point(x, y, "╔");
    this.point(x + width - 1, y, "╗");
    this.point(x, y + height - 1, "╚");
    this.point(x + width - 1, y + height - 1, "╝");
  }
  lineY(y, x, x1, ch) {
    for (let i = x; i <= x1; i++) {
      this.point(i, y, ch);
    }
  }
  lineX(x, y, y1, ch) {
    for (let i = y; i <= y1; i++) {
      this.point(x, i, ch);
    }
  }
  point(x, y, ch) {
    this.buffer[y * this.width + x] = ch;
  }
  clear() {
    this.buffer = d3.range(this.width * this.height).map(() => " ");
  }
  toString() {
    let output = "";
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        output += this.buffer[i * this.width + j];
      }
      output += i === this.height - 1 ? "" : "\n";
    }
    return output;
  }
}

const d3 = recho.require("d3-array");
