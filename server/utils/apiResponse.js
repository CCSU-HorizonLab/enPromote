const CODE_BY_STATUS = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR',
    503: 'SERVICE_UNAVAILABLE'
};

function getPositiveInteger(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeList(items, query = {}, metadata = {}) {
    const pageSize = getPositiveInteger(metadata.pageSize)
        || getPositiveInteger(query.pageSize)
        || getPositiveInteger(query.limit)
        || Math.max(items.length, 1);
    const offset = Math.max(Number(query.start) || 0, 0);
    const page = getPositiveInteger(metadata.page)
        || getPositiveInteger(query.page)
        || Math.floor(offset / pageSize) + 1;
    const total = Number.isFinite(Number(metadata.total)) && metadata.total !== null
        ? Number(metadata.total)
        : null;

    return {
        items,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: total === null ? null : Math.ceil(total / pageSize)
        }
    };
}

function normalizeApiResponse(body, statusCode = 200, query = {}) {
    const source = body && typeof body === 'object' ? body : { data: body };
    const numericCode = typeof source.code === 'number' ? source.code : null;
    const success = typeof source.success === 'boolean'
        ? source.success
        : numericCode !== null
            ? numericCode >= 200 && numericCode < 300
            : statusCode >= 200 && statusCode < 300;
    const errorStatus = numericCode !== null && numericCode >= 400 ? numericCode : statusCode;
    const code = typeof source.code === 'string'
        ? source.code
        : success
            ? 'SUCCESS'
            : CODE_BY_STATUS[errorStatus] || 'ERROR';

    let data = null;
    if (success) {
        if (Array.isArray(source)) {
            data = normalizeList(source, query);
        } else if (Object.prototype.hasOwnProperty.call(source, 'data')) {
            data = Array.isArray(source.data)
                ? normalizeList(source.data, query, source.pagination || source)
                : source.data;
        } else {
            data = Object.fromEntries(
                Object.entries(source).filter(([key]) => ![
                    'success', 'code', 'message', 'data', 'error', 'redirect'
                ].includes(key))
            );
        }
    }

    return {
        success,
        data,
        message: typeof source.message === 'string'
            ? source.message
            : success ? '操作成功' : '请求失败',
        code
    };
}

function apiResponseMiddleware(req, res, next) {
    const json = res.json.bind(res);
    res.json = (body) => json(normalizeApiResponse(body, res.statusCode, req.query));
    next();
}

module.exports = { normalizeApiResponse, apiResponseMiddleware };