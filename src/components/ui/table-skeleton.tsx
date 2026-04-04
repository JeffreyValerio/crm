import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TableSkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Number of columns to render per row */
  cols?: number;
  /** Show a filter card above the table */
  showFilters?: boolean;
}

export function TableSkeleton({ rows = 5, cols = 5, showFilters = false }: TableSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Optional filter card */}
      {showFilters && (
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-16" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          {/* Table header */}
          <div className="flex gap-4 border-b pb-3 mb-1">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex gap-4 py-3 border-b last:border-0">
              {Array.from({ length: cols }).map((_, colIdx) => (
                <Skeleton
                  key={colIdx}
                  className="h-4 flex-1"
                  style={{ opacity: 1 - rowIdx * 0.12 }}
                />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
