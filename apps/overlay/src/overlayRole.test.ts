import { describe, expect, it } from 'vitest';
import { overlayRoleFromSearch } from './overlayRole';

describe('overlay role', () => {
  it('defaults to preview and only selects program explicitly', () => {
    expect(overlayRoleFromSearch('')).toBe('preview');
    expect(overlayRoleFromSearch('?role=preview')).toBe('preview');
    expect(overlayRoleFromSearch('?role=program')).toBe('program');
    expect(overlayRoleFromSearch('?role=other')).toBe('preview');
  });
});
