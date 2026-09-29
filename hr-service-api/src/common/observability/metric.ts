import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('hr-service-api');

export const employeeQueryDuration = meter.createHistogram('employees_query_duration_ms', {
    description: 'Durasi query findAll employees dalam milidetik, per jenis filter',
    unit: 'ms',
});

export const employeeListRequestsCounter = meter.createCounter('employees_list_requests_total', {
    description: 'Total request GET /employees, dikelompokkan per jenis filter',
});

export function classifyFilterType(filter: {
    search?: string;
    departmentId?: number;
    employmentStatus?: string;
}): 'no_filter' | 'search' | 'dept_status' {
    if (filter.search) return 'search';
    if (filter.departmentId || filter.employmentStatus) return 'dept_status';
    return 'no_filter';
}