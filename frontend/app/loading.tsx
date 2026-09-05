export default function Loading() {
  return (
    <div className="restaurant-loader-shell">
      <div className="restaurant-loader">
        <div className="plate-loader">
          <div className="fork" />
          <div className="plate" />
          <div className="knife" />
        </div>
        <h1>Quick Food</h1>
        <p>Preparing your order...</p>
      </div>
    </div>
  );
}
