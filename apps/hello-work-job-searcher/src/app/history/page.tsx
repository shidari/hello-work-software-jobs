"use client";

import { hc } from "hono/client";
import type { AppType } from "../api/[[...route]]/route";
import { useState, useTransition } from "react";

export default function Page() {
  // compute local YYYY-MM-DD for default value
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState(Number.NaN);
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const client = hc<AppType>("/");
  return (
    <div>
      <h2>データ追加履歴</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const dateStr = form.get("date");
          if (!dateStr) {
            alert("日付を指定してください");
            return;
          }
          startTransition(async () => {
            const res = await client.api.jobs.$get({
              query: {
                addedSince: `${dateStr}`,
                addedUntil: `${dateStr}`,
              },
            });
            const data = await res.json();
            if (!data.success) return;
            setCount(data.meta.totalCount);
          });
        }}
      >
        <div>
          <input type="date" name="date" defaultValue={todayStr} />
        </div>
        <input type="submit" value="履歴を取得" disabled={isPending} />
      </form>
      <output>
        {isPending ? (
          <p>取得中...</p>
        ) : (
          !Number.isNaN(count) && <p>取得件数: {count}</p>
        )}
      </output>
    </div>
  );
}
