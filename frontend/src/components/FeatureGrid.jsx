export default function FeatureGrid({ items, variant = 'feature' }) {
  return (
    <div className={`dc-card-grid dc-card-grid--${variant}`}>
      {items.map((item) => (
        <article key={item.title} className={`dc-panel dc-info-card dc-info-card--${variant}`}>
          <span className="dc-info-card__index">{item.index}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </article>
      ))}
    </div>
  );
}
