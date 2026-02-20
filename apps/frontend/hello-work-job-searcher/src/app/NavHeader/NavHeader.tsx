import Link from "next/link";
import styles from "./NavHeader.module.css";

export const NavHeader = () => {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.navTitle}>
        求人検索
      </Link>
      <Link href="/favorites" className={styles.navLink}>
        お気に入り一覧
      </Link>
    </nav>
  );
};
