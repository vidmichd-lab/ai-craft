import createClient from 'openapi-fetch';
import type { paths as MediaApiPaths } from './generated/media-api';
import type { paths as WorkspaceApiPaths } from './generated/workspace-api';

export type WorkspaceGatewayPaths = WorkspaceApiPaths;
export type MediaGatewayPaths = MediaApiPaths;

export const createWorkspaceGatewayClient = (baseUrl: string) =>
  createClient<WorkspaceApiPaths>({ baseUrl });

export const createMediaGatewayClient = (baseUrl: string) =>
  createClient<MediaApiPaths>({ baseUrl });
