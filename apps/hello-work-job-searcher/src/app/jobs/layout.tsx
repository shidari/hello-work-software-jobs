import styles from "./layout.module.css";

export default function JobsLayout({
  search, // 左ペイン
  detail, // 右ペイン
}: {
  search: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className={styles["layout-container"]}>
      <div className={styles["layout-split"]}>
        <div className={styles["layout-column"]}>{search}</div>
        <div className={styles["layout-column"]}>{detail}</div>
      </div>
    </div>
  );
}
