export const letReassignObject = `let list = [];

list = [...list, 1];

list = [...list, 2];

echo(list);

let point = {x: 0, y: 0};

point = {...point, x: 3};

echo(point);
`;
