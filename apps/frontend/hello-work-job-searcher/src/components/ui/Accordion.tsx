"use client";
import { type ReactNode, useState } from "react";

export function Accordion({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div>
      <button type="button" onClick={() => setIsOpen((prev) => !prev)}>
        {isOpen ? `▲ ${title}を閉じる` : `▼ ${title}を開く`}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}
