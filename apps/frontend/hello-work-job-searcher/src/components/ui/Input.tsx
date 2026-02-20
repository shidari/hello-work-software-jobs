import type { ComponentProps } from "react";
import styles from "./Input.module.css";

type InputProps = ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={`${styles.input}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
