import { z } from 'zod';

export const workspaceUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.string(),
  displayName: z.string().default(''),
  isSuperadmin: z.boolean().optional().default(false)
});

export const workspaceTeamSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  status: z.string().optional()
});

export const workspaceTeamDetailsSchema = workspaceTeamSchema.extend({
  settings: z.record(z.string(), z.unknown()).optional().default({})
});

export const workspaceDefaultsSchema = z.object({
  version: z.number(),
  defaults: z.record(z.string(), z.unknown()).default({}),
  mediaSources: z.record(z.string(), z.unknown()).default({}),
  updatedAt: z.string()
});

export const workspaceCurrentTeamResponseSchema = z.object({
  ok: z.literal(true),
  team: workspaceTeamDetailsSchema,
  defaults: workspaceDefaultsSchema.nullable()
});

export const workspaceMemberSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().default(''),
  role: z.string(),
  status: z.string().optional().default('active')
});

export const workspaceTeamMembersResponseSchema = z.object({
  ok: z.literal(true),
  team: workspaceTeamSchema,
  users: z.array(workspaceMemberSchema)
});

export const workspaceAdminTeamSchema = workspaceTeamSchema.extend({
  status: z.string()
});

export const workspaceAdminUserMutationResponseSchema = z.object({
  ok: z.literal(true),
  user: workspaceMemberSchema,
  generatedPassword: z.string().optional()
});

export const workspaceAdminRemoveUserResponseSchema = z.object({
  ok: z.literal(true),
  removed: z.boolean()
});

export const workspaceAdminUpdateTeamResponseSchema = z.object({
  ok: z.literal(true),
  team: workspaceAdminTeamSchema
});

export const workspaceSaveTeamDefaultsResponseSchema = z.object({
  ok: z.literal(true),
  teamId: z.string(),
  defaults: workspaceDefaultsSchema
});

export const workspaceProjectSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  name: z.string(),
  description: z.string().default(''),
  status: z.string().optional().default('active'),
  state: z.record(z.string(), z.unknown()).default({}),
  createdBy: z.string().optional().default(''),
  createdAt: z.string().optional().default('')
});

export const workspaceProjectsResponseSchema = z.object({
  ok: z.literal(true),
  projects: z.array(workspaceProjectSchema)
});

export const workspaceSnapshotSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  teamId: z.string(),
  name: z.string(),
  kind: z.string(),
  state: z.record(z.string(), z.unknown()).default({}),
  createdBy: z.string().default(''),
  authorName: z.string().default(''),
  createdAt: z.string()
});

export const workspaceSnapshotsResponseSchema = z.object({
  ok: z.literal(true),
  snapshots: z.array(workspaceSnapshotSchema)
});

export const workspaceSaveSnapshotResponseSchema = z.object({
  ok: z.literal(true),
  snapshot: workspaceSnapshotSchema
});

export const loginWorkspaceInputSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  teamSlug: z.string().trim().optional()
});

export const workspaceAuthResponseSchema = z.object({
  ok: z.literal(true),
  user: workspaceUserSchema,
  team: workspaceTeamSchema,
  membership: z
    .object({
      role: z.string(),
      status: z.string()
    })
    .optional()
});

export const workspaceMeResponseSchema = z.object({
  ok: z.literal(true),
  user: workspaceUserSchema,
  team: workspaceTeamSchema
});

export type LoginWorkspaceInput = z.infer<typeof loginWorkspaceInputSchema>;
export type WorkspaceAuthResponse = z.infer<typeof workspaceAuthResponseSchema>;
export type WorkspaceMeResponse = z.infer<typeof workspaceMeResponseSchema>;
export type WorkspaceCurrentTeamResponse = z.infer<typeof workspaceCurrentTeamResponseSchema>;
export type WorkspaceTeamMembersResponse = z.infer<typeof workspaceTeamMembersResponseSchema>;
export type WorkspaceAdminUserMutationResponse = z.infer<typeof workspaceAdminUserMutationResponseSchema>;
export type WorkspaceAdminRemoveUserResponse = z.infer<typeof workspaceAdminRemoveUserResponseSchema>;
export type WorkspaceAdminUpdateTeamResponse = z.infer<typeof workspaceAdminUpdateTeamResponseSchema>;
export type WorkspaceSaveTeamDefaultsResponse = z.infer<typeof workspaceSaveTeamDefaultsResponseSchema>;
export type WorkspaceProjectsResponse = z.infer<typeof workspaceProjectsResponseSchema>;
export type WorkspaceSnapshotsResponse = z.infer<typeof workspaceSnapshotsResponseSchema>;
export type WorkspaceSaveSnapshotResponse = z.infer<typeof workspaceSaveSnapshotResponseSchema>;
