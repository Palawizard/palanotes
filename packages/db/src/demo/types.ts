export interface DemoNote {
  // Folder path with " / " between levels, e.g. "Cours / Réseau / TCP-IP".
  path: string;
  title: string;
  tags: string[];
  summary: string;
  content: string;
  // Fixed creation day (days before the seed date) for notes whose title carries a date.
  daysAgo?: number;
}
