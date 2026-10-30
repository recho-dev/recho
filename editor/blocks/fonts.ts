export const supportedTypefaces = new Set(["Cascadia Code", "Google Sans Code", "Fira Code"]);

// Map typeface names to Google Fonts API URLs and actual font family names
export const typefaceConfig: Record<string, {url: string; family: string}> = {
  "Cascadia Code": {
    url: "https://fonts.googleapis.com/css2?family=Cascadia+Code:ital,wght@0,200..700;1,200..700&display=swap",
    family: "Cascadia Code",
  },
  "Google Sans Code": {
    url: "https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap",
    family: "Google Sans Code",
  },
  "Fira Code": {
    url: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap",
    family: "Fira Code",
  },
  "Geist Mono": {
    url: "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap",
    family: "Geist Mono",
  },
  Iosevka: {
    url: "https://iosevka-webfonts.github.io/iosevka/Iosevka.css",
    family: "Iosevka Web",
  },
};

// Track which fonts have been loaded
const loadedFonts = new Set<string>();

/**
 * Check if a font has been loaded.
 * @param typeface The name of the typeface to check
 * @returns true if the font has been loaded
 */
export function isFontLoaded(typeface: string): boolean {
  return loadedFonts.has(typeface);
}

/**
 * Load a font dynamically by injecting a stylesheet link.
 * @param typeface The name of the typeface to load
 */
export async function loadFont(typeface: string): Promise<void> {
  if (loadedFonts.has(typeface)) {
    return; // Font already loaded
  }

  if (!supportedTypefaces.has(typeface)) {
    return; // Unsupported typeface
  }

  const config = typefaceConfig[typeface];
  if (!config) {
    return; // No URL mapping found
  }

  if (typeof document === "undefined") {
    return; // Not in browser environment
  }

  try {
    // Check if stylesheet is already present
    const existingLink = document.querySelector(`link[href="${config.url}"]`);
    if (existingLink) {
      loadedFonts.add(typeface);
      return;
    }

    // Inject stylesheet link for Google Fonts
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = config.url;
    link.crossOrigin = "anonymous";

    // Wait for the stylesheet to load
    await new Promise<void>((resolve, reject) => {
      link.onload = () => {
        loadedFonts.add(typeface);
        console.log(`Loaded font: ${typeface}`);
        resolve();
      };
      link.onerror = () => {
        console.warn(`Failed to load font stylesheet: ${typeface}`);
        reject(new Error(`Failed to load font: ${typeface}`));
      };
      document.head.appendChild(link);
    });
  } catch (error) {
    console.warn(`Failed to load font: ${typeface}`, error);
  }
}

/**
 * The inline style that sets output rows in a typeface.
 * @param typeface The name of the typeface to use
 */
export function createTypefaceStyle(typeface: string) {
  const config = typefaceConfig[typeface];
  const fontFamily = config?.family || typeface;
  return `font-family: "${fontFamily}", monospace;`;
}
