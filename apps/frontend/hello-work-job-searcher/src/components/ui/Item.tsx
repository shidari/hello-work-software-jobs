import type { ComponentProps } from "react";
import styles from "./Item.module.css";

export function Item({
  variant = "default",
  size = "default",
  className,
  ...props
}: ComponentProps<"div"> & {
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm" | "xs";
}) {
  const variantClass = variant !== "default" ? ` ${styles[variant]}` : "";
  const sizeClass = size !== "default" ? ` ${styles[size]}` : "";
  return (
    <div
      className={`${styles.item}${variantClass}${sizeClass}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function ItemMedia({
  variant = "default",
  className,
  ...props
}: ComponentProps<"div"> & {
  variant?: "default" | "icon" | "image";
}) {
  const variantClass = variant === "icon" ? ` ${styles.mediaIcon}` : "";
  return (
    <div
      className={`${styles.media}${variantClass}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function ItemContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.content}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function ItemTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.title}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function ItemDescription({
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

export function ItemActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.actions}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function ItemGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.group}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function ItemSeparator({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`${styles.separator}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
