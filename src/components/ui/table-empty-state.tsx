import * as React from "react";
import { Inbox } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

interface TableEmptyStateProps {
  colSpan: number;
  message: string;
  icon?: React.ReactNode;
}

export function TableEmptyState({ colSpan, message, icon }: TableEmptyStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          {icon ?? <Inbox className="h-8 w-8 opacity-40" />}
          <p className="text-sm">{message}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}
