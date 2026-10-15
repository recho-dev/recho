export const letShadowing = `let a = 1;

a = 5;

function withParam(a) {
  a = a + 1;
  return a;
}

function withLocal() {
  let a = 0;
  a++;
  return a;
}

{
  let a = 100;
  a++;
}

echo(withParam(1), withLocal(), a);
`;
