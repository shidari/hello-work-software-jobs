import type { ComponentProps } from "react";
import styles from "./Item.module.css";

function cn(base: string, className?: string) {
  return `${base}${className ? ` ${className}` : ""}`;
}

type ItemProps = ComponentProps<"div"> & {
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm" | "xs";
};

export function Item({
  variant = "default",
  size = "default",
  className,
  ...props
}: ItemProps) {
  return (
    <div
      data-slot="item"
      className={cn(styles.item, className)}
      data-variant={variant}
      data-size={size}
      {...props}
    />
  );
}

type ItemContentProps = ComponentProps<"div">;

export function ItemContent({ className, ...props }: ItemContentProps) {
  return (
    <div
      data-slot="item-content"
      className={cn(styles.content, className)}
      {...props}
    />
  );
}

type ItemTitleProps = ComponentProps<"span">;

export function ItemTitle({ className, ...props }: ItemTitleProps) {
  return (
    <span
      data-slot="item-title"
      className={cn(styles.title, className)}
      {...props}
    />
  );
}

type ItemDescriptionProps = ComponentProps<"p">;

export function ItemDescription({ className, ...props }: ItemDescriptionProps) {
  return (
    <p
      data-slot="item-description"
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

type ItemFooterProps = ComponentProps<"div">;

export function ItemFooter({ className, ...props }: ItemFooterProps) {
  return (
    <div
      data-slot="item-footer"
      className={cn(styles.footer, className)}
      {...props}
    />
  );
}

type ItemGroupProps = ComponentProps<"div">;

export function ItemGroup({ className, ...props }: ItemGroupProps) {
  return (
    <div
      data-slot="item-group"
      className={cn(styles.group, className)}
      {...props}
    />
  );
}

type ItemSeparatorProps = ComponentProps<"hr">;

export function ItemSeparator({ className, ...props }: ItemSeparatorProps) {
  return (
    <hr
      data-slot="item-separator"
      className={cn(styles.separator, className)}
      {...props}
    />
  );
}
