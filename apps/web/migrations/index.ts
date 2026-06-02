import * as migration_20260601_164908 from './20260601_164908';
import * as migration_20260601_170426 from './20260601_170426';

export const migrations = [
  {
    up: migration_20260601_164908.up,
    down: migration_20260601_164908.down,
    name: '20260601_164908',
  },
  {
    up: migration_20260601_170426.up,
    down: migration_20260601_170426.down,
    name: '20260601_170426'
  },
];
