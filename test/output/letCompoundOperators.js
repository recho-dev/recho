let n = 10;

n += 5;

n -= 3;

n *= 2;

n /= 4;

n **= 2;

n %= 7;

n++;

n--;

++n;

//➜ 2
echo(n);

let s = "a";

s ||= "unused";

s &&= s + "b";

s ??= "unused";

//➜ "ab"
echo(s);
