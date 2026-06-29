import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEngineLabel(engineId: string, externalEngineId?: number): string {
  if (externalEngineId != null) {
    return `ENG-${String(externalEngineId).padStart(4, '0')}`;
  }
  return engineId;
}
