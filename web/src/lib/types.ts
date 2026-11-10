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
  /** 지각 횟수 (취소된 벙 제외) */
  late_count?: number;
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
  /** 이 벙에서 지각한 사람 (attendee_ids 의 부분집합) */
  late_ids?: string[];
  /** 캘린더 표시일 YYYY-MM-DD (수정값 > 벙 날짜 > 작성일) */
  day?: string;
  edited?: boolean;
};

export type MeetupEdit = { title?: string; date?: string; place?: string };

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
