import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGitLabTokenFromBackend, saveGitLabTokenToBackend } from '../api/users';

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

export interface GitLabCommitDetail {
  id: string;
  stats: { additions: number; deletions: number; total: number };
}

export interface GitLabMergeRequest {
  id: number;
  state: 'opened' | 'merged' | 'closed';
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  author: { username: string; name: string };
}

export interface WeekBucket {
  week: string;   // "W1" … "W8"
  label: string;  // "Jan 27 – Feb 2"
  start: Date;    // inclusive (Monday 00:00)
  end: Date;      // exclusive (next Monday 00:00)
}

/**
 * Builds numWeeks calendar-week buckets (Mon–Sun) going back from the current week.
 * W1 = oldest, W<numWeeks> = current week.
 */
export function buildWeekBuckets(numWeeks = 8): WeekBucket[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(now.getDate() - daysToMonday);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return Array.from({ length: numWeeks }, (_, i) => {
    const weekIndex = numWeeks - 1 - i; // 0 = most recent
    const start = new Date(thisMonday);
    start.setDate(thisMonday.getDate() - weekIndex * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7); // exclusive
    const sunday = new Date(start);
    sunday.setDate(start.getDate() + 6);
    return { week: `W${i + 1}`, label: `${fmt(start)} – ${fmt(sunday)}`, start, end };
  });
}

/**
 * Fetches all commits for the repo since a given ISO date (no author filter).
 * Use filterCommitsByMember() to narrow to a specific person after fetching.
 */
export async function fetchAllCommitsSince(
  gitlabUrl: string,
  token: string,
  since: string
): Promise<GitLabCommit[]> {
  const path = extractProjectPath(gitlabUrl);
  if (!path) throw new Error('Invalid GitLab URL');
  return gitlabFetch<GitLabCommit[]>(
    `${GITLAB_BASE}/projects/${path}/repository/commits?since=${encodeURIComponent(since)}&per_page=100&all=true`,
    token
  );
}

/**
 * Filters a commit list to only those belonging to a specific team member.
 * Uses the same logic as TeamDetail: email contains netid (primary),
 * then name-part fuzzy match (fallback).
 */
export function filterCommitsByMember(
  commits: GitLabCommit[],
  memberNetid: string,
  memberName: string
): GitLabCommit[] {
  const netid = memberNetid.trim().toLowerCase();
  const nameParts = memberName.toLowerCase().split(/\s+/).filter((p) => p.length > 2);

  return commits.filter((c) => {
    if (c.author_email.toLowerCase().includes(netid)) return true;
    const authorLower = c.author_name.toLowerCase();
    return nameParts.some((part) => authorLower.includes(part));
  });
}

/**
 * Fetches a single commit with diff stats (additions, deletions).
 */
export async function fetchCommitDetail(
  gitlabUrl: string,
  token: string,
  sha: string
): Promise<GitLabCommitDetail> {
  const path = extractProjectPath(gitlabUrl);
  if (!path) throw new Error('Invalid GitLab URL');
  return gitlabFetch<GitLabCommitDetail>(
    `${GITLAB_BASE}/projects/${path}/repository/commits/${sha}`,
    token
  );
}

/**
 * Fetches all merge requests for the repo since a given ISO date, then filters
 * client-side by author username (= netid on ISU GitLab).
 * Uses state=all in one call to avoid relying on author_username param support.
 */
export async function fetchMemberMergeRequests(
  gitlabUrl: string,
  token: string,
  username: string,
  since: string,
  memberName = ''
): Promise<GitLabMergeRequest[]> {
  const path = extractProjectPath(gitlabUrl);
  if (!path) throw new Error('Invalid GitLab URL');
  const all = await gitlabFetch<GitLabMergeRequest[]>(
    `${GITLAB_BASE}/projects/${path}/merge_requests?state=all&created_after=${encodeURIComponent(since)}&per_page=100`,
    token
  );
  const netid = username.trim().toLowerCase();
  const nameParts = memberName.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
  return all.filter((mr) => {
    const authorUsername = mr.author?.username?.toLowerCase() ?? '';
    if (authorUsername === netid) return true;
    // Fallback: match by display name parts (handles netid ≠ GitLab username)
    const authorName = mr.author?.name?.toLowerCase() ?? '';
    return nameParts.some((part) => authorName.includes(part));
  });
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
