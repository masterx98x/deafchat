export default function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="dc-section-header">
      <span className="dc-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
