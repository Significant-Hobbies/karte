/** Only complete, unambiguous owner-introduction questions may skip retrieval. */
export function isProfileIntroQuery(
  query: string,
  displayName: string,
): boolean {
  const normalized = query
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[?!.]+$/, '')
    .trim();
  const fullName = displayName.toLowerCase().replace(/\s+/g, ' ').trim();
  const subjects = new Set(
    [fullName, fullName.split(' ')[0], 'this person', 'the owner'].filter(
      Boolean,
    ),
  );
  const introductions = new Set([
    'what is this profile about',
    'what is profile about',
    'who are you',
    'what do you do',
    'tell me about yourself',
    'tell me about this profile',
    'tell me about this person',
    'tell me about him',
    'tell me about her',
    'tell me about them',
  ]);
  for (const subject of subjects) {
    introductions.add(`who is ${subject}`);
    introductions.add(`what does ${subject} do`);
    introductions.add(`tell me about ${subject}`);
  }
  return introductions.has(normalized);
}
