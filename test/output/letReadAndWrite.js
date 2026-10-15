let count = 0;

function increment() {
  return ++count;
}

//✗ [Error: `count` is changed by a block that also depends on it (directly or through other blocks), so the block would re-run forever. Split it into separate blocks.]
echo(count, increment());
