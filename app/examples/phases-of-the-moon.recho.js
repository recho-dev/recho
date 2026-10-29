/**
 * @title Phases of The Moon
 * @author Luyu Cheng
 * @created 2025-09-12
 * @pull_request 90
 * @github chengluyu
 * @label ASCII Art
 * @tui true
 */

/**
 * =============================================================================
 * =                        Phases of the Moon                                 =
 * =============================================================================
 *
 * A lunar calendar visualization showing the phases of the moon throughout
 * a year. This example shows how to create bespoken visualizations in Recho
 * using various Unicode characters.
 *
 * The implementation calculates moon phases for each day of the year using
 * astronomical algorithms provided by [suncalc][1], then displays them in a
 * calendar format. The visualization shows:
 *
 * - moon phase emojis for each day of the year;
 * - the calendar grid with proper alignment using full-width spaces; and
 * - month names and day-of-week headers using circled Unicode characters.
 *
 * The rendering system constructs a character grid that accommodates the
 * varying lengths of month names while maintaining visual alignment.
 *
 * This is a remastered version of [Mike Bostock's implementation][2], which is
 * inspired by [2013 Phases of the Moon Calendar by Irwin Glusker][3].
 *
 * Adjust the `year` parameter to view moon phases for different years!
 *
 * [1]: https://www.npmjs.com/package/suncalc
 * [2]: https://observablehq.com/@mbostock/phases-of-the-moon
 * [3]: https://www.moma.org/explore/inside_out/2012/10/16/a-paean-to-the-phases-of-the-moon/
 */

const year = 2025;

//➜ ╏           ╎ ⓉⓌⓇⒻⓈⓊⓂⓉⓌⓇⒻⓈⓊⓂⓉⓌⓇⒻⓈⓊⓂⓉⓌⓇⒻⓈⓊⓂⓉⓌⓇⒻⓈⓊⓂⓉⓌ ╏
//➜ ╏   January ╎ 　　　🌑🌑🌒🌒🌒🌓🌓🌓🌔🌔🌔🌔🌕🌕🌕🌖🌖🌖🌖🌖🌗🌗🌗🌗🌘🌘🌘🌘🌑🌑🌑　　　 ╏
//➜ ╏  February ╎ 　　　　　　🌒🌒🌒🌒🌓🌓🌓🌔🌔🌔🌕🌕🌕🌕🌖🌖🌖🌖🌗🌗🌗🌗🌘🌘🌘🌘🌑🌑　　　 ╏
//➜ ╏     March ╎ 　　　　　　🌑🌑🌒🌒🌒🌓🌓🌓🌔🌔🌔🌔🌕🌕🌕🌕🌖🌖🌖🌖🌗🌗🌗🌗🌘🌘🌘🌘🌑🌑🌑 ╏
//➜ ╏     April ╎ 　　🌒🌒🌒🌓🌓🌓🌓🌔🌔🌔🌔🌕🌕🌕🌕🌖🌖🌖🌖🌗🌗🌗🌗🌘🌘🌘🌑🌑🌑🌒　　　　　 ╏
//➜ ╏       May ╎ 　　　　🌒🌒🌒🌓🌓🌓🌔🌔🌔🌔🌕🌕🌕🌕🌕🌖🌖🌖🌗🌗🌗🌗🌘🌘🌘🌑🌑🌑🌑🌒🌒　　 ╏
//➜ ╏      June ╎ 🌒🌓🌓🌓🌓🌔🌔🌔🌔🌕🌕🌕🌕🌖🌖🌖🌖🌗🌗🌗🌘🌘🌘🌘🌑🌑🌑🌒🌒🌒　　　　　　　 ╏
//➜ ╏      July ╎ 　　🌒🌓🌓🌓🌓🌔🌔🌔🌔🌕🌕🌕🌕🌖🌖🌖🌗🌗🌗🌘🌘🌘🌘🌑🌑🌑🌒🌒🌒🌒🌓　　　　 ╏
//➜ ╏    August ╎ 　　　　　🌓🌓🌓🌔🌔🌔🌔🌕🌕🌕🌕🌖🌖🌖🌗🌗🌗🌗🌘🌘🌘🌑🌑🌑🌑🌒🌒🌒🌒🌓🌓　 ╏
//➜ ╏ September ╎ 　🌓🌓🌔🌔🌔🌔🌕🌕🌕🌖🌖🌖🌖🌗🌗🌗🌘🌘🌘🌘🌑🌑🌑🌑🌒🌒🌒🌒🌓🌓　　　　　　 ╏
//➜ ╏   October ╎ 　　　🌓🌓🌔🌔🌔🌕🌕🌕🌕🌖🌖🌖🌗🌗🌗🌘🌘🌘🌘🌑🌑🌑🌑🌒🌒🌒🌒🌓🌓🌓🌓　　　 ╏
//➜ ╏  November ╎ 　　　　　　🌔🌔🌔🌔🌕🌕🌕🌖🌖🌖🌗🌗🌗🌗🌘🌘🌘🌘🌑🌑🌑🌑🌒🌒🌒🌒🌓🌓🌓🌓　 ╏
//➜ ╏  December ╎ 　🌔🌔🌔🌕🌕🌕🌖🌖🌖🌖🌗🌗🌗🌗🌘🌘🌘🌘🌑🌑🌑🌑🌒🌒🌒🌒🌓🌓🌓🌔🌔　　　　　 ╏
{
  const matrix = _.times(12, () => _.times(6 * 7, () => SPACE));
  for (const day of days) {
    const row = day.getMonth();
    const column = day.getDate() + months[row].getDay();
    matrix[row][column] = getMoonEmoji(day);
  }
  // Remove the leading and trailing spaces from the header and each row.
  const head = Math.min(...matrix.map((xs) => xs.findIndex((x) => x !== SPACE)));
  const tail = Math.max(...matrix.map((xs) => xs.findLastIndex((x) => x !== SPACE))) + 1;
  echo(line(" ".repeat(longestLength), header.slice(head, tail)), {quote: false});
  echo(matrix.map((x, i) => line(alignedMonthNames[i], x.slice(head, tail).join(""))).join("\n"));
}

function line(...items) {
  return "╏ " + items.join(" ╎ ") + " ╏";
}

const header = "ⓂⓉⓌⓇⒻⓈⓊ".repeat(7);
const months = d3.timeMonths(theFirstDay, theLastDay);
const longestLength = monthNames.reduce((x, y) => Math.max(x, y.length), 0);
const monthNames = months.map(d3.timeFormat("%B"));
const alignedMonthNames = monthNames.map((n) => n.padStart(longestLength, " "));

const theFirstDay = d3.timeYear(new Date(year, 0, 1));
const theLastDay = d3.timeYear.offset(theFirstDay, 1);
const days = d3.timeDays(theFirstDay, theLastDay);

const SPACE = "\u3000"; // Full-width space

function getMoonEmoji(date) {
  const index = Math.round(suncalc.getMoonIllumination(date).phase * 8);
  return String.fromCodePoint(0x1f311 + (index === 8 ? 0 : index));
}

const suncalc = recho.require("suncalc@1.9.0");
const d3 = recho.require("d3-time", "d3-time-format");
const _ = recho.require("lodash");
