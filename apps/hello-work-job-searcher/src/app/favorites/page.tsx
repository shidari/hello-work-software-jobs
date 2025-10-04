import { FavoriteJobOverviewList } from "../_components/client/JobFavoriteOverviewList";
import styles from "./page.module.css";

export default function Page() {
  return (
    <main className={styles.mainSection}>
      <div className={styles.layoutContainer}>
        <div className={styles.headerSection}>
          <h1>お気に入り求人一覧</h1>
        </div>
        <div className={styles.listSection}>
          <FavoriteJobOverviewList />
        </div>
      </div>
    </main>
  );
}
