import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "md" | "sm";

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  const base =
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium " +
    "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

  const sizes: Record<ButtonSize, string> = {
    md: "h-12 px-6 text-[15px]",
    sm: "h-10 px-4 text-sm",
  };

  const variants: Record<ButtonVariant, string> = {
    primary: "rounded-full bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "rounded-md text-foreground/70 hover:text-foreground",
  };

  return cn(base, variant === "primary" ? sizes[size] : "px-1 py-2.5 text-[15px]", variants[variant], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export function Button({ variant = "primary", size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

type ButtonLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Pick<LinkProps, "href" | "prefetch"> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: ReactNode;
  };

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  prefetch,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link href={href} prefetch={prefetch} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
