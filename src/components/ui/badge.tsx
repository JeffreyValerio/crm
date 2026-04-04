import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default:     "bg-secondary text-secondary-foreground",
        success:     "bg-green-500/10 text-green-700 dark:text-green-400",
        warning:     "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
        destructive: "bg-destructive/10 text-destructive",
        info:        "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        pending:     "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
export type { BadgeProps };
