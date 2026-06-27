import { isPlainObject } from './typeGuards';

export const DEFAULT_ERROR_MESSAGE = 'Có lỗi xảy ra. Vui lòng thử lại.';

export class ApiError extends Error {
  status: number;
  rawBody?: string;
  payload?: unknown;

  constructor(message: string, status: number, rawBody?: string, payload?: unknown) {
    super(message || DEFAULT_ERROR_MESSAGE);
    this.name = 'ApiError';
    this.status = status;
    this.rawBody = rawBody;
    this.payload = payload;
  }
}

interface ParsedErrorPayload {
  message: string;
  payload?: unknown;
  raw?: string;
}

function tryParseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function findFirstStructuredSegment(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  const braceIndex = trimmed.indexOf('{');
  const bracketIndex = trimmed.indexOf('[');
  const candidateIndex = [braceIndex, bracketIndex]
    .filter((index) => index >= 0)
    .reduce((min, index) => (min === -1 ? index : Math.min(min, index)), -1);

  if (candidateIndex >= 0) {
    return trimmed.slice(candidateIndex);
  }

  return null;
}

function extractMessageFromPayload(payload: unknown): string | null {
  if (payload == null) return null;

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return null;

    const structured = findFirstStructuredSegment(trimmed);
    if (structured) {
      const parsed = tryParseJson(structured);
      if (parsed !== undefined) {
        return extractMessageFromPayload(parsed);
      }
    }

    const match = trimmed.match(/"message"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (match && match[1]) {
      return match[1].replace(/\\"/g, '"');
    }

    const httpMatch = trimmed.match(/^HTTP\s+\d{3}:\s*(.*)$/i);
    if (httpMatch && httpMatch[1]) {
      const remainder = httpMatch[1].trim();
      if (remainder) {
        const nested = extractMessageFromPayload(remainder);
        if (nested) return nested;
      }
    }

    return trimmed;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const message = extractMessageFromPayload(item);
      if (message) return message;
    }
    return null;
  }

  if (isPlainObject(payload)) {
    const obj = payload as Record<string, unknown>;
    const preferredKeys = [
      'message',
      'detail',
      'error_description',
      'errorMessage',
      'error',
      'title',
      'description',
    ];

    for (const key of preferredKeys) {
      if (key in obj) {
        const message = extractMessageFromPayload(obj[key]);
        if (message) return message;
      }
    }

    const alternateKeys = ['errors', 'data', 'response', 'payload'];
    for (const key of alternateKeys) {
      if (key in obj) {
        const message = extractMessageFromPayload(obj[key]);
        if (message) return message;
      }
    }
  }

  return null;
}

export function parseErrorPayload(raw: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): ParsedErrorPayload {
  if (raw == null) {
    return { message: fallback };
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { message: fallback, raw: raw ?? undefined };
    }

    const structured = findFirstStructuredSegment(trimmed);
    if (structured) {
      const payload = tryParseJson(structured);
      if (payload !== undefined) {
        const message = extractMessageFromPayload(payload) || fallback;
        return { message, payload, raw: trimmed };
      }
    }

    const message = extractMessageFromPayload(trimmed) || fallback;
    return { message, raw: trimmed };
  }

  const message = extractMessageFromPayload(raw) || fallback;
  return { message, payload: raw };
}

export function getErrorMessage(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): string {
  if (!error) {
    return fallback;
  }

  if (error instanceof ApiError) {
    return error.message || fallback;
  }

  if (error instanceof Error) {
    if (error.message) {
      const parsed = parseErrorPayload(error.message, fallback);
      if (parsed.message) {
        return parsed.message;
      }
    }
    return error.message || fallback;
  }

  if (typeof error === 'string') {
    return parseErrorPayload(error, fallback).message;
  }

  return parseErrorPayload(error, fallback).message;
}
