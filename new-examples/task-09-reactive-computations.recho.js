// Task 9: Reactive Computations
// In this notebook you will explore Recho's reactivity — change one value
// and watch everything downstream update automatically.

// 1. Start with a simple temperature conversion. The variable `celsius` is
//    a plain top-level variable. When you change its value and save, the
//    echoed Fahrenheit result updates.
//
// Try changing the value of `celsius` and saving the document.

let celsius = 25;
echo(`${celsius}°C = ${celsius * 9 / 5 + 32}°F`);

// ----------------------------------------------------------------------------

// 2. Typing a new number and saving each time works, but recho.number gives
//    you a slider control so you can adjust values interactively.
//
// Uncomment the lines below and save the document. Drag the slider to see
// the Fahrenheit value update in real time.

// let temp = recho.number(25, { min: -40, max: 100, step: 1 });
// echo(`${temp}°C = ${(temp * 9 / 5 + 32).toFixed(1)}°F`);

// ----------------------------------------------------------------------------

// 3. You can derive multiple values from a single control. Here is a circle
//    calculator: one slider controls the radius, and the diameter,
//    circumference, and area all react to changes.
//
// Drag the radius slider and watch all three values update.

{
  const radius = recho.number(5, { min: 1, max: 20 });
  echo(`Diameter: ${radius * 2}`);
  echo(`Circumference: ${(2 * Math.PI * radius).toFixed(2)}`);
  echo(`Area: ${(Math.PI * radius * radius).toFixed(2)}`);
}

// ----------------------------------------------------------------------------

// 4. The output above is a bit terse. Template literals let you format it
//    more nicely.
//
// Uncomment the block below and save the document.

// {
//   const r = recho.number(5, { min: 1, max: 20 });
//   echo(`Circle with radius ${r}:`);
//   echo(`  Diameter:      ${(r * 2).toFixed(2)}`);
//   echo(`  Circumference: ${(2 * Math.PI * r).toFixed(2)}`);
//   echo(`  Area:          ${(Math.PI * r * r).toFixed(2)}`);
// }

// ----------------------------------------------------------------------------

// 5. Here is a km-to-miles converter using recho.number. Read through it,
//    then reproduce it yourself in the empty block below.
//
// {
//   const km = recho.number(10, { min: 0, max: 500, step: 1 });
//   const miles = km * 0.6214;
//   echo(`${km} km = ${miles.toFixed(2)} miles`);
// }
//
// Now reproduce it yourself.

{
  // Reproduce the km-to-miles converter here...
}

// ----------------------------------------------------------------------------

// 6. Task: Build a BMI (Body Mass Index) calculator.
//    - Create a number control for height in cm (min: 100, max: 220, step: 1).
//    - Create a number control for weight in kg (min: 30, max: 200, step: 1).
//    - Compute BMI = weight / (height_in_meters ** 2).
//      (Divide the height by 100 to convert cm to meters.)
//    - Echo the BMI value rounded to 1 decimal place.
//    - Echo the category:
//        BMI < 18.5       → "Underweight"
//        18.5 <= BMI < 25 → "Normal"
//        BMI >= 25        → "Overweight"
//
//    Example output:
//      Height: 175 cm, Weight: 70 kg
//      BMI: 22.9 (Normal)

{
  // Write your code here...
}

// ----------------------------------------------------------------------------

// 7. Task: Build a tip calculator.
//    - Create a number control for the bill amount (min: 1, max: 500, step: 1).
//    - Create a number control for the tip percentage (min: 0, max: 30, step: 5).
//    - Compute the tip amount and the total.
//    - Echo the bill, tip, and total, each formatted with a dollar sign
//      and 2 decimal places.
//
//    Example output:
//      Bill:  $85.00
//      Tip:   $12.75 (15%)
//      Total: $97.75
//
//    Hint: Use .toFixed(2) for the dollar formatting.

{
  // Write your code here...
}
