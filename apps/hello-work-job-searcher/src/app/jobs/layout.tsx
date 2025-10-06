import styles from "./@search/page.module.css";

export default function JobsLayout({
    search,   // 左ペイン
    detail,     // 右ペイン
}: {
    search: React.ReactNode
    detail: React.ReactNode
}) {
    return (
        <div className={styles.mainSection}>
            <div className={styles.splitLayoutContainer}>
                <div className={styles.searchLayoutContainer}>
                    {search}
                </div>
                <div className={styles.jobDetailLayoutContainer}>
                    {detail}
                </div>
            </div>
        </div>
    )
}
