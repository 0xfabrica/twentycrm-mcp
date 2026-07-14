export const CHARACTER_LIMIT = 40_000;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 60;

export const ENTITIES = [
  "companies",
  "people",
  "opportunities",
  "tasks",
  "notes",
  "attachments",
  "timelineActivities",
  "dashboards",
  "workflows",
  "workflowVersions",
  "workflowRuns",
  "workflowAutomatedTriggers",
  "calendarEvents",
  "calendarChannels",
  "calendarEventParticipants",
  "calendarChannelEventAssociations",
  "messages",
  "messageChannels",
  "messageThreads",
  "messageParticipants",
  "messageChannelMessageAssociations",
  "messageFolders",
  "messageChannelMessageAssociationMessageFolders",
  "noteTargets",
  "taskTargets",
  "connectedAccounts",
  "blocklists",
  "workspaceMembers"
] as const;

export type EntityName = (typeof ENTITIES)[number];

export const DEFAULT_WRITABLE_ENTITIES: readonly EntityName[] = [
  "companies",
  "people",
  "opportunities",
  "tasks",
  "notes",
  "noteTargets",
  "taskTargets"
];

export function writableEntities(): Set<string> {
  const configured = process.env.TWENTY_WRITABLE_ENTITIES;
  return new Set(
    configured !== undefined
      ? configured.split(",").map((value) => value.trim()).filter(Boolean)
      : DEFAULT_WRITABLE_ENTITIES
  );
}

export function destructiveOperationsEnabled(): boolean {
  return process.env.TWENTY_ALLOW_DESTRUCTIVE === "true";
}
