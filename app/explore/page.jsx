import {Suspense} from "react";
import {getAllJSExamples} from "../utils.js";
import {cn} from "../../components/cn.js";
import {COMMUNITY_LABEL} from "../shared.js";
import {ExamplesClient} from "./ExamplesClient.jsx";
import {exampleThumbnail} from "./thumbnails.js";

export const metadata = {
  title: "Explore | Recho",
  description: "Explore | Recho",
};

// Cache examples at module level - Node.js module cache ensures this only runs once per process
// This keeps the page static and fast
const examples = getAllJSExamples();

// Highlighted thumbnails replace the code, so cards ship HTML instead of sources.
const cards = Promise.all(
  examples.map(async ({content, ...example}) => ({
    ...example,
    thumbnail: await exampleThumbnail({content, ...example}),
  })),
);

// Extract all unique labels from examples (done once at module level)
const allLabels = (() => {
  const labelSet = new Set();
  examples.forEach((example) => {
    if (example.label && Array.isArray(example.label)) {
      example.label.forEach((label) => labelSet.add(label));
    }
  });
  // Public notebooks are labeled Community; it comes first, before the examples' labels.
  return [COMMUNITY_LABEL, ...Array.from(labelSet).sort()];
})();

export default async function Page() {
  // Page is static - no searchParams usage here!
  // All filtering happens client-side via ExamplesClient component
  return (
    <div className={cn("page wide")}>
      <Suspense fallback={<p className={cn("status")}>Loading notebooks…</p>}>
        <ExamplesClient examples={await cards} allLabels={allLabels} />
      </Suspense>
    </div>
  );
}
