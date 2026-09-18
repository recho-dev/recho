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
const helloRecho = String.raw`  _   _      _ _         ____           _            
 | | | | ___| | | ___   |  _ \ ___  ___| |__   ___   
 | |_| |/ _ \ | |/ _ \  | |_) / _ \/ __| '_ \ / _ \  
 |  _  |  __/ | | (_) | |  _ <  __/ (__| | | | (_) | 
 |_| |_|\___|_|_|\___/  |_| \_\___|\___|_| |_|\___/  
                                                     
`;
const n = width * height;
const random = d3.randomInt(32, 127);
const char = () => String.fromCharCode(random());
const buffer = d3.range(n).map(char);
const frame = recho.interval(60);

//➜ ?~J2g@H<5VyR=bC;Z="seqcHon1nSLP?g\AsvnNEj=9uqU-"Va+d?u|bu>'#vIa"
//➜ /qV)@+!":}R1Fa \EcPO\Y_Ir$LYUt"yo*ZRUY-"IN]'fr%S7<RE1$mvxi<#MA{K
//➜ 'f-0}iGtLky 5rs&m_|\q;!Pipq?D,BwP;J)7!e)^<ahCyy5oS>^P*Q6jv',xa<v
//➜ Hzm5bfO&A^@Jo/d dIR5{o]b%o[1~,j|ZdHo_uIFpj}k8|y?18y)6!/BIP>`2[db
//➜ PHG!3$L@6^w6r>i@q"4"-DF*.Tk236y'}UNq$eXu6jb%up.tfHb7(|7,E?4-YCAT
//➜ u3b+~0^(p 4)^<p53^wTiNEy@RK 1G'-1^M/[w}%/Tl73"PWdsw)A71Sn^}FpUZ.
//➜ Cv{gYIC:Q5&~ 3) dV-]sbz, B8uW-s4h1bjiX0;b-E`*`Wu>'^@p*T8R7;@&!mx
//➜ u.hrk8  _ $ _      _ R   1     _m__C          _    `    W  !9iW]
//➜ #7 VP< | | | | ___| | | _Vy   |  _ \ ___  ___| |__   ___   /L}(U
//➜ q{BpT0 | |_( |+ _ \ | |/ _ \  | |_) / _ \/ __| '_ \ / _ \  Y1:u[
//➜ _.&'0? |  _ z|  __/ | | (_) | |+ _ <  __/ (I_| | | | (_) | k=&Z@
//➜ x\Bw,w |_| l_|\__E|_|*#\___/  |_| \p}___|\___|_| |_|\___/  M0a,h
//➜ UHWBPe  V J.    Nr   ! [  |                                ;5opV
//➜ >Qc#|1)}4P1 rf"nU?sY^/[V-#![r.Z2)T%^m$[39(.bSeA7W3?yHvmrfOlos61&
//➜ W&5h?_e5XcQ/9;sb#fnIc{0T$j]QAo-]ic~v#G;g;&hxi+:DQ_YhEL$KE],^'UEP
//➜ \9c\1$75mz 8(E K@0C-*!m9;r9dL/qW&_baJ[-Y!Q3/4%dSgA/i`dL@|jw!G]X#
//➜ RK6&y(X%LQr)(q#*.KyB7[0k*^=Se/5!3v0ddL)S1=#odQ &'P@FrK>`Rko G}cx
//➜ ,":vb{vdD-_5pt:Nt>9y.Ps{8!=KpBE\{H^Ljd\%$-[A,PJ'Ye\ey$JkK"_4(6}+
//➜ H6xz<k8mQZ(w?7WNX2T%N/PeTb2VbP~?D0!v7H,IRWJ@xynxVjI!!RUEa.(jr7KI
//➜ l[+mkG^TB?3,kjU1DI2-sYbP0S+WO -XTdYjzlYS|."$(#i?0AUDDt]R!Vxi!B*|
{
  let output = "";
  text(buffer, helloRecho, ~~(width / 2), ~~(height / 2));
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const update = Math.random() > 0.9;
      output += update ? char() : buffer[index(j, i)];
    }
    output += i === height - 1 ? "" : "\n";
  }
  echo(output);
  frame;
}

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
