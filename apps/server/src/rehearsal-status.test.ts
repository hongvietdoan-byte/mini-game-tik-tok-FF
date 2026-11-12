import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

describe('nhãn rehearsal', () => {
  it('nói rõ rehearsal MOCK chỉ chứng minh source-code chạy được', () => {
    const moduleUrl = pathToFileURL(join(process.cwd(), 'tools', 'rehearsal.ts')).href;
    const script = `const { rehearsalStatusLabel } = await import(${JSON.stringify(moduleUrl)}); console.log(JSON.stringify([rehearsalStatusLabel(true), rehearsalStatusLabel(false)]));`;
    const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
      cwd: process.cwd(), encoding: 'utf8',
    });
    expect(JSON.parse(output)).toEqual(['CODE_REHEARSAL_PASSED', 'CODE_REHEARSAL_FAILED']);
  });
});
