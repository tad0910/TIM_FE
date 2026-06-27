export interface Company {
  id: number;
  name: string;
  logoUrl?: string;
  address?: string;
  introduction?: string;
  size?: string;
  website?: string;
  technologies?: string[];
  phone?: string;
  type?: string;
  markets?: string[];
  products?: string[];
}

export interface PaginatedResult<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}