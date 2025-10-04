import "./index.css";
export function Container({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="container">
      <div className="container-inner">{children}</div>
    </div>
  );
}
