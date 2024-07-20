import { logger } from "../utils";

export const labelCategories: string[] = [
  "Interested",
  "Not Interested",
  "More Information",
  "Human Intervention Required",
];

let excludeQuery: string = "";

export function getExcludeQuery(): string {
  if (excludeQuery !== "") return excludeQuery;

  for (const label of labelCategories) {
    excludeQuery += ` -label:${label}`;
  }

  logger.debug(`[GOOGLE] Exclude query: ${excludeQuery}`);

  return excludeQuery;
}

excludeQuery = excludeQuery.trim();
