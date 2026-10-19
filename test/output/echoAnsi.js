const red = (s) => "\x1b[31m" + s + "\x1b[39m";

//➜ [31mRED[39m
echo(red("RED"));

//➜ [1mbold[22m, a link
echo("\x1b[2J\x1b[H\x1b[1mbold\x1b[22m, \x1b]8;;https://recho.dev\x07a link\x1b]8;;\x07");

//➜ [31ma[39m b
//➜   c
echo(red("a"), "b\nc");

//➜ [ "\x1B[31mnested\x1B[39m" ]
echo([red("nested")]);

//➜ [38;2;255;128;0mxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx[39m…
echo("\x1b[38;2;255;128;0m" + "x".repeat(210));

//➜ [31mmulti[39m
//➜ [31mline[39m 
echo(red("multi\nline"));

//➜ +------+---------+
//➜ |  {a} |    [31mcell[39m |
//➜ |------|---------|
//➜ | {bb} | "plain" |
//➜ +------+---------+
{
  echo.key("a")(red("cell"));
  echo.key("bb")("plain");
}