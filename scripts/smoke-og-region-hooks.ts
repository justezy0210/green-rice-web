/**
 * Smoke harness for the region fetch state machine shared by
 * useOgRegionAf / useOgRegionGraph.
 *
 * Tests the pure core (resolveRegionFetch) since the useState/useEffect
 * wrapper is a trivial 3-branch selector over (key, isCurrent, state).
 * Exits non-zero if any scenario fails.
 *
 * Run:  tsx scripts/smoke-og-region-hooks.ts
 */

import { resolveRegionFetch } from '../src/lib/region-fetch';

interface Scenario {
  name: string;
  fetchPromise: Promise<Response>;
  expect: { data: unknown; status: 'ok' | 'missing' | 'unavailable' };
}

function mockResponse(init: {
  status: number;
  body?: unknown;
  jsonThrows?: boolean;
}): Response {
  const res = {
    status: init.status,
    ok: init.status >= 200 && init.status < 300,
    json: async () => {
      if (init.jsonThrows) throw new SyntaxError('invalid json');
      return init.body;
    },
  };
  return res as unknown as Response;
}

const payload = { schemaVersion: 2, ogId: 'OG0000001' };

const scenarios: Scenario[] = [
  {
    name: '200 + JSON parse ok → ok',
    fetchPromise: Promise.resolve(mockResponse({ status: 200, body: payload })),
    expect: { data: payload, status: 'ok' },
  },
  {
    name: '404 → missing',
    fetchPromise: Promise.resolve(mockResponse({ status: 404 })),
    expect: { data: null, status: 'missing' },
  },
  {
    name: '500 → unavailable',
    fetchPromise: Promise.resolve(mockResponse({ status: 500 })),
    expect: { data: null, status: 'unavailable' },
  },
  {
    name: '403 → unavailable',
    fetchPromise: Promise.resolve(mockResponse({ status: 403 })),
    expect: { data: null, status: 'unavailable' },
  },
  {
    name: 'network reject → unavailable',
    fetchPromise: Promise.reject(new TypeError('network')),
    expect: { data: null, status: 'unavailable' },
  },
  {
    name: 'JSON parse throw → unavailable',
    fetchPromise: Promise.resolve(
      mockResponse({ status: 200, jsonThrows: true }),
    ),
    expect: { data: null, status: 'unavailable' },
  },
];

async function main(): Promise<void> {
  let fail = 0;
  for (const s of scenarios) {
    const got = await resolveRegionFetch(s.fetchPromise);
    const dataOk =
      JSON.stringify(got.data) === JSON.stringify(s.expect.data);
    const statusOk = got.status === s.expect.status;
    if (dataOk && statusOk) {
      console.log(`  pass  ${s.name}`);
    } else {
      fail++;
      console.log(
        `  FAIL  ${s.name}\n    expected=${JSON.stringify(s.expect)}\n    got=${JSON.stringify(got)}`,
      );
    }
  }
  console.log(
    fail === 0
      ? `\nAll ${scenarios.length} scenarios pass.`
      : `\n${fail}/${scenarios.length} scenarios failed.`,
  );
  if (fail > 0) process.exit(1);
}

void main();
