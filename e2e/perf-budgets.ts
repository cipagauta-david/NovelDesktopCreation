export const PERF_BUDGETS = {
  searchIndexBuildMs: Number(process.env.PERF_BUDGET_SEARCH_BUILD_MS ?? 1400),
  searchQueryMs: Number(process.env.PERF_BUDGET_SEARCH_QUERY_MS ?? 260),
  longSseParseMs: Number(process.env.PERF_BUDGET_SSE_PARSE_MS ?? 1800),
} as const
