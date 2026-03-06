"use client";

import styles from "./Sidebar.module.css";
import { useSidebar } from "./SidebarContext";

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { open, isMobile, setOpen } = useSidebar();

  return (
    <>
      {isMobile && open && (
        <button
          type="button"
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          aria-label="サイドバーを閉じる"
        />
      )}
      <aside
        className={`${styles.sidebar} ${open ? styles.open : styles.closed} ${isMobile ? styles.mobile : ""}`}
      >
        {children}
      </aside>
    </>
  );
}

export function SidebarHeader({ children }: { children: React.ReactNode }) {
  return <div className={styles.header}>{children}</div>;
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <div className={styles.content}>{children}</div>;
}

export function SidebarInset({ children }: { children: React.ReactNode }) {
  const { open, isMobile } = useSidebar();
  return (
    <main
      className={`${styles.inset} ${!isMobile && open ? styles.insetShifted : ""}`}
    >
      {children}
    </main>
  );
}

export function SidebarTrigger() {
  const { toggleSidebar, open } = useSidebar();
  return (
    <button
      type="button"
      className={styles.trigger}
      onClick={toggleSidebar}
      aria-label={open ? "サイドバーを閉じる" : "サイドバーを開く"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M3 5h14M3 10h14M3 15h14" />
      </svg>
    </button>
  );
}
