/**
 * @title White Noise
 * @author Bairui Su
 * @created 2026-09-18
 * @pull_request 233
 * @github pearmini
 * @label ASCII Art
 * @tui true
 */

/**
 * ============================================================================
 * =                            White Noise                                   =
 * ============================================================================
 *
 * Recreated the White Noise notebook[1] from Observable in Recho. Random
 * printable characters flicker like static around a stamped ASCII banner.
 *
 * Feel free to tweak `width` and `height` to see the changes!
 */

const width = 64;
const height = 20;
const d3 = recho.require("d3-array", "d3-random");
const n = width * height;
const random = d3.randomInt(32, 127);
const char = () => String.fromCharCode(random());
const buffer = d3.range(n).map(char);
const frame = recho.interval(60);

//➜ ~Z[53#7E%i+/1<kVYC<xidc7x7#"#QOhDJ%QHv&Vc2Q`GDtO'zDM8.ItQOXkwzu5
//➜ aS'N^kL1i$A93q24_qpPlg)s+7/,6#Y^q<`CdS6(RZ8F"K G'3e<(*DS5AEyeuZa
//➜ <g!?0vT%pO3H05/QSBbYs`Q4NBAlzm6DC\sA:F-U~SBX{[bqVR5fwJXKU{3/ 5t?
//➜ U[0TE}#C* $KkzY+sV1v&2l&R)yl!Z55wX5tEA;NyPe=r8N,{TK\I Y1N9LK5?o!
//➜ 6' ]Qz7O;?|[]R4e*plgTzfD[Z!Y}6V`=~T}CvJiF|p qndsP*diygUto48 $#rQ
//➜ ^y4^*8d}|Do38PLx#qWX7vp#Z6b9&DR{y!>;B0{.TqU-#]SoL"f@ookzAc,'SvBQ
//➜ S}N6,T|b|!0]:"/sK!ktS*Cji,eiszi+~(.9 -<]ApI,Wa^-9Z?uC9Z2h{Iyxa~%
//➜ i,1\5Q  _   _  TC  _ _       % _b__         nl_  $  m      @RE[d
//➜ (Y2hL/N| | | | ___4 |M| ___   |  _ \ ___/ ___|N|__  6_i_}  K{Nm.
//➜ IS"^/+ | |_P |/ _~\|| |/ _ \  | |_> / _ 0/ __| '_]\ / _ @  `u#q[
//➜ PP5#3F | Jg  |  __/ | | (_) | '  _ <  __/  __| | | ? B_) | D:kf]
//➜ Ie54]Y |_| |_|\___|_|_|\___/  |v| \_\___|\___|_| |_|Q___,  Q-w:"
//➜ ]okDL4'        c                 @   :          z      ^   U^T<7
//➜ &|xt;N{?r*d,'3(or1|ZP@1%w)^5\w,W<'6fwFIE~Fq!c5sBgylCGq`gI`^!iL=+
//➜ wqI$nNX,f--PD,iYRkHA^O>q6'=SwPG(\r,6ufd5ANf<^Y]ws^KC,^F Z)MclBX7
//➜ }qy8Axz_o3rz`f'~DQIl`[+RhBqcZjJHjf.9i=_a8KI 8c(]SH=e'E@/=W^iesw7
//➜ EXq<Fyv2,{wO~p-^nL=Ht'gz-I7.v7z|4y0 qxuifNu_t8@bL"|vB0 +V[jIL`/R
//➜ jU':{7Zg~kd;zd=+ljuy;=/~'$QZ_tmW?7!<}[V5X?z>esf\Y`s";NXG,Dz'bT"J
//➜ fqpk:W{%+<Lr`aHT'P2<U5$GQ{}][c7EJ^f!-%y#RL(d_0Q`>*a8RZ_$vSeq0']$
//➜ BQtcORh):.EM!tL<4_;VLT."%"c*lWw1bx/T]mqDw"BXmZ"lJrcw!YBe%b2K![x4
{
  let output = "";
  text(buffer, helloRecho, ~~(width / 2), ~~(height / 2));
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      Math.random() > 0.9 && (buffer[index(j, i)] = char());
      output += buffer[index(j, i)];
    }
    output += i === height - 1 ? "" : "\n";
  }
  echo(output);
  frame;
}

const helloRecho = String.raw`  _   _      _ _         ____           _            
 | | | | ___| | | ___   |  _ \ ___  ___| |__   ___   
 | |_| |/ _ \ | |/ _ \  | |_) / _ \/ __| '_ \ / _ \  
 |  _  |  __/ | | (_) | |  _ <  __/ (__| | | | (_) | 
 |_| |_|\___|_|_|\___/  |_| \_\___|\___|_| |_|\___/  
                                                     
`;

function text(buffer, string, x, y) {
  const matrix = string.split("\n").map((l) => l.split(""));
  const dx = ~~(d3.max(matrix, (d) => d.length) / 2);
  const dy = ~~(matrix.length / 2);
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    for (let j = 0; j < row.length; j++) {
      buffer[index(x + j - dx, y + i - dy)] = row[j];
    }
  }
  return matrix;
}

function index(i, j) {
  return j * width + i;
}

/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                              References
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * [1] https://observablehq.com/d/9e951c5e9d721ef5
 * [2] https://recho.dev/examples/matrix-rain
 */
