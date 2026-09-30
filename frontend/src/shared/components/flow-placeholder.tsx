export function FlowPlaceholder({
  title,
  description,
  flow,
  children,
}: {
  title: string;
  description: string;
  flow: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE DEMO</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      <section className="placeholder-panel" aria-label="Tiến độ giao diện">
        <span className="flow-label">{flow}</span>
        <h2>Khung giao diện đã sẵn sàng</h2>
        <p>
          Nội dung và thao tác của màn hình này sẽ được triển khai ở flow tiếp theo. Hiện chưa có dữ
          liệu hoặc kết nối backend.
        </p>
        {children}
      </section>
    </>
  );
}
