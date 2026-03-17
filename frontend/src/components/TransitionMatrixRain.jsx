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

export default function TransitionMatrixRain() {
  const columns = useMemo(
    () => Array.from({ length: 8 }, (_, index) => {
      const seed = 2207 + index * 131;
      const length = 72 + (index % 4) * 10;
      return {
        id: `dc-transition-matrix-col-${index}`,
        left: `${6 + index * 11.5}%`,
        duration: `${17 + (index % 4) * 3.4}s`,
        delay: `${(index % 4) * -4.2}s`,
        opacity: 0.18 + (index % 3) * 0.06,
        blurOpacity: 0.1 + (index % 2) * 0.04,
        fontSize: `${0.72 + (index % 2) * 0.08}rem`,
        height: `${118 + (index % 3) * 18}vh`,
        text: buildColumnText(seed, length),
      };
    }),
    [],
  );

  return (
    <div className="dc-transition-matrix" aria-hidden="true">
      <div className="dc-transition-matrix__fade dc-transition-matrix__fade--top" />
      <div className="dc-transition-matrix__fade dc-transition-matrix__fade--bottom" />
      {columns.map((column) => (
        <div
          key={column.id}
          className="dc-transition-matrix__column"
          style={{
            left: column.left,
            '--dc-transition-matrix-duration': column.duration,
            '--dc-transition-matrix-delay': column.delay,
            '--dc-transition-matrix-opacity': column.opacity,
            '--dc-transition-matrix-blur-opacity': column.blurOpacity,
            '--dc-transition-matrix-font-size': column.fontSize,
            '--dc-transition-matrix-stream-height': column.height,
          }}
        >
          <div className="dc-transition-matrix__track">
            <div className="dc-transition-matrix__stream-wrap">
              <span className="dc-transition-matrix__stream dc-transition-matrix__stream--blur">{column.text}</span>
              <span className="dc-transition-matrix__stream">{column.text}</span>
            </div>
            <div className="dc-transition-matrix__stream-wrap" aria-hidden="true">
              <span className="dc-transition-matrix__stream dc-transition-matrix__stream--blur">{column.text}</span>
              <span className="dc-transition-matrix__stream">{column.text}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
