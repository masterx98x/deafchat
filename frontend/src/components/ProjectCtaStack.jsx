import DeafNewsCtaBanner from './DeafNewsCtaBanner';
import DeafSuiteCtaBanner from './DeafSuiteCtaBanner';

export default function ProjectCtaStack({
  deafSuiteHref,
  deafNewsHref,
  onDeafSuiteNavigate,
  onDeafSuiteWarm,
  onDeafNewsWarm,
}) {
  return (
    <section className="dc-project-links" aria-label="Progetti collegati">
      <DeafSuiteCtaBanner
        href={deafSuiteHref}
        onNavigate={onDeafSuiteNavigate}
        onWarm={onDeafSuiteWarm}
      />
      <DeafNewsCtaBanner
        href={deafNewsHref}
        onWarm={onDeafNewsWarm}
      />
    </section>
  );
}
