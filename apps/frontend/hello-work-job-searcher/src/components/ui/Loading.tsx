import styles from "./Loading.module.css";

export default function Loading() {
  return (
    <div className={styles["spinner-wrapper"]}>
      <div className={styles.spinner} />
    </div>
  );
}
