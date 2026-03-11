import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGitLabTokenFromBackend, saveGitLabTokenToBackend } from './auth';

const GITLAB_BASE = 'https://git.las.iastate.edu/api/v4';
const TOKEN_KEY = 'gitlab_token';

/**
 * Gets the GitLab token — tries backend API first (if userId provided),
 * falls back to AsyncStorage for cross-platform persistence.
 */
export async function getGitLabToken(): Promise<string | null> {
  // Try backend first (cross-platform), fall back to AsyncStorage
  const backendToken = await getGitLabTokenFromBackend();
  if (backendToken) {
    await AsyncStorage.setItem(TOKEN_KEY, backendToken);
    return backendToken;
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveGitLabToken(token: string): Promise<void> {
  const trimmed = token.trim();
  await AsyncStorage.setItem(TOKEN_KEY, trimmed);
  await saveGitLabTokenToBackend(trimmed).catch(() => {});
}

/** Extracts and URL-encodes the project path from any GitLab web URL */
function extractProjectPath(gitlabUrl: string): string | null {
  try {
    const url = new URL(gitlabUrl);
    const path = url.pathname
      .replace(/^\//, '')       // leading slash
      .replace(/\/-\/.*$/, '')  // strip /-/tree/branch etc.
      .replace(/\/$/, '');      // trailing slash
    if (!path) return null;
    return encodeURIComponent(path);
  } catch {
    return null;
  }
}

async function gitlabFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
  if (!res.ok) throw new Error(`GitLab API error ${res.status}`);
  return res.json() as Promise<T>;
}

export interface GitLabContributor {
  name: string;
  email: string;
  commits: number;
  additions: number;
  deletions: number;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  author_name: string;
  author_email: string;
  created_at: string; // ISO 8601
}

export interface GitLabMember {
  id: number;
  username: string; // = netid on ISU GitLab
  name: string;     // GitLab profile display name
}

export async function fetchProjectMembers(gitlabUrl: string, token: string): Promise<GitLabMember[]> {
  const path = extractProjectPath(gitlabUrl);
  if (!path) throw new Error('Invalid GitLab URL');
  return gitlabFetch<GitLabMember[]>(
    `${GITLAB_BASE}/projects/${path}/members/all?per_page=100`,
    token
  );
}

export async function fetchContributors(gitlabUrl: string, token: string): Promise<GitLabContributor[]> {
  const path = extractProjectPath(gitlabUrl);
  if (!path) throw new Error('Invalid GitLab URL');
  return gitlabFetch<GitLabContributor[]>(
    `${GITLAB_BASE}/projects/${path}/repository/contributors?per_page=100&order_by=commits`,
    token
  );
}

export async function fetchRecentCommits(
  gitlabUrl: string,
  token: string,
  days = 42
): Promise<GitLabCommit[]> {
  const path = extractProjectPath(gitlabUrl);
  if (!path) throw new Error('Invalid GitLab URL');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return gitlabFetch<GitLabCommit[]>(
    `${GITLAB_BASE}/projects/${path}/repository/commits?per_page=100&since=${since}`,
    token
  );
}

/**
 * Matches contributors to team members using GitLab project membership (username = netid).
 * Falls back to fuzzy name matching if a member isn't found in the project members list.
 * Merges duplicate contributor entries (different git configs) per person.
 */
export function matchContributors(
  contributors: GitLabContributor[],
  gitlabMembers: GitLabMember[],
  teamMembers: { netid?: string; name: string }[]
): GitLabContributor[] {
  const norm = (s: string) => s.trim().toLowerCase();

  // Build a map of netid → GitLab profile name
  const netidToGitLabName: Record<string, string> = {};
  for (const m of gitlabMembers) {
    netidToGitLabName[m.username.toLowerCase()] = m.name;
  }

  const result: GitLabContributor[] = [];

  for (const member of teamMembers) {
    const netid = member.netid?.toLowerCase();
    const gitlabProfileName = netid ? netidToGitLabName[netid] : undefined;

    // Find contributor entries: exact match on GitLab profile name first,
    // then fuzzy fallback on DB display name
    const matches = contributors.filter((c) => {
      const cName = norm(c.name);
      if (gitlabProfileName && cName === norm(gitlabProfileName)) return true;
      // Fallback: any name part of the DB name appears in the contributor name
      return norm(member.name).split(/\s+/).some(
        (part) => part.length > 2 && cName.includes(part)
      );
    });

    if (matches.length === 0) continue;

    result.push({
      name: member.name, // always display the DB name
      email: matches[0].email,
      commits: matches.reduce((sum, c) => sum + c.commits, 0),
      additions: matches.reduce((sum, c) => sum + c.additions, 0),
      deletions: matches.reduce((sum, c) => sum + c.deletions, 0),
    });
  }

  return result.sort((a, b) => b.commits - a.commits);
}

/** Groups commits into weekly buckets (most recent first) */
export function groupCommitsByWeek(
  commits: GitLabCommit[],
  weeks = 6
): { label: string; count: number }[] {
  const now = Date.now();
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(now - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
    const label = i === 0 ? 'This week' : `${i + 1}w ago`;
    const count = commits.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    return { label, count };
  });
  return buckets; // oldest first
}
