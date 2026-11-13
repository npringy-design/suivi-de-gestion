import type { ShiftRoleDef } from '@/types/dataTypes';
import { roleGradient } from '../shiftRoleStyle';

export default function ShiftLegend({ roles }: { roles: ShiftRoleDef[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-white p-4 text-xs text-slate-600 shadow-sm">
      {roles.map(role => (
        <span key={role.id} className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded" style={{ background: roleGradient(role.couleur) }} /> {role.label} (validé)
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-white" style={{ border: '2px solid #f59e0b' }} /> Proposé
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-white" style={{ boxShadow: '0 0 0 2px #dc2626' }} /> Alerte légale
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-full bg-slate-300" /> Repos
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-full" style={{ background: '#0e7490' }} /> CP / RTT
      </span>
    </div>
  );
}
