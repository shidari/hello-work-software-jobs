import type { ComponentProps } from "react";
import styles from "./Card.module.css";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.card}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.header}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.title}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.description}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.content}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.footer}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function CardGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.group}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
