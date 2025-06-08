import { interviewCovers, mappings } from "@/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const techIconBaseURL = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

// Cache for icon existence checks to avoid redundant network requests
const iconExistenceCache: Record<string, boolean> = {};

const normalizeTechName = (tech: string) => {
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  const mapped = mappings[key as keyof typeof mappings];
  if (typeof mapped === 'object' && mapped !== null && 'icon' in mapped) {
    return mapped.icon; // Return the direct icon path if available
  } else if (typeof mapped === 'string') {
    return mapped; // Return the normalized string for devicon URL construction
  } else {
    return key; // Fallback to original key if no mapping found
  }
};

export const getTechLogos = async (techArray: string[]) => {
  const logoURLs = techArray.map((tech) => {
    const normalized = normalizeTechName(tech);
    // If normalized is a direct icon path, use it. Otherwise, construct devicon URL.
    const url = normalized.startsWith('/') ? normalized : `${techIconBaseURL}/${normalized}/${normalized}-original.svg`;
    return {
      tech,
      url,
    };
  });

  const results = await Promise.all(
    logoURLs.map(async ({ tech, url }) => ({
      tech,
      url: (url.startsWith('/') || await checkIconExists(url)) ? url : "/tech.svg",
    }))
  );

  return results;
};

const checkIconExists = async (url: string) => {
  // Check cache first
  if (iconExistenceCache[url] !== undefined) {
    return iconExistenceCache[url];
  }
  
  try {
    const response = await fetch(url, { method: "HEAD" });
    const exists = response.ok;
    // Cache the result
    iconExistenceCache[url] = exists;
    return exists;
  } catch {
    iconExistenceCache[url] = false;
    return false;
  }
};

export const getRandomInterviewCover = () => {
  const randomIndex = Math.floor(Math.random() * interviewCovers.length);
  return `/covers${interviewCovers[randomIndex]}`;
};