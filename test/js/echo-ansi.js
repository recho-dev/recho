export const echoAnsi = `const red = (s) => "\\x1b[31m" + s + "\\x1b[39m";

echo(red("RED"));

echo("\\x1b[2J\\x1b[H\\x1b[1mbold\\x1b[22m, \\x1b]8;;https://recho.dev\\x07a link\\x1b]8;;\\x07");

echo(red("a"), "b\\nc");

echo([red("nested")]);

echo("\\x1b[38;2;255;128;0m" + "x".repeat(210));

echo(red("multi\\nline"));

{
  echo.key("a")(red("cell"));
  echo.key("bb")("plain");
}`;
