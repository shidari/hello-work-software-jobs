import type { ComponentProps } from "react";
import styles from "./Input.module.css";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`${styles.input}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
