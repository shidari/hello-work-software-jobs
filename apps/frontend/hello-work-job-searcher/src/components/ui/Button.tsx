import type { ComponentProps } from "react";
import styles from "./Button.module.css";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
