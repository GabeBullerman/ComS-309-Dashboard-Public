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
  // all=true fetches all branches; GitLab deduplicates by commit ID so merged commits count once
  return gitlabFetch<GitLabCommit[]>(
    `${GITLAB_BASE}/projects/${path}/repository/commits?per_page=100&since=${since}&all=true`,
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
  diffs?: { new_path: string }[];
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
 * Fetches a single commit's stats (additions, deletions) and file count.
 * Calls the stats endpoint and the diff endpoint in parallel.
 */
export async function fetchCommitDetail(
  gitlabUrl: string,
  token: string,
  sha: string
): Promise<GitLabCommitDetail> {
  const path = extractProjectPath(gitlabUrl);
  if (!path) throw new Error('Invalid GitLab URL');
  const base = `${GITLAB_BASE}/projects/${path}/repository/commits/${sha}`;
  const [detail, diffs] = await Promise.all([
    gitlabFetch<GitLabCommitDetail>(base, token),
    gitlabFetch<{ new_path: string }[]>(`${base}/diff`, token).catch(() => [] as { new_path: string }[]),
  ]);
  return { ...detail, diffs };
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

// ─── Compliance Analysis ──────────────────────────────────────────────────────

export interface GitLabDiffFile {
  diff: string;
  new_path: string;
  old_path: string;
  new_file: boolean;
  deleted_file: boolean;
}

/** File extensions excluded from frontend line-count (non-code / generated) */
const SKIP_EXTENSIONS = new Set([
  '.xml', '.json', '.lock', '.gradle', '.properties',
  '.md', '.txt', '.yaml', '.yml', '.png', '.jpg', '.jpeg',
  '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot',
  '.map', '.pdf', '.zip', '.tar', '.gz', '.class', '.jar',
]);

/** Known artifact / config filenames regardless of extension */
const SKIP_FILENAMES = new Set([
  'package-lock.json', 'yarn.lock', 'podfile.lock', 'gemfile.lock',
  '.gitignore', '.gitattributes', '.eslintrc', '.prettierrc', 'jest.config.js',
  'babel.config.js', 'metro.config.js', 'app.config.js', 'app.json',
]);

/** Trivial line patterns for frontend — getters, setters, lone braces, whitespace */
const TRIVIAL_FRONTEND: RegExp[] = [
  // getter method signature
  /^\s*(public\s+|private\s+|protected\s+)?\w[\w<>\[\], ]*\s+get[A-Z]\w*\s*\(\s*\)\s*\{?\s*$/,
  // setter method signature
  /^\s*(public\s+|private\s+|protected\s+)?void\s+set[A-Z]\w*\s*\([^)]*\)\s*\{?\s*$/,
  // simple return this.field;
  /^\s*return\s+this\.\w+;\s*$/,
  // simple this.field = param;
  /^\s*this\.\w+\s*=\s*\w+;\s*$/,
  // lone brace or empty
  /^\s*[{}]\s*$/,
  /^\s*$/,
];

/** Java/Spring annotations that don't count as meaningful backend additions */
const TRIVIAL_ANNOTATIONS = new Set([
  '@Override', '@SuppressWarnings', '@Deprecated', '@SafeVarargs', '@FunctionalInterface',
]);

/** Fetches the full unified diff for a single commit (file content included) */
export async function fetchCommitFullDiff(
  gitlabUrl: string,
  token: string,
  sha: string
): Promise<GitLabDiffFile[]> {
  const path = extractProjectPath(gitlabUrl);
  if (!path) throw new Error('Invalid GitLab URL');
  return gitlabFetch<GitLabDiffFile[]>(
    `${GITLAB_BASE}/projects/${path}/repository/commits/${sha}/diff?per_page=100`,
    token
  );
}

/**
 * Counts non-trivial line additions across a set of diffs for a Frontend member.
 * Skips generated/artifact files, getters, setters, lone braces, and whitespace.
 */
export function countFrontendAdditions(diffs: GitLabDiffFile[]): number {
  let count = 0;
  for (const file of diffs) {
    const ext = '.' + (file.new_path.split('.').pop()?.toLowerCase() ?? '');
    const filename = file.new_path.split('/').pop()?.toLowerCase() ?? '';
    if (SKIP_EXTENSIONS.has(ext)) continue;
    if (SKIP_FILENAMES.has(filename)) continue;
    if (filename.endsWith('.min.js') || filename.endsWith('.min.css')) continue;

    for (const line of file.diff.split('\n')) {
      if (!line.startsWith('+') || line.startsWith('+++')) continue;
      const content = line.slice(1); // strip leading +
      if (TRIVIAL_FRONTEND.some((re) => re.test(content))) continue;
      count++;
    }
  }
  return count;
}

/**
 * Counts meaningful Spring/Jakarta annotation additions for a Backend member.
 * Only counts lines like +@GetMapping, +@Service, +@Entity, etc.
 * Excludes @Override, @SuppressWarnings, and other trivial meta-annotations.
 */
export function countBackendAnnotations(diffs: GitLabDiffFile[]): number {
  let count = 0;
  for (const file of diffs) {
    for (const line of file.diff.split('\n')) {
      if (!line.startsWith('+') || line.startsWith('+++')) continue;
      const content = line.slice(1).trim();
      if (!content.startsWith('@')) continue;
      const annotationName = content.split(/[\s(]/)[0]; // e.g. "@GetMapping"
      if (TRIVIAL_ANNOTATIONS.has(annotationName)) continue;
      count++;
    }
  }
  return count;
}

export interface MemberComplianceResult {
  name: string;
  netid: string;
  role: 'Frontend' | 'Backend' | null;
  metric: number;
  threshold: number;
  passed: boolean;
  commitCount: number;
}

/**
 * Analyzes one week's commits for all members and returns per-member compliance.
 * Pass commits already filtered to the desired Sunday–Saturday window.
 * Uses the member's projectRole to decide which criterion to apply.
 */
export async function analyzeWeekCompliance(
  gitlabUrl: string,
  token: string,
  weekCommits: GitLabCommit[],
  members: { name: string; netid?: string; role?: string | null }[]
): Promise<MemberComplianceResult[]> {
  return Promise.all(
    members.map(async (member): Promise<MemberComplianceResult> => {
      const role = member.role === 'Frontend' || member.role === 'Backend'
        ? member.role
        : null;
      const memberCommits = filterCommitsByMember(weekCommits, member.netid ?? '', member.name);

      // Fetch diffs — cap at 15 commits per member to avoid GitLab rate limits
      const allDiffs: GitLabDiffFile[] = [];
      for (const commit of memberCommits.slice(0, 15)) {
        const fileDiffs = await fetchCommitFullDiff(gitlabUrl, token, commit.id)
          .catch((): GitLabDiffFile[] => []);
        allDiffs.push(...fileDiffs);
      }

      const threshold = role === 'Backend' ? 2 : 40;
      const metric = role === 'Backend'
        ? countBackendAnnotations(allDiffs)
        : countFrontendAdditions(allDiffs);

      return {
        name: member.name,
        netid: member.netid ?? '',
        role,
        metric,
        threshold,
        passed: role !== null && metric >= threshold,
        commitCount: memberCommits.length,
      };
    })
  );
}

/** Returns Sunday–Saturday bounds for a given week offset (0 = current week) */
export function getWeekBounds(offsetWeeks = 0): { start: Date; end: Date; label: string } {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay() + offsetWeeks * 7);
  sunday.setHours(0, 0, 0, 0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { start: sunday, end: saturday, label: `${fmt(sunday)} – ${fmt(saturday)}` };
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
