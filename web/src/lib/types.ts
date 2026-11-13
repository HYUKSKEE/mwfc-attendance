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
  /** 당일 취소 횟수 (참가 미인정) */
  cancel_count?: number;
  /** 무단 불참 횟수 (참가 미인정) */
  noshow_count?: number;
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
  /** 벙 시작 시각 HHMM (예: 2030 = 20:30). 소모임 e_t. 이전에 수집한 벙에는 없을 수 있음 */
  time?: number | null;
  w_t: number;
  place: string;
  attendee_ids: string[];
  attendee_names?: string[];
  count?: number;
  cat?: string;
  live?: boolean;
  /** 소모임 목록에서 처음 사라진 것을 수집이 감지한 시각(epoch ms). live=false 로 바뀔 때만 기록, 다시 나타나면 지움 */
  gone_at?: number | null;
  source?: string;
  manual?: boolean;
  cancelled?: boolean;
  /** 이 벙에서 지각한 사람 (attendee_ids 의 부분집합) */
  late_ids?: string[];
  /** 신청했다가 당일에 취소한 사람 (attendee_ids 의 부분집합, 출석 미인정) */
  cancel_ids?: string[];
  /** 신청하고 무단으로 불참한 사람 (attendee_ids 의 부분집합, 출석 미인정) */
  noshow_ids?: string[];
  /** 캘린더 표시일 YYYY-MM-DD (수정값 > 벙 날짜 > 작성일) */
  day?: string;
  edited?: boolean;
};

/** 참석자별 상태. 없으면 정상 참석 */
export type Status = "late" | "cancel" | "noshow";

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
  /** 탈퇴·강퇴(ban=Y)한 사람의 가입일 YYYY-MM-DD. 신규 가입 통계용(회원 목록에는 넣지 않음) */
  departed?: string[];
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
