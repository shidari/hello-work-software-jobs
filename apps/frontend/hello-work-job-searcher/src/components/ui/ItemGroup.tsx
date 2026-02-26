import type { ComponentProps } from "react";
import styles from "./ItemGroup.module.css";

type ItemGroupProps = ComponentProps<"div"> & {
  variant?: "card" | "list";
};

export function ItemGroup({
  variant = "card",
  className,
  ...props
}: ItemGroupProps) {
  return (
    <div
      className={`${styles.group} ${styles[variant]}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
