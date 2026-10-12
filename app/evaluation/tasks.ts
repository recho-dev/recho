import type {TaskDefinition} from "./types.ts";

let tasksCache: TaskDefinition[] = [];
let loadPromise: Promise<TaskDefinition[]> | null = null;

/**
 * Fetch all study tasks from the database via the API.
 * Results are cached so subsequent calls return immediately.
 */
export async function loadTasks(): Promise<TaskDefinition[]> {
  if (tasksCache.length > 0) return tasksCache;
  if (loadPromise) return loadPromise;

  loadPromise = fetch("/api/tasks")
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load tasks (${response.status})`);
      return response.json();
    })
    .then((data: TaskDefinition[]) => {
      tasksCache = data.map((t) => ({
        ...t,
        tags: Array.isArray(t.tags) ? t.tags : [],
      }));
      return tasksCache;
    })
    .catch((error) => {
      loadPromise = null;
      throw error;
    });

  return loadPromise;
}

/**
 * Return cached tasks. Returns an empty array if loadTasks() has not completed.
 */
export function getTasks(): TaskDefinition[] {
  return tasksCache;
}

/**
 * Return cached task IDs. Returns an empty array if loadTasks() has not completed.
 */
export function getTaskIds(): string[] {
  return tasksCache.map((t) => t.id);
}

/**
 * Look up a task by ID from the cache.
 */
export function getTaskById(id: string): TaskDefinition | undefined {
  return tasksCache.find((task) => task.id === id);
}

/**
 * Update a task's code via the API and refresh the local cache.
 */
export async function updateTaskCode(id: string, code: string): Promise<boolean> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({code}),
  });
  if (!response.ok) return false;
  const task = tasksCache.find((t) => t.id === id);
  if (task) task.code = code;
  return true;
}

/**
 * Rename a task via the API and refresh the local cache.
 */
export async function renameTask(id: string, title: string): Promise<boolean> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({title}),
  });
  if (!response.ok) return false;
  const task = tasksCache.find((t) => t.id === id);
  if (task) task.title = title;
  return true;
}

/**
 * Delete a task via the API and remove from the local cache.
 */
export async function deleteTask(id: string): Promise<boolean> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) return false;
  tasksCache = tasksCache.filter((t) => t.id !== id);
  return true;
}

/**
 * Invalidate the local cache so the next loadTasks() fetches fresh data.
 */
export function invalidateTasksCache(): void {
  tasksCache = [];
  loadPromise = null;
}
