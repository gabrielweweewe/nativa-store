/**
 * Temporary smoke-test file for PR Assistant.
 * Safe to delete after the review comment appears.
 * Not imported by the app.
 */

export async function fetchStoreStatus(url: string) {
  // Intentional: no check for non-OK responses
  const res = await fetch(url);
  return res.json();
}

export function formatLabel(a: string, b: string) {
  const x = a + " " + b;
  return x;
}

// Intentional duplication of formatLabel
export function formatLabelCopy(a: string, b: string) {
  const x = a + " " + b;
  return x;
}

export async function deleteThing(id: string) {
  // Intentional: fire-and-forget delete with no error handling
  await fetch(`/api/things/${id}`, { method: "DELETE" });
}
