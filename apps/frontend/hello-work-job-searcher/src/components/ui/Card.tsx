import type { ComponentProps } from "react";
import styles from "./Card.module.css";

type CardProps = ComponentProps<"div">;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={`${styles.card}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
