import type { Shift, ShiftPlanningSettings, ShiftService, ShiftServiceWindow } from '@/types/dataTypes';

import { computeDayNeeds, ELEARNING_ROLE_ID, parseShiftTime, type DayBudget } from './shiftCalculations';
import { dateFromIso } from './shiftDates';

export const MANAGER_ROLE_ID = 'encadrement';

export type Demand = {
  date: string;
  service: ShiftService;
  roleId: string;
  start: string;
  end: string;
  // 0 : encadrement sur toute la fenêtre ; 1 : besoin par créneau ; 2 : besoin des garde-fous.
  rank: 0 | 1 | 2;
  closing: boolean; // shift qui finit à la fermeture du service du soir
};

export const SERVICES: ShiftService[] = ['midi', 'soir'];

export const windowOf = (settings: ShiftPlanningSettings, service: ShiftService, weekday: number): ShiftServiceWindow | undefined =>
  settings.serviceWindows.find(w => w.service === service && w.days.includes(weekday));

const coversWindow = (shift: Shift, window: ShiftServiceWindow): boolean => {
  const start = parseShiftTime(shift.start);
  const end = parseShiftTime(shift.end);
  const windowStart = parseShiftTime(window.start);
  const windowEnd = parseShiftTime(window.end);
  if (start === null || end === null || windowStart === null || windowEnd === null) return false;
  // Une fin à minuit (0h00) ou après est une fin « le lendemain » : on la ramène au-dessus de 24 h.
  const endAbs = end <= start ? end + 1440 : end;
  const windowEndAbs = windowEnd <= windowStart ? windowEnd + 1440 : windowEnd;
  return start <= windowStart && endAbs >= windowEndAbs;
};

// Besoins de présence de la semaine : pour chaque jour, service et rôle,
// besoin = max(garde-fous, besoins par créneau [+ encadrement ouverture → fermeture]).
// Les shifts existants (validés) de la semaine réduisent d'autant les besoins.
export function buildDemands(
  weekDates: string[],
  settings: ShiftPlanningSettings,
  budgetOf: (date: string) => DayBudget,
  existingShifts: Shift[],
): Demand[] {
  const demands: Demand[] = [];

  weekDates.forEach(date => {
    const weekday = dateFromIso(date).getDay();
    const needs = computeDayNeeds(settings.guardRules, budgetOf(date));

    SERVICES.forEach(service => {
      const window = windowOf(settings, service, weekday);
      if (!window) return;
      const closing = service === 'soir';
      const slotRules = settings.slotRules.filter(rule =>
        rule.service === service && rule.days.includes(weekday) && rule.count > 0 && rule.roleId !== ELEARNING_ROLE_ID);
      const roleIds = new Set<string>([
        ...needs.filter(need => need.service === service).map(need => need.roleId),
        ...slotRules.map(rule => rule.roleId),
      ]);
      const managerWanted = settings.managerOpenToClose && settings.roles.some(role => role.id === MANAGER_ROLE_ID);
      if (managerWanted) roleIds.add(MANAGER_ROLE_ID);

      roleIds.forEach(roleId => {
        const guardNeed = needs.find(need => need.service === service && need.roleId === roleId)?.need ?? 0;
        const roleSlots = slotRules.filter(rule => rule.roleId === roleId);
        const slotCount = roleSlots.reduce((sum, rule) => sum + rule.count, 0);
        // Un créneau d'encadrement ouvert dès l'ouverture (et jusqu'à la fermeture) tient déjà lieu de couverture complète.
        const slotCoversWindow = roleId === MANAGER_ROLE_ID && roleSlots.some(rule =>
          rule.untilClose && (parseShiftTime(rule.startLatest) ?? 1e9) <= (parseShiftTime(window.start) ?? 0));
        const managerFull = managerWanted && roleId === MANAGER_ROLE_ID && !slotCoversWindow ? 1 : 0;
        const total = Math.max(guardNeed, slotCount + managerFull);

        const group: Demand[] = [];
        if (managerFull) group.push({ date, service, roleId, start: window.start, end: window.end, rank: 0, closing });
        roleSlots.forEach(rule => {
          for (let i = 0; i < rule.count; i += 1) {
            // Début au plus tard : le shift est le plus court qui honore le créneau ; il finit avec le service.
            group.push({ date, service, roleId, start: rule.startLatest, end: window.end, rank: 1, closing: closing || rule.untilClose });
          }
        });
        while (group.length < total) group.push({ date, service, roleId, start: window.start, end: window.end, rank: 2, closing });

        // Les shifts déjà posés couvrent d'abord l'encadrement pleine fenêtre (s'ils la couvrent), puis les besoins les moins précis.
        existingShifts
          .filter(shift => shift.date === date && shift.service === service && shift.roleId === roleId)
          .forEach(shift => {
            const fullIndex = group.findIndex(demand => demand.rank === 0);
            if (fullIndex >= 0 && coversWindow(shift, window)) { group.splice(fullIndex, 1); return; }
            const lastIndex = [...group].reverse().findIndex(demand => demand.rank !== 0);
            if (lastIndex >= 0) group.splice(group.length - 1 - lastIndex, 1);
          });

        demands.push(...group);
      });
    });
  });

  return demands;
}
