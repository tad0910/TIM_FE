import type { Session } from "./session";

export interface Module {
  id: number;
  name: string;
  description?: string;
  position?: number;
  sessions?: Session[];
}
