export default function FaqSection({ items }) {
  return (
    <div className="dc-faq-grid">
      {items.map((item) => (
        <details key={item.question} className="dc-panel dc-faq-card">
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
