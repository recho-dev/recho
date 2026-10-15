let [a, b] = [1, 2];

[a, b] = [b, a];

//➜ 2 1
echo(a, b);

let {x, y} = {x: 1, y: 2};

({x, y} = {x: y, y: x});

//➜ 2 1
echo(x, y);

let [first, ...rest] = [0];

[first, ...rest] = [1, 2, 3];

//➜ 1 [ 2, 3 ]
echo(first, rest);
