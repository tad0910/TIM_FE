import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

if (typeof (global as any).TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}

if (typeof (global as any).TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
