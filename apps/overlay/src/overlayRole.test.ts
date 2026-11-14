import { describe, expect, it } from 'vitest';
import { overlayFitFromSearch, overlayRoleFromSearch, overlayStageScale } from './overlayRole';

describe('overlay role', () => {
  it('defaults to preview and only selects program explicitly', () => {
    expect(overlayRoleFromSearch('')).toBe('preview');
    expect(overlayRoleFromSearch('?role=preview')).toBe('preview');
    expect(overlayRoleFromSearch('?role=program')).toBe('program');
    expect(overlayRoleFromSearch('?role=other')).toBe('preview');
  });
});

describe('overlay fit', () => {
  it('defaults preview and unspecified role to contain, program to cover', () => {
    expect(overlayFitFromSearch('')).toBe('contain');
    expect(overlayFitFromSearch('?role=preview')).toBe('contain');
    expect(overlayFitFromSearch('?role=program')).toBe('cover');
  });

  it('allows only the supported fit query values to override the role default', () => {
    expect(overlayFitFromSearch('?fit=cover')).toBe('cover');
    expect(overlayFitFromSearch('?role=program&fit=contain')).toBe('contain');
    expect(overlayFitFromSearch('?role=preview&fit=cover')).toBe('cover');
    expect(overlayFitFromSearch('?role=program&fit=invalid')).toBe('cover');
  });

  it('contains the entire 9:16 stage at landscape and portrait viewport sizes', () => {
    expect(overlayStageScale(1920, 1080, 'contain')).toBe(0.5625);
    expect(overlayStageScale(1366, 768, 'contain')).toBe(0.4);
    expect(overlayStageScale(390, 844, 'contain')).toBeCloseTo(390 / 1080);
    expect(overlayStageScale(1080, 1920, 'contain')).toBe(1);
  });

  it('keeps cover scaling available for program and explicit overrides', () => {
    expect(overlayStageScale(1920, 1080, 'cover')).toBe(1920 / 1080);
    expect(overlayStageScale(1366, 768, 'cover')).toBe(1366 / 1080);
    expect(overlayStageScale(1080, 1920, 'cover')).toBe(1);
  });
});
