import Link from "next/link";
import styles from "./Navbar.module.css";

type NavItem = {
  label: string;
  href: string;
};

type NavbarProps = {
  brand: string;
  items: NavItem[];
};

export function Navbar({ brand, items }: NavbarProps) {
  return (
    <header className={styles.navbar}>
      <nav className={styles.navbarInner}>
        <Link href="/" className={styles.brand}>
          {brand}
        </Link>
        <div className={styles.links}>
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
