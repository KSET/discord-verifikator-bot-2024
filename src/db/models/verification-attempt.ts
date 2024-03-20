export const VERIFICATION_ATTEMPT_TABLE = "verification_attempts";
export const VERIFICATION_ATTEMPT_TABLE_CREATE = `
create table if not exists ${VERIFICATION_ATTEMPT_TABLE} (
  id integer primary key autoincrement,
  userId integer not null,
  token text not null,
  createdAt datetime default (datetime('now')),
  usedAt datetime,
  foreign key (userId) references users (id)
);
`;

export type VertificationAttempt = {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  usedAt: Date;
};
