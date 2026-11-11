import { describe, expect, it } from 'vitest';
import type { SystemCheck } from '@quiz/contracts';
import {
  healthSetupStatus,
  isSetupComplete,
  nextSetupStep,
  overlaySetupStatus,
  overlayStatusAfterAction,
  previousSetupStep,
  selfTestSetupStatus,
  setupStepLabel,
  systemCheckStatus,
} from './setupWizardLogic';
import type { SystemChecksResponse } from './api/client';

function checks(statuses: Partial<Record<SystemCheck['id'], SystemCheck['status']>>): SystemChecksResponse {
  return {
    checks: Object.entries(statuses).map(([id, status]) => ({
      id: id as SystemCheck['id'],
      label: id,
      status: status!,
      detail: '',
      checkedAtMs: 1,
    })),
    live: null,
    overlay: { clients: 0, lastAck: null },
  };
}

describe('setup wizard status logic', () => {
  it('preserves database and theme statuses returned by the server', () => {
    const response = checks({ database: 'FAIL', theme: 'NOT_TESTED' });
    expect(systemCheckStatus(response.checks, 'database')).toBe('FAIL');
    expect(systemCheckStatus(response.checks, 'theme')).toBe('NOT_TESTED');
    expect(systemCheckStatus(response.checks, 'backend')).toBe('NOT_TESTED');
  });

  it('passes the overlay step only when both overlay checks pass', () => {
    expect(overlaySetupStatus(checks({ overlay: 'PASS', overlayUpdated: 'PASS' }))).toBe('PASS');
    expect(overlaySetupStatus(checks({ overlay: 'PASS', overlayUpdated: 'FAIL' }))).toBe('FAIL');
    expect(overlaySetupStatus(checks({ overlay: 'PASS', overlayUpdated: 'NOT_TESTED' }))).toBe('NOT_TESTED');
    expect(overlaySetupStatus(null)).toBe('NOT_TESTED');
  });

  it('preserves an overlay result when continuing and marks skipped only on request', () => {
    expect(overlayStatusAfterAction('PASS', 'continue')).toBe('PASS');
    expect(overlayStatusAfterAction('FAIL', 'continue')).toBe('FAIL');
    expect(overlayStatusAfterAction('NOT_TESTED', 'continue')).toBe('NOT_TESTED');
    expect(overlayStatusAfterAction('PASS', 'skip')).toBe('SKIPPED');
  });

  it('uses only an explicit true result for health and self-test PASS', () => {
    expect(healthSetupStatus({ ok: true })).toBe('PASS');
    expect(healthSetupStatus({ ok: false })).toBe('FAIL');
    expect(healthSetupStatus(null)).toBe('NOT_TESTED');
    expect(selfTestSetupStatus({ ok: true })).toBe('PASS');
    expect(selfTestSetupStatus({ ok: false })).toBe('FAIL');
    expect(selfTestSetupStatus(null)).toBe('NOT_TESTED');
  });

  it('clamps Back/Next to the first and last step', () => {
    expect(previousSetupStep(0)).toBe(0);
    expect(previousSetupStep(5)).toBe(4);
    expect(nextSetupStep(6)).toBe(7);
    expect(nextSetupStep(7)).toBe(7);
  });

  it('labels skipped steps clearly and reads only the setup completion flag', () => {
    expect(setupStepLabel('SKIPPED')).toBe('BỎ QUA');
    expect(setupStepLabel('FAIL')).toBe('FAIL');
    expect(isSetupComplete({ getItem: () => '1' })).toBe(true);
    expect(isSetupComplete({ getItem: () => null })).toBe(false);
  });
});
