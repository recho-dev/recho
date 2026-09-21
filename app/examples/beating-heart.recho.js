/**
 * @title Beating Heart
 * @author Bairui Su
 * @created 2026-09-20
 * @pull_request 234
 * @github pearmini
 * @thumbnail_start 29
 * @label ASCII Art
 * @tui true
 */

/**
 * ============================================================================
 * =                           Beating Heart                                  =
 * ============================================================================
 *
 * A 3D beating heart rendered as ASCII, built from the same text-based shader
 * approach as the Computer Graphics tutorial[1].
 *
 * Feel free to tweak the shader size, the pulse, or the lighting!
 */

const uTime = recho.now();

//➜
//➜
//➜
//➜
//➜              %%%%%##*+       ------:::
//➜            %%%%%%%%%##*+= ~=====~~~~--::
//➜          %%%%%%%%%%%%%#**+++++++====~~--:.
//➜         %%%%%%%%%%%%%%%##******++++===~~-:.
//➜         %%%%%%%%%%%%%%%%######*****++==~~-:
//➜        %%%%%%%%%%%%%%%%%%%%%######***++==~-:
//➜        %%%%%%%%%%%%%%%%%%%%%%%%%####**++==~-
//➜        %%%%%%%%%%%%%%%%%%%%%%%%%%%%##**++=~-
//➜       %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%###*++=~-
//➜       %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%##*++=-
//➜        %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%##**+=
//➜           %%%%%%%%%%%%%%%%%%%%%%%%%%%%%#*
//➜             %%%%%%%%%%%%%%%%%%%%%%%%%%%
//➜                %%%%%%%%%%%%%%%%%%%%%
//➜                   %%%%%%%%%%%%%%%
//➜                     %%%%%%%%%%%
//➜                        %%%%%
//➜                          %
//➜
//➜
//➜
echo(
  shader((vPos) => {
    let {x, y, z} = vPos;
    const t = uTime / 1000;
    const sqrt2 = Math.sqrt(2);
    const dx = Math.cos(t) * sqrt2;
    const dz = Math.sin(t) * sqrt2;
    const wave = Math.sin(Math.PI * 2 * t + y);
    const pulse = Math.pow(0.5 + 0.5 * wave, 4);
    x *= 1 - 0.2 * 1 * pulse; x *= 1.3;
    y *= 1 - 0.2 * 0.5 * pulse; y = y * 1.5 + 0.15;
    y = y - Math.abs(x) * Math.sqrt(1 - Math.abs(x));
    const z2 = 1 - x * x - y * y;
    const light = new Vector3(0.5, 0.85, 1.5);
    const ambient = new Vector3(0.2, 0.1, 0.05);
    if (z2 > 0) {
      const dir = new Vector3(dx, 1, dz);
      const normal = new Vector3(x, y, Math.sqrt(z2));
      const intensity = 0.5 * Math.max(0, normal.dot(dir));
      const color = light.multiplyScalar(intensity).add(ambient);
      return gray2ASCII(new Vector4(color.x, color.y, color.z, 1));
    }
    return gray2ASCII(new Vector4(0, 0, 0, 0));
  }),
);

function shader(callback, [width, height] = [51, 25]) {
  let output = "";
  for (let i = 0; i < height; i++) {
    const y = map(i, 0, height - 1, 1, -1);
    for (let j = 0; j < width; j++) {
      const x = map(j, 0, width - 1, -1, 1);
      const vPos = new Vector2(x, y);
      output += callback(vPos);
    }
    output += i === height - 1 ? "" : "\n";
  }
  return output;
}

function gray2ASCII(color) {
  if (color.w !== undefined && color.w === 0) return " ";
  const chs = ["@", "%", "#", "*", "+", "=", "~", "-", ":", ".", " "];
  const gray = (color.x + color.y + color.z) / 3;
  const i = Math.floor(gray * chs.length);
  return chs[i];
}

function map(x, d0, d1, r0, r1) {
  return r0 + ((r1 - r0) * (x - d0)) / (d1 - d0);
}

const {Vector2, Vector3, Vector4} = await recho.require("three@0.160.0/build/three.min.js");

/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                              References
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * [1] https://recho.dev/examples/cg-text-based-shaders
 */
