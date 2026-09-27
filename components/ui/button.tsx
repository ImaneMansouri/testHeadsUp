import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B6BFF] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#3B6BFF] text-white shadow-[0_8px_30px_rgba(59,107,255,0.35)] hover:bg-[#2f5cf0]",
        danger: "bg-[#F43F5E] text-white hover:bg-[#e11d48]",
        outline: "border border-[#E6EAF2] bg-white text-[#0A1020] hover:bg-[#F6F8FC]",
        ghost: "bg-white/10 text-white hover:bg-white/20",
        success: "bg-[#10B981] text-white hover:bg-[#059669]",
      },
      size: {
        default: "h-11 px-5 text-sm",
        lg: "h-14 px-7 text-base",
        sm: "h-9 px-3 text-xs",
        block: "h-14 w-full rounded-2xl px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
