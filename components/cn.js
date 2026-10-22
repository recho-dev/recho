import {clsx} from "clsx";
import {twMerge} from "tailwind-merge";

/** Joins class names, skipping falsy ones; of two clashing Tailwind classes the last wins. */
export const cn = (...inputs) => twMerge(clsx(inputs));
