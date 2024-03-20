export const USER_TABLE = "users";
export const USER_TABLE_CREATE = `
create table if not exists ${USER_TABLE} (
  id integer primary key autoincrement,
  discordId text not null unique,
  oib text not null,
  createdAt datetime default (datetime('now'))
);
`;

export type User = {
  id: string;
  discordId: string;
  oib: string;
  createdAt: Date;
};
