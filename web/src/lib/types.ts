export type Member = {
  mid: string;
  name: string;
  joined: number;
  joined_date: string;
  last_visit: number;
  last_visit_date: string;
  intro_written: boolean;
  key: string;
  banned: boolean;
  is_owner?: boolean;
  // /data 병합 시 계산되는 값
  history?: HistoryItem[];
  attend_count?: number;
  last_attended?: string;
};

export type HistoryItem = {
  title?: string;
  date?: string;
  place?: string;
  w_t: number;
};

export type Meetup = {
  id?: string;
  title: string;
  date?: number | null; // e_d (YYYYMMDD)
  date_str: string;
  w_t: number;
  place: string;
  attendee_ids: string[];
  attendee_names?: string[];
  count?: number;
  cat?: string;
  live?: boolean;
  source?: string;
  manual?: boolean;
  cancelled?: boolean;
};

export type Group = {
  name: string;
  member_count: unknown;
  events: Array<{ name: unknown; date: unknown; time: unknown; place: unknown }>;
};

/** 자동수집 결과(벙은 archive 에 따로 저장) */
export type AttendanceBase = {
  group: Group;
  generated: string; // "YYYY-MM-DD HH:mm" (KST)
  members: Member[];
};

export type MergedData = AttendanceBase & { meetups: Meetup[] };

export type Note = {
  nick: string;
  tags: string[];
  memo: string;
  noshow: number;
  late: number;
  roles: string[];
};

export type Overrides = Record<string, { add: string[]; remove: string[] }>;
