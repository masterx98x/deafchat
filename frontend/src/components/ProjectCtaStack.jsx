import DeafNewsCtaBanner from './DeafNewsCtaBanner';
import DeafSuiteCtaBanner from './DeafSuiteCtaBanner';
import DeafMailCtaBanner from './DeafMailCtaBanner';

export default function ProjectCtaStack({
  deafSuiteHref,
  deafNewsHref,
  deafMailHref,
}) {
  return (
    <section className="dc-project-links" aria-label="Progetti collegati">
      <DeafSuiteCtaBanner href={deafSuiteHref} />
      <DeafNewsCtaBanner href={deafNewsHref} />
      <DeafMailCtaBanner href={deafMailHref} />
    </section>
  );
}
