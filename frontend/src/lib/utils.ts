import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

export function getRecommendationColor(rec: string): string {
  switch (rec) {
    case "BUY": return "text-green-700 bg-green-50 border-green-200";
    case "SELL": return "text-red-700 bg-red-50 border-red-200";
    case "HOLD": return "text-yellow-700 bg-yellow-50 border-yellow-200";
    default: return "text-gray-700 bg-gray-50 border-gray-200";
  }
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment?.toLowerCase()) {
    case "positive": return "text-green-700";
    case "negative": return "text-red-700";
    default: return "text-yellow-700";
  }
}

export function getRiskColor(level: string): string {
  switch (level?.toLowerCase()) {
    case "low": return "text-green-700 bg-green-50";
    case "high": return "text-red-700 bg-red-50";
    default: return "text-yellow-700 bg-yellow-50";
  }
}
