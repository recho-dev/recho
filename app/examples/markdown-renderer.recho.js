/**
 * @title Markdown Renderer
 * @author Luyu Cheng
 * @created 2026-10-21
 * @tui true
 */

/**
 * ============================================================================
 * =                          Markdown Renderer                               =
 * ============================================================================
 *
 * recho.md renders Markdown as coloured text, the way a terminal does:
 * headings, emphasis, code, lists, quotes, links and tables. Write it as a
 * tagged template and echo the result. Edit the notes below and run the
 * notebook to see the change.
 */

//➜ [1;35mRelease Notes[0m                                                                
//➜ [35m=============[39m                                                                
//➜                                                                              
//➜ Recho prints output as [1mtext[22m, right below the code that made it. With colour, 
//➜ that text can be [3mstyled[23m, [9mplain[29m and even [31mchalk[39m-made. Paragraphs wrap at eighty
//➜ characters, and lines written next to each other join, as in any Markdown.   
//➜                                                                              
//➜ [1;36mWhat changed[0m                                                                 
//➜ [36m------------[39m                                                                 
//➜                                                                              
//➜ [33m• [39mOutput keeps its ANSI colours                                              
//➜ [33m• [39mBackgrounds fill the whole row                                             
//➜ [33m• [39mLinks like [4;34mrecho.dev[24;2;39m https://recho.dev[22m open in a new tab                   
//➜                                                                              
//➜ [1;36mHow to try it[0m                                                                
//➜ [36m-------------[39m                                                                
//➜                                                                              
//➜ [33m1. [39mWrite Markdown in [31mrecho.md[39m                                                
//➜ [33m2. [39mPass the result to [31mecho[39m                                                   
//➜ [33m3. [39mRun the notebook                                                          
//➜                                                                              
//➜ [42m [49m [3mOutput is part of the program, so it should read well too.[23m                 
//➜                                                                              
//➜ [38;2;139;148;158;48;2;36;41;47m                                      js [0m                                    
//➜ [38;2;230;237;243;48;2;36;41;47m  [38;2;255;123;114mconst[38;2;230;237;243m chalk = recho.require([38;2;165;214;255m"chalk"[38;2;230;237;243m);  [0m                                    
//➜ [38;2;230;237;243;48;2;36;41;47m  echo(chalk.red([38;2;165;214;255m"RED"[38;2;230;237;243m));                [0m                                    
//➜ [38;2;230;237;243;48;2;36;41;47m                                         [0m                                    
echo(recho.md`
  # Release Notes

  Recho prints output as **text**, right below the code that made it.
  With colour, that text can be *styled*, ~~plain~~ and even \`chalk\`-made.
  Paragraphs wrap at eighty characters, and lines written next to each other
  join, as in any Markdown.

  ## What changed

  - Output keeps its ANSI colours
  - Backgrounds fill the whole row
  - Links like [recho.dev](https://recho.dev) open in a new tab

  ## How to try it

  1. Write Markdown in \`recho.md\`
  2. Pass the result to \`echo\`
  3. Run the notebook

  > Output is part of the program, so it should read well too.

  \`\`\`js
  const chalk = recho.require("chalk");
  echo(chalk.red("RED"));
  \`\`\`
`);

/**
 * ============================================================================
 * =                             From Values                                  =
 * ============================================================================
 *
 * Values go in with ${}. A string is read as Markdown, so it can carry
 * formatting of its own; other values are shown as echo would show them.
 * Here a table is built from data, with a bar for each row.
 */

const fruits = [
  {name: "cherry", count: 15},
  {name: "apple", count: 12},
  {name: "kiwi", count: 9},
  {name: "banana", count: 7},
];

const total = fruits.reduce((sum, fruit) => sum + fruit.count, 0);

const rows = fruits.map(({name, count}) => `| ${name} | ${count} | \`${"■".repeat(count)}\` |`).join("\n");

//➜ The basket has [1m43[22m fruits, the most of them cherry.
//➜                                                   
//➜ [2m|[22m [1mfruit[22m  [2m|[22m [1mcount[22m [2m|[22m                 [2m|[22m              
//➜ [2m|--------|-------|-----------------|[22m              
//➜ [2m|[22m cherry [2m|[22m    15 [2m|[22m [31m■■■■■■■■■■■■■■■[39m [2m|[22m              
//➜ [2m|[22m apple  [2m|[22m    12 [2m|[22m [31m■■■■■■■■■■■■[39m    [2m|[22m              
//➜ [2m|[22m kiwi   [2m|[22m     9 [2m|[22m [31m■■■■■■■■■[39m       [2m|[22m              
//➜ [2m|[22m banana [2m|[22m     7 [2m|[22m [31m■■■■■■■[39m         [2m|[22m              
echo(recho.md`
  The basket has **${total}** fruits, the most of them ${fruits[0].name}.

  | fruit | count | |
  | :--- | ---: | :--- |
  ${rows}
`);

/**
 * A task list built from data: tick a task off by setting its `done`.
 */

const tasks = [
  {done: true, text: "Support colours in output"},
  {done: true, text: "Render Markdown"},
  {done: false, text: "Present at UIST"},
];

//➜ [1mBefore the talk[22m                
//➜                                
//➜ [33m• [x] [39mSupport colours in output
//➜ [33m• [x] [39mRender Markdown          
//➜ [33m• [ ] [39mPresent at UIST          
echo(recho.md`
  ### Before the talk

  ${tasks.map((task) => `- [${task.done ? "x" : " "}] ${task.text}`).join("\n")}
`);
