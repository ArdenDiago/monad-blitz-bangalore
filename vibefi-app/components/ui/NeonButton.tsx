"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface NeonButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function NeonButton({
  children,
  className,
  variant = "primary",
  isLoading,
  disabled,
  ...props
}: NeonButtonProps) {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]",
    secondary: "bg-secondary text-white hover:bg-secondary/90 shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.6)]",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]",
    ghost: "bg-transparent border border-white/20 hover:bg-white/10 text-white",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
}
