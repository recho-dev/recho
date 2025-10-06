export const echoKey = `binarySearch('g', ["a", "b", "c", "d"], echo);

function binarySearch(key, array, echo=() => {}) {
  let lo = 0;
  let hi = array.length - 1;
  while (lo <= hi) {
    const mi = Math.floor((lo + hi) / 2);
    const val = array[mi];
    echo(lo, {key: "lo"});
    echo(hi, {key: "hi"});
    echo(mi, {key: "mi"});
    echo(val, {key: "val"});
    if (val < key) lo = mi + 1;
    else if (val > key) hi = mi - 1;
    else return mi;
  }
  return -1;
}`;
