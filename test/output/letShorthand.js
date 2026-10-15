let count = 1;

//➜ { count: 2 }
{
  count += 1;
  echo({count});
}

//➜ { count: 2 }
echo({count});

let name = "a";

({name = "default"} = {});

//➜ "default"
echo(name);
