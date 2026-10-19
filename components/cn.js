import {clsx} from "clsx";

/** Joins class names, skipping falsy ones. */
export const cn = (...inputs) => clsx(inputs);
