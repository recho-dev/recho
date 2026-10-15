const c = 1;

//✗ [SyntaxError: Assignment to external variable 'c' (1:0)]
c = 2;

//✗ [SyntaxError: Assignment to external variable 'undeclared' (1:0)]
undeclared = 1;

//➜ "still runs"
echo("still runs");
