import AsyncStorage from '@react-native-async-storage/async-storage';

const GITLAB_BASE = 'https://git.las.iastate.edu/api/v4';
const TOKEN_KEY = 'gitlab_token';

export async function getGitLabToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveGitLabToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token.trim());
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
  return buckets.reverse(); // oldest first
}
