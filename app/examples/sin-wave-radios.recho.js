/**
 * @title Sin Wave Radios
 * @author Bairui Su
 * @created 2025-09-27
 * @pull_request 128
 * @github pearmini
 * @label ASCII Art, Beginner
 * @tui true
 */

/**
 * ============================================================================
 * =                         Sin Wave Radios                                  =
 * ============================================================================
 *
 * This example explores using inputs to create some visual patterns in Recho.
 * For now, we can only manually set the values of the inputs to simulate the 
 * sine wave, based on the computed values. In the future, inputs values can be
 * programmatically updated.
 * 
 * Inspired by Jack B. Du's post on Instagram: 
 * 
 * https://www.instagram.com/p/DOy2rFdDNjF/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==
 */

recho.radio(4, ['','','','','','','','','']);
recho.radio(5, ['','','','','','','','','']);
recho.radio(6, ['','','','','','','','','']);
recho.radio(7, ['','','','','','','','','']);
recho.radio(8, ['','','','','','','','','']);
recho.radio(8, ['','','','','','','','','']);
recho.radio(8, ['','','','','','','','','']);
recho.radio(7, ['','','','','','','','','']);
recho.radio(6, ['','','','','','','','','']);
recho.radio(5, ['','','','','','','','','']);
recho.radio(4, ['','','','','','','','','']);
recho.radio(3, ['','','','','','','','','']);
recho.radio(2, ['','','','','','','','','']);
recho.radio(1, ['','','','','','','','','']);
recho.radio(0, ['','','','','','','','','']);
recho.radio(0, ['','','','','','','','','']);
recho.radio(0, ['','','','','','','','','']);
recho.radio(1, ['','','','','','','','','']);
recho.radio(2, ['','','','','','','','','']);
recho.radio(3, ['','','','','','','','','']);
recho.radio(4, ['','','','','','','','','']);

//➜ [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 ]
//➜ [ 0, 0.3141592653589793, 0.6283185307179586, 0.9424777960769379, 1.2566370614359172, 1.5707963267948966, 1.8849555921538759, 2.199114857512855, 2.5132741228718345, 2.827433388230814, 3.141592653589793…
//➜ [ 4, 5, 6, 7, 8, 8, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 1, 2, 3, 4 ]
{
  const n = 20;
  const m = 8;
  const I = echo([...Array.from({length: n}, (_, i) => i), n]);
  const X = echo(I.map(i => i / n * Math.PI * 2));
  echo(X.map(x => Math.round(Math.sin(x) * m / 2 + m / 2)));
}