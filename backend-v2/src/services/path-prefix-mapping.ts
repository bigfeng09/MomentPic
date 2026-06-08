import fs from "node:fs";
import type { PathPrefixMapRule } from "../config.js";

export interface ResolvedAssetPath {
  path: string;
  stat: fs.Stats;
  mapped: boolean;
}

const readableFileStat = (filePath: string): fs.Stats | null => {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() ? stat : null;
  } catch {
    return null;
  }
};

export const applyPathPrefixMap = (sourcePath: string, rules: PathPrefixMapRule[]): string[] => {
  const mappedPaths: string[] = [];
  for (const rule of rules) {
    if (!sourcePath.startsWith(rule.from)) continue;
    if (rule.to.startsWith(rule.from) && sourcePath.startsWith(rule.to)) continue;
    const mappedPath = `${rule.to}${sourcePath.slice(rule.from.length)}`;
    if (mappedPath !== sourcePath && !mappedPaths.includes(mappedPath)) mappedPaths.push(mappedPath);
  }
  return mappedPaths;
};

export const resolveReadableAssetPath = (sourcePath: string, rules: PathPrefixMapRule[]): ResolvedAssetPath | null => {
  const originalStat = readableFileStat(sourcePath);
  if (originalStat) return { path: sourcePath, stat: originalStat, mapped: false };

  for (const mappedPath of applyPathPrefixMap(sourcePath, rules)) {
    const mappedStat = readableFileStat(mappedPath);
    if (mappedStat) return { path: mappedPath, stat: mappedStat, mapped: true };
  }

  return null;
};
