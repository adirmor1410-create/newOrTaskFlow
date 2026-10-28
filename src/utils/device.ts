declare const __DETECTED_OS_USERNAME__: string | undefined;

export function detectLocalComputerUsername(): string {
  let hostOsUser = '';
  try {
    if (typeof __DETECTED_OS_USERNAME__ !== 'undefined' && __DETECTED_OS_USERNAME__) {
      hostOsUser = __DETECTED_OS_USERNAME__.trim();
    }
  } catch (e) {}

  // Check existing stored computer username
  try {
    const saved = localStorage.getItem('jira_local_computer_username');
    if (saved && saved.trim() && !saved.startsWith('DESKTOP-') && !saved.startsWith('MACBOOK-') && !saved.startsWith('WORKSTATION-')) {
      return saved.trim();
    }

    // Check legacy key and clean up if it was old computer hardware prefix
    const oldSaved = localStorage.getItem('jira_local_computer_name');
    if (oldSaved && (oldSaved.startsWith('DESKTOP-') || oldSaved.startsWith('MACBOOK-') || oldSaved.startsWith('WORKSTATION-'))) {
      localStorage.removeItem('jira_local_computer_name');
    } else if (oldSaved && oldSaved.trim()) {
      localStorage.setItem('jira_local_computer_username', oldSaved.trim());
      return oldSaved.trim();
    }
  } catch (e) {}

  if (hostOsUser) {
    try {
      localStorage.setItem('jira_local_computer_username', hostOsUser);
    } catch (e) {}
    return hostOsUser;
  }

  const fallback = 'adir7';
  try {
    localStorage.setItem('jira_local_computer_username', fallback);
  } catch (e) {}
  return fallback;
}

// Backward-compatible alias
export const detectLocalComputerName = detectLocalComputerUsername;
