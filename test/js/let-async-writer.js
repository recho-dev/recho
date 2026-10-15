export const letAsyncWriter = `let message = "waiting";

setTimeout(() => {
  message = "done";
}, 10);

echo(message);

let count = 0;

Promise.resolve().then(() => count++);

echo(count);
`;
