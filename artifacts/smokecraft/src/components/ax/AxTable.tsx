/**
 * AxTable — universal operational table for Axiom OS.
 * Supports pagination, loading state, empty state, responsive collapse.
 * Step 1 of 10 — Universal Component Library (AppTable)
 */

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AxEmptyState } from "./AxEmptyState";
import { AxLoadingState } from "./AxLoadingState";

export interface AxTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T, i: number) => ReactNode;
  /** Alignment (default: left) */
  align?: "left" | "center" | "right";
  /** Min width px */
  minWidth?: number;
  /** Hide on narrow screens */
  hideOnMobile?: boolean;
}

interface AxTableProps<T> {
  columns: AxTableColumn<T>[];
  rows: T[];
  keyFn: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  /** Rows per page (0 = no pagination) */
  pageSize?: number;
  /** Optional row click handler */
  onRowClick?: (row: T) => void;
}

const COL_HEADER: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "rgba(26,26,27,0.38)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  padding: "8px 12px",
  borderBottom: "1px solid rgba(212,139,0,0.12)",
  whiteSpace: "nowrap",
  userSelect: "none",
};

const COL_CELL: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(240,232,212,0.82)",
  padding: "11px 12px",
  borderBottom: "1px solid rgba(26,26,27,0.06)",
  verticalAlign: "middle",
};

export function AxTable<T>({
  columns, rows, keyFn, loading, emptyTitle = "No data",
  emptyBody, pageSize = 0, onRowClick,
}: AxTableProps<T>) {
  const [page, setPage] = useState(1);

  if (loading) return <AxLoadingState rows={4} columns={1} rowHeight={48} />;

  if (!rows.length) return (
    <AxEmptyState title={emptyTitle} body={emptyBody} />
  );

  const totalPages  = pageSize > 0 ? Math.ceil(rows.length / pageSize) : 1;
  const displayRows = pageSize > 0 ? rows.slice((page - 1) * pageSize, page * pageSize) : rows;

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...COL_HEADER,
                    textAlign: col.align ?? "left",
                    minWidth: col.minWidth,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {displayRows.map((row, i) => (
                <motion.tr
                  key={keyFn(row)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    cursor: onRowClick ? "pointer" : "default",
                    transition: "background 0.15s",
                  }}
                  whileHover={onRowClick ? { backgroundColor: "rgba(26,26,27,0.05)" } : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        ...COL_CELL,
                        textAlign: col.align ?? "left",
                        minWidth: col.minWidth,
                      }}
                    >
                      {col.render ? col.render(row, i) : String((row as any)[col.key] ?? "—")}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 12px", borderTop: "1px solid rgba(212,139,0,0.1)",
        }}>
          <span style={{ fontSize: 11, color: "rgba(26,26,27,0.38)" }}>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: "rgba(26,26,27,0.06)", border: "1px solid rgba(212,139,0,0.14)",
                borderRadius: 6, color: "rgba(26,26,27,0.52)", padding: "4px 8px",
                cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1,
                display: "flex", alignItems: "center",
              }}
            >
              <ChevronLeft size={12} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                background: "rgba(26,26,27,0.06)", border: "1px solid rgba(212,139,0,0.14)",
                borderRadius: 6, color: "rgba(26,26,27,0.52)", padding: "4px 8px",
                cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1,
                display: "flex", alignItems: "center",
              }}
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
