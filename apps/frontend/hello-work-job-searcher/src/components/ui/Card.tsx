import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={`${styles.card}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardGroup({ className, ...props }: CardProps) {
  return (
    <div
      className={`${styles.group}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
