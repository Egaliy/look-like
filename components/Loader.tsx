export function Loader() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(64px)",
        WebkitBackdropFilter: "blur(64px)",
      }}
    >
      <div
        className="text-white"
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
          fontSize: "28px",
          fontWeight: 400,
          letterSpacing: "0",
          lineHeight: "34px",
        }}
      >
        Like that!
      </div>
    </div>
  );
}
