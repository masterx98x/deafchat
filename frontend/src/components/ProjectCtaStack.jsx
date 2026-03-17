import DeafNewsCtaBanner from './DeafNewsCtaBanner';
import DeafSuiteCtaBanner from './DeafSuiteCtaBanner';

export default function ProjectCtaStack({
  deafSuiteHref,
  deafNewsHref,
}) {
  return (
    <section className="dc-project-links" aria-label="Progetti collegati">
      <DeafSuiteCtaBanner href={deafSuiteHref} />
      <DeafNewsCtaBanner href={deafNewsHref} />
    </section>
  );
}
