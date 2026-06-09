"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "./components";

export const TABLE_PAGE_SIZE = 25;

export function useTablePagination<T>(
  items: T[],
  resetKey?: string | number,
  pageSize: number = TABLE_PAGE_SIZE,
) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const rangeStart = items.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, items.length);

  return {
    page: safePage,
    setPage,
    totalPages,
    paginated,
    pageSize,
    total: items.length,
    rangeStart,
    rangeEnd,
    rowOffset: (safePage - 1) * pageSize,
  };
}

export function TablePagination({
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= pageSize) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">
        {rangeStart}–{rangeEnd} de {total.toLocaleString("es-PE")} activos
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2.5 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <span className="min-w-[5.5rem] text-center text-xs text-muted-foreground">
          Pág. {page} / {totalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2.5 text-xs"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
