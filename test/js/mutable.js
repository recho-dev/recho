export const mutable = `const [a, mutator$$a] = __Mutator__(0);

new Promise((resolve) => {
  setTimeout(() => {
    for (let i = 0; i < 10; i++) {
      mutator$$a.value += 1;
    }
  }, 1000);
});

{
  echo(a);
}`;
