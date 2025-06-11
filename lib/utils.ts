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
  // Ensure tech is a string before calling toLowerCase
  const techString = typeof tech === 'string' ? tech : '';
  console.log(`normalizeTechName input: "${techString}"`);

  // First, try to find an exact match with the original case (for object mappings like "JavaScript", "Python")
  let mapped = mappings[techString as keyof typeof mappings];
  console.log(`Exact match for "${techString}":`, mapped);

  // If no exact match, try lowercase version (for string mappings like "javascript": "javascript")
  if (!mapped) {
    const key = techString.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
    mapped = mappings[key as keyof typeof mappings];
    console.log(`Lowercase match for "${key}":`, mapped);
  }

  if (typeof mapped === 'object' && mapped !== null && 'icon' in mapped) {
    console.log(`Returning icon path: ${mapped.icon}`);
    return mapped.icon; // Return the direct icon path if available
  } else if (typeof mapped === 'string') {
    console.log(`Returning normalized string: ${mapped}`);
    return mapped; // Return the normalized string for devicon URL construction
  } else {
    // Fallback to lowercase key for devicon URL construction
    const fallback = techString.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
    console.log(`Returning fallback: ${fallback}`);
    return fallback;
  }
};

export const getTechLogos = async (techArray: string[]) => {
  // Ensure techArray contains only strings
  const validTechArray = techArray.filter(tech => typeof tech === 'string');

  console.log('getTechLogos input:', techArray);
  console.log('validTechArray:', validTechArray);

  const logoURLs = validTechArray.map((tech) => {
    const normalized = normalizeTechName(tech);
    console.log(`Tech: ${tech} -> Normalized: ${normalized}`);
    // If normalized is a direct icon path, use it. Otherwise, construct devicon URL.
    const url = normalized.startsWith('/') ? normalized : `${techIconBaseURL}/${normalized}/${normalized}-original.svg`;
    console.log(`Final URL for ${tech}: ${url}`);
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

  console.log('Final results:', results);
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
