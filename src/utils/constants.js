export const API_URL = import.meta.env.VITE_API_URL;

// V17.26 Global Regex Definitions
export const REGEX_DIMENSION = /(\d+(\.\d+)?)\s*[xX\*]\s*(\d+(\.\d+)?)(?:\s*[xX\*]\s*(\d+(\.\d+)?))?(\s*[cCmMgG][mM])?/g;
export const REGEX_PARENTHESES = /[\(（][^\)）]*[\)）]|\[[^\]]*\]/g;
export const REGEX_HEAD_NOISE = /^[-\s]+/;
export const REGEX_TAIL_NOISE = /[xX\*]+$/;
