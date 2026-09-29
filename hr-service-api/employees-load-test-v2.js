import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

const noFilterDuration = new Trend('duration_no_filter');
const searchFilterDuration = new Trend('duration_search_filter');
const deptStatusFilterDuration = new Trend('duration_dept_status_filter');

export const options = {
  scenarios: {
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

function pickScenario() {
  const rand = Math.random();
  if (rand < 0.5) return 'no_filter';       
  if (rand < 0.8) return 'search';          
  return 'dept_status';                     
}

// Optimasi 1: Perbanyak variasi keywoard agar tidak terkena agresif DB Caching
const SEARCH_TERMS = [
  'Neena', 'Lex', 'Diana', 'John', 'Smith', 'Alex', 'David', 'Maria', 
  'an', 'th', 'st', 'ar', 'ed', 'or', 'in', 'al', 'neena.kochhar@acme.us'
];

export default function () {
  const scenario = pickScenario();
  
  // Optimasi 2: perbesar scope pagination (misal 1-30) untuk tes efisiensi OFFSET pagination
  const page = Math.floor(Math.random() * 30) + 1;

  let url;
  if (scenario === 'no_filter') {
    url = `${BASE_URL}/api/hr/employees?page=${page}&limit=20`;
  } else if (scenario === 'search') {
    const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    url = `${BASE_URL}/api/hr/employees?page=${page}&limit=20&search=${term}`;
  } else {
    url = `${BASE_URL}/api/hr/employees?page=${page}&limit=20&departmentId=1&employmentStatus=ACTIVE`;
  }

  const res = http.get(url);

  // Optimasi 4: Parsing JSON sekali saja untuk hemat CPU k6
  let jsonBody = null;
  if (res.status === 200) {
    try {
      jsonBody = res.json();
    } catch (e) {}
  }

  check(res, {
    'status 200': (r) => r.status === 200,
    'response punya data array': () => Array.isArray(jsonBody?.data),
    'response punya pagination': () => jsonBody?.pagination !== undefined,
  });

  if (scenario === 'no_filter') noFilterDuration.add(res.timings.duration);
  else if (scenario === 'search') searchFilterDuration.add(res.timings.duration);
  else deptStatusFilterDuration.add(res.timings.duration);

  sleep(Math.random() * 2); 
}