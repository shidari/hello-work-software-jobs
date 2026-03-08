import styles from "./WorkPlaceMap.module.css";

export function WorkPlaceMap({ address }: { address: string }) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&hl=ja`;
  return (
    <iframe
      className={styles.map}
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title={`${address} の地図`}
    />
  );
}
