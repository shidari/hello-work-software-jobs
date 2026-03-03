"use client";
import { type ReactNode, useState } from "react";
import styles from "./Collapsible.module.css";

export function Collapsible({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span
          className={`${styles.icon}${isOpen ? ` ${styles.iconOpen}` : ""}`}
        >
          ▾
        </span>
        {title}
      </button>
      {isOpen && <div className={styles.content}>{children}</div>}
    </div>
  );
}
