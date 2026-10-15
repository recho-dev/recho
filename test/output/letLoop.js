let output = "";

for (let i = 0; i < 10; i++) output += i;

//➜ "0123456789"
echo(output);

let triangle = "";

for (let i = 1; i <= 3; i++) triangle += "*".repeat(i) + "\n";

//➜ *  
//➜ ** 
//➜ ***
//➜    
echo(triangle);
