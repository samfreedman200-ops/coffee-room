const ADJECTIVES = [
  "Quiet", "Curious", "Wandering", "Sleepy", "Pensive", "Restless", "Steady",
  "Idle", "Earnest", "Patient", "Lonesome", "Watchful", "Tender", "Hopeful",
  "Drowsy", "Anonymous", "Distant", "Half-awake", "Roaming", "Thoughtful",
];

const NOUNS = [
  "Espresso", "Latte", "Mug", "Stirrer", "Saucer", "Kettle", "Bean",
  "Drip", "Foam", "Press", "Grinder", "Macchiato", "Cortado", "Roast",
  "Spoon", "Crema", "Filter", "Aroma", "Cup", "Steam",
];

export function generateHandle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj} ${noun} #${num}`;
}
