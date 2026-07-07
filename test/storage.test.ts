import { uploadToSupabaseStorage, getSignedUrl, deleteFromStorage } from '../src/lib/storage';

describe('storage', () => {
  test('uploadToSupabaseStorage is function', () => {
    expect(typeof uploadToSupabaseStorage).toBe('function');
  });

  test('getSignedUrl is function', () => {
    expect(typeof getSignedUrl).toBe('function');
  });

  test('deleteFromStorage is function', () => {
    expect(typeof deleteFromStorage).toBe('function');
  });
});