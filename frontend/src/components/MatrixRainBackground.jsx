import { useMemo } from 'react';

const MATRIX_GLYPHS = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ<>[]{}()/*+=-_#$%&';

function buildColumnText(seed, length) {
  let value = seed;
  const chars = [];

  for (let index = 0; index < length; index += 1) {
    value = (value * 1664525 + 1013904223) % 4294967296;
    const charIndex = value % MATRIX_GLYPHS.length;
    chars.push(MATRIX_GLYPHS[charIndex]);
  }

  return chars.join('\n');
}

export default function MatrixRainBackground({ className = '', columnCount = 8, baseSeed = 1201 }) {
  const columns = useMemo(
    () => Array.from({ length: columnCount }, (_, index) => {
      const seed = baseSeed + index * 97;
      const length = 70 + (index % 4) * 12;
      const left = columnCount <= 1 ? '50%' : `${4 + index * (92 / (columnCount - 1))}%`;
      return {
        id: `matrix-col-${index}`,
        left,
        duration: `${18 + (index % 4) * 3.5}s`,
        delay: `${(index % 4) * -4.8}s`,
        opacity: 0.18 + (index % 3) * 0.07,
        blurOpacity: 0.12 + (index % 2) * 0.05,
        fontSize: `${0.72 + (index % 2) * 0.08}rem`,
        height: `${118 + (index % 3) * 18}vh`,
        text: buildColumnText(seed, length),
      };
    }),
    [baseSeed, columnCount],
  );

  return (
    <div className={`matrix-rain-background${className ? ` ${className}` : ''}`} aria-hidden="true">
      <div className="matrix-rain-fade matrix-rain-fade-top" />
      <div className="matrix-rain-fade matrix-rain-fade-bottom" />
      {columns.map((column) => (
        <div
          key={column.id}
          className="matrix-rain-column"
          style={{
            left: column.left,
            '--matrix-duration': column.duration,
            '--matrix-delay': column.delay,
            '--matrix-opacity': column.opacity,
            '--matrix-blur-opacity': column.blurOpacity,
            '--matrix-font-size': column.fontSize,
            '--matrix-stream-height': column.height,
          }}
        >
          <div className="matrix-rain-track">
            <div className="matrix-rain-stream-wrap">
              <span className="matrix-rain-stream matrix-rain-stream-blur">{column.text}</span>
              <span className="matrix-rain-stream">{column.text}</span>
            </div>
            <div className="matrix-rain-stream-wrap" aria-hidden="true">
              <span className="matrix-rain-stream matrix-rain-stream-blur">{column.text}</span>
              <span className="matrix-rain-stream">{column.text}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
