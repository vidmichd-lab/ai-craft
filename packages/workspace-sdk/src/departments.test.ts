import { describe, expect, it } from 'vitest';
import {
  GENERAL_DEPARTMENT_ID,
  getDepartmentCollection,
  listDepartmentEntries,
  removeDepartment,
  upsertDepartment
} from './departments';

describe('workspace-sdk departments', () => {
  it('keeps a general department by default', () => {
    const collection = getDepartmentCollection();
    expect(collection.general.id).toBe(GENERAL_DEPARTMENT_ID);
    expect(collection.items).toEqual([]);
  });

  it('adds and removes custom departments', () => {
    const withDepartment = upsertDepartment({}, { id: 'department-pro', name: 'PRO', slug: 'pro' });
    expect(listDepartmentEntries(withDepartment)).toHaveLength(2);

    const customEntry = listDepartmentEntries(withDepartment).find((entry) => !entry.isGeneral);
    expect(customEntry?.slug).toBe('pro');

    const withoutDepartment = removeDepartment(withDepartment, customEntry?.id || '');
    expect(listDepartmentEntries(withoutDepartment)).toHaveLength(1);
  });

  it('creates a custom department when id is omitted', () => {
    const withDepartment = upsertDepartment({}, { name: 'Studio', slug: 'studio' });
    const entries = listDepartmentEntries(withDepartment);

    expect(entries).toHaveLength(2);
    expect(entries.find((entry) => entry.isGeneral)?.name).toBe('Общий');
    expect(entries.find((entry) => !entry.isGeneral)).toMatchObject({
      id: 'department-studio',
      name: 'Studio',
      slug: 'studio',
      isGeneral: false
    });
  });
});
