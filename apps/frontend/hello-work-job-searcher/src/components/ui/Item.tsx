import type { ComponentProps } from "react";
import styles from "./Item.module.css";

type ItemProps = ComponentProps<"div"> & {
  variant?: "card" | "list";
};

export function Item({ variant = "card", className, ...props }: ItemProps) {
  return (
    <div
      className={`${styles.item} ${styles[variant]}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
