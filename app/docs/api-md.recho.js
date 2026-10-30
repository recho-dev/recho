/**
 * @title recho.md`markdown`
 */

/**
 * ============================================================================
 * =                          recho.md`markdown`                              =
 * ============================================================================
 *
 * Renders Markdown as coloured text, for echo to show. Write it as a tagged
 * template, or pass a string: recho.md(text).
 *
 * Paragraphs wrap at 80 characters, and lines written next to each other join,
 * as in any Markdown. The indentation the template's lines share is removed,
 * so it can be indented with the code around it.
 *
 * @param {string} markdown - The Markdown to render.
 * @returns {Markdown} The rendered text. echo shows it as is; String(value)
 *   is the text with its ANSI colour codes.
 */

//➜ [1;35mA heading[0m                                                                    
//➜ [35m=========[39m                                                                    
//➜                                                                              
//➜ Text can be [1mbold[22m, [3mitalic[23m, [9mstruck[29m or [31mcode[39m, and links show their address: [4;34mRecho[0m
//➜ [2mhttps://recho.dev[22m.                                                           
echo(recho.md`
  # A heading

  Text can be **bold**, *italic*, ~~struck~~ or \`code\`, and links show
  their address: [Recho](https://recho.dev).
`);

/**
 * Lists, quotes and code blocks.
 */

//➜ [33m•     [39mA list              
//➜       [33m• [39mwith a nested item
//➜ [33m• [x] [39mand a task          
//➜                           
//➜ [42m [49m [3mA quote.[23m                
//➜                           
//➜ [38;2;139;148;158;48;2;36;41;47m                   js [0m    
//➜ [38;2;230;237;243;48;2;36;41;47m  [38;2;255;123;114mconst[38;2;230;237;243m answer = [38;2;121;192;255m42[38;2;230;237;243m;  [0m    
//➜ [38;2;230;237;243;48;2;36;41;47m                      [0m    
echo(recho.md`
  - A list
    - with a nested item
  - [x] and a task

  > A quote.

  \`\`\`js
  const answer = 42;
  \`\`\`
`);

/**
 * Values go in with ${}. A string is read as Markdown, other values are shown
 * as echo would show them.
 */

const name = "world";

const numbers = [1, 2, 3];

//➜ Hello, [1mworld[22m! The numbers are [ 1, 2, 3 ].
echo(recho.md`Hello, **${name}**! The numbers are ${numbers}.`);

/**
 * Tables are drawn with | and -, and keep their column alignment.
 */

//➜ [2m|[22m [1mname[22m  [2m|[22m [1mcount[22m [2m|[22m
//➜ [2m|-------|-------|[22m
//➜ [2m|[22m apple [2m|[22m    12 [2m|[22m
//➜ [2m|[22m kiwi  [2m|[22m     9 [2m|[22m
echo(recho.md`
  | name | count |
  | :--- | ---: |
  | apple | 12 |
  | kiwi | 9 |
`);
