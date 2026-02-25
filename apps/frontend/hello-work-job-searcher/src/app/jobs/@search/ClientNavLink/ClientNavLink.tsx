"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import styles from "./ClientNavLink.module.css";
export function ClientNavLink(props: {
  to: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { to, children } = props;
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        startTransition(() => {
          router.push(to);
        });
      }}
      className={`${styles["nav-link"]} ${isPending ? styles["nav-link--disabled"] : undefined}`}
    >
      {" "}
      {children}{" "}
    </a>
  );
}
