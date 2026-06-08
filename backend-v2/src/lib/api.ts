export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export const ok = <T>(data: T): ApiEnvelope<T> => ({
  code: 0,
  message: "ok",
  data
});

export const fail = (code: number, message: string) => ({
  code,
  message
});

export const pagination = (page: number, pageSize: number, total: number) => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize)
});

export const pageFromQuery = (value: unknown, fallback = 1): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : fallback;
};

export const pageSizeFromQuery = (value: unknown, fallback = 24, max = 300): number => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(parsed)));
};
