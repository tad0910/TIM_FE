import type { Module } from "./module";

export interface Program {
  id: number;
  name: string;
  description?: string;
  modules?: Module[];
}
