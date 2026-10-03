import { useEffect, useRef } from 'react';

import type { PersonnelCategory } from '@/types/dataTypes';

export type MoveCategoryOption = { id: PersonnelCategory; label: string };

type MoveCategoryMenuProps = {
  x: number;
  y: number;
  current: PersonnelCategory;
  options: MoveCategoryOption[];
  onSelect: (category: PersonnelCategory) => void;
  onClose: () => void;
};

const MENU_WIDTH = 200;
const MENU_MARGIN = 8;

// Fenêtre « Déplacer vers » près du curseur, fermée au clic extérieur ou sur Échap.
export default function MoveCategoryMenu({ x, y, current, options, onSelect, onClose }: MoveCategoryMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const targets = options.filter(option => option.id !== current);
  const estimatedHeight = 40 + targets.length * 36;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Déplacer vers"
      style={{
        position: 'fixed',
        left: Math.max(MENU_MARGIN, Math.min(x, window.innerWidth - MENU_WIDTH - MENU_MARGIN)),
        top: Math.max(MENU_MARGIN, Math.min(y, window.innerHeight - estimatedHeight - MENU_MARGIN)),
        width: MENU_WIDTH,
        zIndex: 1000,
        background: '#fff',
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        boxShadow: '0 10px 25px -5px rgba(0,0,0,.2)',
        padding: 6,
        display: 'grid',
        gap: 2,
      }}
    >
      <div style={{ padding: '4px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#64748b' }}>
        Déplacer vers
      </div>
      {targets.map(option => (
        <button
          key={option.id}
          type="button"
          role="menuitem"
          onClick={() => onSelect(option.id)}
          style={{ textAlign: 'left', border: 'none', background: 'transparent', borderRadius: 6, padding: '8px', fontSize: 12, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}
          onMouseEnter={event => { event.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={event => { event.currentTarget.style.background = 'transparent'; }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
