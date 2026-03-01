export interface Statute {
  id: string;
  state_code: string;
  title_number: string;
  title_name: string;
  chapter: string;
  section: string;
  section_title: string;
  section_text: string;
  last_updated: string;
  ingested_at: string;
}

export interface Bookmark {
  id: string;
  user_device_id: string;
  statute_id: string;
  created_at: string;
  alert_enabled: boolean;
  statute?: Statute;
}

export interface StatuteChangelog {
  id: string;
  statute_id: string;
  detected_at: string;
  previous_text: string;
  new_text: string;
  change_summary: string;
}
