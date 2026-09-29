import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const GRAPHQL_URL = `${BASE_URL}/graphql`;

const noFilterDuration = new Trend('duration_no_filter');
const searchFilterDuration = new Trend('duration_search_filter');
const deptStatusFilterDuration = new Trend('duration_dept_status_filter');
const graphqlErrorCount = new Counter('graphql_errors');

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
    graphql_errors: ['count==0'], // GraphQL selalu response 200 meski ada errors[] di body
  },
};

function pickScenario() {
  const rand = Math.random();
  if (rand < 0.5) return 'no_filter';
  if (rand < 0.8) return 'search';
  return 'dept_status';
}

// Variasi search term biar tidak kena agresif caching (sama seperti versi REST)
const SEARCH_TERMS = [
  'Neena', 'Lex', 'Diana', 'John', 'Smith', 'Alex', 'David', 'Maria',
  'an', 'th', 'st', 'ar', 'ed', 'or', 'in', 'al', 'neena.kochhar@acme.us',
];

// Query GraphQL untuk list employees — field yang diminta minimal,
// sengaja tidak nested (department/job) dulu supaya baseline load test
// apples-to-apples dengan versi REST. Tambahkan nested field kalau mau
// khusus tes N+1 / dataloader batching.
const LIST_EMPLOYEES_QUERY = `
  query ListEmployees(
    $page: Int
    $limit: Int
    $search: String
    $departmentId: Int
    $employmentStatus: EmploymentStatus
  ) {
    employees(
      page: $page
      limit: $limit
      search: $search
      departmentId: $departmentId
      employmentStatus: $employmentStatus
    ) {
      data {
        employeeId
        firstName
        lastName
        email
        employmentStatus
      }
      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

// Khusus untuk heavy querys
const HEAVY_NESTED_QUERY = `
  query ListEmployeesHeavy($page: Int, $limit: Int) {
    employees(page: $page, limit: $limit) {
      data {
        employeeId
        firstName
        lastName
        email
        salary
        department {
          departmentId
          departmentName
          location {
            locationId
          }
        }
        manager {
          employeeId
          lastName
        }
      }
      pagination {
        total
        totalPages
      }
    }
  }
`;

function buildRequestBody(scenario, page) {
  if (scenario === 'no_filter') {
    return { query: LIST_EMPLOYEES_QUERY, variables: { page, limit: 20 } };
  }
  if (scenario === 'search') {
    const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    return { query: LIST_EMPLOYEES_QUERY, variables: { page, limit: 20, search: term } };
  }
  // dept_status set 1
  return {
    query: LIST_EMPLOYEES_QUERY,
    variables: { page, limit: 20, departmentId: 1, employmentStatus: 'ACTIVE' },
  };
}

export default function () {
  const scenario = pickScenario();
  const page = Math.floor(Math.random() * 30) + 1;

  const body = buildRequestBody(scenario, page);

  const res = http.post(GRAPHQL_URL, JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });

  let jsonBody = null;
  if (res.status === 200) {
    try {
      jsonBody = res.json();
    } catch (e) {}
  }

  const hasGraphqlErrors = Boolean(jsonBody?.errors && jsonBody.errors.length > 0);
  if (hasGraphqlErrors) {
    graphqlErrorCount.add(1);
  }

  check(res, {
    'status 200': (r) => r.status === 200,
    'tidak ada graphql errors': (r) => r.status === 200 && !hasGraphqlErrors,
    'response punya data.employees': () => jsonBody?.data?.employees !== undefined,
    'response punya pagination': () => jsonBody?.data?.employees?.pagination !== undefined,
  });

  if (scenario === 'no_filter') noFilterDuration.add(res.timings.duration);
  else if (scenario === 'search') searchFilterDuration.add(res.timings.duration);
  else deptStatusFilterDuration.add(res.timings.duration);

  sleep(Math.random() * 2);
}

