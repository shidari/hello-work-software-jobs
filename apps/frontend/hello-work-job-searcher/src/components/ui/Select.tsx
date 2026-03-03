import type { ComponentProps } from "react";
import styles from "./Select.module.css";

export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={`${styles.select}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </select>
  );
}
