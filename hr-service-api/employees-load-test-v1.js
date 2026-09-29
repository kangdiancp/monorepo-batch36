import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

// Custom metric tiap skenario — supaya bisa bandingkan latency query antara
// filter vs tanpa filter hasil load test hasil k6.
const noFilterDuration = new Trend('duration_no_filter');
const searchFilterDuration = new Trend('duration_search_filter');
const deptStatusFilterDuration = new Trend('duration_dept_status_filter');

export const options = {
  scenarios: {
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },  // ramp up bertahap naik ke 20 concurrent users
        { duration: '1m', target: 20 },   // tahan di 20 users selama 1 menit
        { duration: '30s', target: 50 },  // naikkan ke 50 users
        { duration: '1m', target: 50 },   // tahan di 50 users
        { duration: '30s', target: 0 },   // ramp down
      ],
    },
  },
  thresholds: {
    // Gagal build kalau p95 lebih dari 500ms atau error rate > 1%
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

// 3 skenario query berbeda
function pickScenario() {
  const rand = Math.random();
  if (rand < 0.5) return 'no_filter';       // 50% — list polos, paling sering
  if (rand < 0.8) return 'search';          // 30% — search by nama/email
  return 'dept_status';                     // 20% — filter departemen + status
}

const SEARCH_TERMS = ['Neena', 'Lex', 'Diana', 'neena.kochhar@acme.us'];

export default function () {
  const scenario = pickScenario();
  const page = Math.floor(Math.random() * 5) + 1; // simulasi user browsing beberapa halaman

  let url;
  if (scenario === 'no_filter') {
    url = `${BASE_URL}/api/hr/employees?page=${page}&limit=20`;
  } else if (scenario === 'search') {
    const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    url = `${BASE_URL}/api/hr/employees?page=1&limit=20&search=${term}`;
  } else {
    url = `${BASE_URL}/api/hr/employees?page=1&limit=20&departmentId=1&employmentStatus=ACTIVE`;
  }

  const res = http.get(url);

  check(res, {
    'status 200': (r) => r.status === 200,
    'response punya data array': (r) => Array.isArray(r.json('data')),
    'response punya pagination': (r) => r.json('pagination') !== undefined,
  });

  if (scenario === 'no_filter') noFilterDuration.add(res.timings.duration);
  else if (scenario === 'search') searchFilterDuration.add(res.timings.duration);
  else deptStatusFilterDuration.add(res.timings.duration);

  sleep(Math.random() * 2); // jeda 0-2 detik, simulasi real user
}