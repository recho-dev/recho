export const letShorthand = `let count = 1;

{
  count += 1;
  echo({count});
}

echo({count});

let name = "a";

({name = "default"} = {});

echo(name);
`;
