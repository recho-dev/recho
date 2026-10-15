let message = "waiting";

setTimeout(() => {
  message = "done";
}, 10);

//➜ "done"
echo(message);

let count = 0;

Promise.resolve().then(() => count++);

//➜ 1
echo(count);
