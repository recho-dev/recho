let count = 0;

function increment() {
  return ++count;
}

//✗ [Error: `count` is read and changed in the same block. Split it into two blocks.]
echo(count, increment());
