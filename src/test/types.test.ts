import { describe, it, expect } from 'vitest';

import type { DebouncedInputProps, EmployeeRow, EquipeStructure, RoleData } from '../types/dataTypes';

describe('Domain Types', () => {
  describe('DebouncedInputProps', () => {
    it('should validate required props', () => {
      const props: DebouncedInputProps = {
        value: '100',
        onChange: () => {},
        dataRow: 'row1',
        dataCol: 'col1',
      };
      expect(props.value).toBe('100');
      expect(props.dataRow).toBe('row1');
      expect(props.dataCol).toBe('col1');
    });

    it('should support optional props', () => {
      const props: DebouncedInputProps = {
        value: 100,
        onChange: () => {},
        onFocus: () => {},
        className: 'my-class',
        dataRow: 'row1',
        dataCol: 'col1',
      };
      expect(props.className).toBe('my-class');
    });
  });

  describe('EmployeeRow', () => {
    it('should have all required fields', () => {
      const employee: EmployeeRow = {
        nom: 'Jean',
        equipe: 'Cuisine',
        heuresPayees: '160',
        coutTotalCharge: '2000',
      };
      expect(employee.nom).toBe('Jean');
      expect(employee.equipe).toBe('Cuisine');
    });
  });

  describe('EquipeStructure', () => {
    it('should have cuisine and salle departments', () => {
      const roleData: RoleData = { h: '160', n: '1' };
      const equipe: EquipeStructure = {
        cuisine: {
          cadre: roleData,
          maitrise: roleData,
          niv12: roleData,
          niv3: roleData,
          apprenti: roleData,
        },
        salle: {
          cadre: roleData,
          maitrise: roleData,
          niv12: roleData,
          niv3: roleData,
          apprenti: roleData,
        },
      };
      expect(equipe.cuisine.cadre.h).toBe('160');
      expect(equipe.salle.maitrise.n).toBe('1');
    });
  });
});
