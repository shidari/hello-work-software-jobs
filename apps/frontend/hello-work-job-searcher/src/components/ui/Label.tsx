import type { ComponentProps } from "react";
import styles from "./Label.module.css";

export function Label({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.label}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function LabelGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.group}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
