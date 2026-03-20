import { describe, expect, it } from 'vitest';
import {
  canManageWorkspaceMembers,
  formatWorkspaceRoleLabel,
  getWorkspaceActorName,
  normalizeWorkspaceRole
} from './index';

describe('workspace-domain', () => {
  it('normalizes superadmin to admin', () => {
    expect(normalizeWorkspaceRole('superadmin')).toBe('admin');
    expect(formatWorkspaceRoleLabel('editor', true)).toBe('admin');
  });

  it('detects member management permissions', () => {
    expect(canManageWorkspaceMembers({ role: 'admin' })).toBe(true);
    expect(canManageWorkspaceMembers({ role: 'lead' })).toBe(false);
  });

  it('prefers display name over email', () => {
    expect(getWorkspaceActorName({ displayName: 'Vidmich', email: 'vidmichd@ya.ru' })).toBe('Vidmich');
    expect(getWorkspaceActorName({ email: 'vidmichd@ya.ru' })).toBe('vidmichd@ya.ru');
  });
});
