import React from 'react';

/**
 * Generic skeleton loader for ISA cards and list items.
 */
export default function SkeletonCard({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card skeleton-card" aria-hidden="true">
          <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: '55%', marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 80, width: '100%', marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 8, width: '100%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 40, width: '100%' }} />
        </div>
      ))}
    </>
  );
}
