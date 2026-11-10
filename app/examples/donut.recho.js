/**
 * @title Donut, Donut, and Donut!!!
 * @author Bairui Su
 * @created 2025-09-30
 * @pull_request 133
 * @github pearmini
 * @label ASCII Art
 * @thumbnail_start 35
 * @thumbnail_start_x 30
 * @tui true
 */

/**
 * ============================================================================
 * =                      Donut, Donut, and Donut!!!                          =
 * ============================================================================
 *
 * > This first donut code is ported from https://www.a1k0n.net/js/donut.js, 
 * > the original author is Alex Naka, please refer to the original post for 
 * > more math details: https://www.a1k0n.net/2011/07/20/donut-math.html
 *
 * In this example, we draw a donut by a "donut" code, and the code for
 * formatting the "donut" code is also a "donut" code. So, there are three 
 * donuts in this example!!!
 */

// Click to change the rotation speed of the donut.
const S = recho.number(10, {min: 5, max: 30, step: 1});

const T = recho.interval(30);

//➜                                                                                
//➜                                                                                
//➜                                                                                
//➜                                           $$$@@@@@@                            
//➜                                      #####**###$$$$@@@@$                       
//➜                                   ##**!!!==!!!**##$$$@@@$$                     
//➜                                 ##*!=!===;;:;=!!*##$$$$$$$$#                   
//➜                               *#**!!=;::~~~~::==**##$$$$$$$#*                  
//➜                              ###*!=;:~-,...,-~;=!*###$$$$$$##*                 
//➜                            !####*!=:~,.......~;=!*###$$$$$$##*                 
//➜                           =#$$$##*=:-.....  .~;!!*####$$$$###*!                
//➜                           *$$$$$#*!;~..     ~=!**###########**=                
//➜                          !#$$@@$$#*=~.     :=!**###########**!=                
//➜                          !#$@@@@$$#*;    ;!!***##########***!!;                
//➜                          !#$$@@@@$$#*!!!!****##########****!!=:                
//➜                          =*#$$$$$$$#################*****!!!=:                 
//➜                          ;!*##$$$$##############*******!!!=;;                  
//➜                          :;!**############*********!*!!!==;:                   
//➜                           :=!!!***************!*!*!!!!==;:~                    
//➜                            :;!===!***!!!!!!!!!!!!!!===;:~-                     
//➜                             ~:;=====!!!!!!!!!====;;;::~,                       
//➜                               -~::;;;===;=;;;;;;:::~-.                         
//➜ 
{
                                                                                  
                                    var b=[];var z=[];                              
                                var A=1+(T*0.07*S)/10;var                          
                              B=1+(T*0.03*S)/10;var sin=/***/                       
                             Math.sin;var cos=Math.cos;var cA=                      
                           cos(A),sA=sin(A),cB=cos(B),sB=sin(B);                    
                          for(var k=0;k<1760;k++){b[k]=k%80==79?                    
                         "\n":" ";z[k]=0;}for (var j=0;j<6.28;j+=                   
                        0.07){var ct=/**/          cos(j),st=sin(j);                
                        for(var i=0;i<              6.28;i+=0.02){                  
                        var sp=sin(i),               cp=cos(i),h=ct                 
                        +2,D=1/(sp*h*                 sA+st*cA+5),t                 
                        =sp*h*cA-st*sA;              var x=0|(40+30                 
                        *D*(cp*h*cB-t*              sB)),y=0|(12+15                 
                        *D*(cp*h*sB+t*/**/         cB)),o=x+80*y,N=                 
                         0|(8*((st*sA-sp*ct*  cA)*cB-sp*ct*sA-st*cA                 
                          -cp*ct*sB));if(y<22&&y>=0&&x>=0&&x<79&&                   
                           D>z[o]){z[o]=D;b[o]=".,-~:;=!*#$@"[N>                    
                             0?N:0];}}}echo(b.join(""));/*****                      
                              *******************************                       
                                *************************                          
                                    ******************/                             
 
}


/**
 * We use a format function to format the code for drawing the 
 * donut. The readable code is as follows:
 */

//➜                                                                                
//➜                                                                                
//➜                                var b=[];var z=[];                              
//➜                             var A=1+(T*0.07*S)/10;var                          
//➜                          B=1+(T*0.03*S)/10;var sin=/***/                       
//➜                         Math.sin;var cos=Math.cos;var cA=                      
//➜                       cos(A),sA=sin(A),cB=cos(B),sB=sin(B);                    
//➜                      for(var k=0;k<1760;k++){b[k]=k%80==79?                    
//➜                     "\n":" ";z[k]=0;}for (var j=0;j<6.28;j+=                   
//➜                    0.07){var ct=/**/          cos(j),st=sin(j);                
//➜                    for(var i=0;i<              6.28;i+=0.02){                  
//➜                    var sp=sin(i),               cp=cos(i),h=ct                 
//➜                    +2,D=1/(sp*h*                 sA+st*cA+5),t                 
//➜                    =sp*h*cA-st*sA;              var x=0|(40+30                 
//➜                    *D*(cp*h*cB-t*              sB)),y=0|(12+15                 
//➜                    *D*(cp*h*sB+t*/**/         cB)),o=x+80*y,N=                 
//➜                     0|(8*((st*sA-sp*ct*  cA)*cB-sp*ct*sA-st*cA                 
//➜                      -cp*ct*sB));if(y<22&&y>=0&&x>=0&&x<79&&                   
//➜                       D>z[o]){z[o]=D;b[o]=".,-~:;=!*#$@"[N>                    
//➜                         0?N:0];}}}echo(b.join(""));/*****                      
//➜                          *******************************                       
//➜                             *************************                          
//➜                                ******************/                             
//➜                                                                                
//➜
echo(format(`
var b = [];
var z = [];
var A = 1 + (T * 0.07 * S) / 10;
var B = 1 + (T * 0.03 * S) / 10;
var sin = Math.sin;
var cos = Math.cos;
var cA = cos(A),
  sA = sin(A),
  cB = cos(B),
  sB = sin(B);
for (var k = 0; k < 1760; k++) {
  b[k] = k % 80 == 79 ? "\\n" : " ";
  z[k] = 0;
}
for (var j = 0; j < 6.28; j += 0.07) {
  var ct = cos(j),
    st = sin(j);
  for (var i = 0; i < 6.28; i += 0.02) {
    var sp = sin(i),
      cp = cos(i),
      h = ct + 2,
      D = 1 / (sp * h * sA + st * cA + 5),
      t = sp * h * cA - st * sA;
    var x = 0 | (40 + 30 * D * (cp * h * cB - t * sB)),
      y = 0 | (12 + 15 * D * (cp * h * sB + t * cB)),
      o = x + 80 * y,
      N = 0 | (8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB));
    if (y < 22 && y >= 0 && x >= 0 && x < 79 && D > z[o]) {
      z[o] = D;
      b[o] = ".,-~:;=!*#$@"[N > 0 ? N : 0];
    }
  }
}
echo(b.join(""));
`));

/**
 * !!! The format function is also a "donut" code !!!
 */

                                    function /********/                             
                                format(code,{w=80,h=24,K=/**/                       
                              ["var"],R1=11,R2=4}={}){let n=w                       
                            *h,mi=-1,M=new Array(n).fill(null),                     
                          T=code.replace('" "',"__")/**********/                   
                        .replace(/\s+/g," ").split(" ").filter((d)=>                  
                        d!=="").map((d)=>d.replace("__",'" "')),tn=                 
                       T.length;for(let i=0;i <n;i++){let x=i%w,y=/**/              
                      Math.floor(i/w),d=           Math.hypot((x-w/2)               
                      /2,y-h/2),m=d<R1&&            d>R2;if(m)mi=i;/**/             
                      M[i]=m?1:x===w-1               ?"\n":" ";}let ni=                
                      -1;for(let i=0,                 wi=0;i<n;i++){if              
                      (M[i]!==1)/****/               continue;if(wi<                
                      tn){let s=T[wi];if            (K.some((k)=>/**/               
                      s.includes(k)))s=s           +" ";let si=0;while               
                       (M[i+si]===1)si++;if(si<s.length-1)s=si-1<=0?                
                        " ":"/*"+"*".repeat(Math.max(0,si-4))+"*/";                  
                         else wi++;for(let k=0;k<s.length;k++)M[(ni                 
                          =i+k)]=s[k];}else if(i-ni<=2)M[i]="/*"[i                  
                            -ni-1];else if(mi-i<=1)M[i]="/*"[mi-i];                     
                              else M[i]="*";}return M.join("")                       
                                ;}/**************************                         
                                    ******************/ 

 /**
 * We use format function to format itself. Note that we have to manually
 * adjust a little bit to make sure the formatted code actually runs, 
 * including changing "" to " ", and unwrapping `M.join("")`, etc.
 */

 //➜                                                                                
//➜                                function /********/                             
//➜                            format(code,{w=80,h=24,K=/**/                       
//➜                          ["var"],R1=11,R2=4}={}){let n=w                       
//➜                        *h,mi=-1,M=new Array(n).fill(null),                     
//➜                      T=code.replace('" "',"" "")/**********/                   
//➜                     .replace(/s+/g,"").split("").filter((d)=>                  
//➜                    d!=="").map((d)=>d.replace("" "",'""')),tn=                 
//➜                   T.length;for(let i=0;i <n;i++){let x=i%w,y=/**/              
//➜                  Math.floor(i/w),d=           Math.hypot((x-w/2)               
//➜                  /2,y-h/2),m=d<R1&&            d>R2;if(m)mi=i;/**/             
//➜                  M[i]=m?1:x===w-1               ?"":"";}let ni=                
//➜                  -1;for(let i=0,                 wi=0;i<n;i++){if              
//➜                  (M[i]!==1)/****/               continue;if(wi<                
//➜                  tn){let s=T[wi];if            (K.some((k)=>/**/               
//➜                  s.includes(k)))s=s           +"";let si=0;while               
//➜                   (M[i+si]===1)si++;if(si<s.length-1)s=si-1<=0?                
//➜                    "":"/*"+"*".repeat(Math.max(0,si-4))+"*/";                  
//➜                     else wi++;for(let k=0;k<s.length;k++)M[(ni                 
//➜                      =i+k)]=s[k];}else if(i-ni<=2)M[i]="/*"[i                  
//➜                        -ni-1];else if(mi-i<=1)M[i]="/*"[mi                     
//➜                          -i];else M[i]="*";}return /***/                       
//➜                            M.join("");}/**************                         
//➜                                ******************/                             
//➜ 
echo(format(`
  function format(code, {w = 80, h = 24, K = ["var"], R1 = 11, R2 = 4 } = {}) {
    let n = w * h,
      mi = -1,
      M = new Array(n).fill(null),
      T = code
        .replace('" "', "__")
        .replace(/\s+/g, " ")
        .split(" ")
        .filter((d) => d !== "")
        .map((d) => d.replace("__", '" "')),
     tn = T.length;
    for (let i = 0; i < n; i++) {
      let x = i % w,
        y = Math.floor(i / w),
        d = Math.hypot((x - w / 2) / 2, y - h / 2),
        m = d < R1 && d > R2;
      if (m) mi = i;
      M[i] = m ? 1 : x === w - 1 ? "\n" : " ";
    }
    let ni = -1;
    for (let i = 0, wi = 0; i < n; i++) {
      if (M[i] !== 1) continue;
      if (wi < tn) {
        let s = T[wi];
        if (K.some((k) => s.includes(k))) s = s + " ";
        let si = 0;
        while (M[i + si] === 1) si++;
        if (si < s.length - 1) s = si - 1 <= 0 ? " " : "/*" + "*".repeat(Math.max(0, si - 4)) + "*/";
        else wi++;
        for (let k = 0; k < s.length; k++) M[(ni = i + k)] = s[k];
      } else if (i - ni <= 2) M[i] = "/\*"[i - ni - 1];
      else if (mi - i <= 1) M[i] = "/\*"[mi - i];
      else M[i] = "*";
    }
    return M.join("");
  }
  `, {K:["let", "function", "new", "else", "return"], R1:12}));
