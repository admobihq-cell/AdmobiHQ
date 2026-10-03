import * as migration_20260601_164908 from './20260601_164908';
import * as migration_20260601_170426 from './20260601_170426';
import * as migration_20261003_120000_help_category_kind from './20261003_120000_help_category_kind';

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
  {
    up: migration_20261003_120000_help_category_kind.up,
    down: migration_20261003_120000_help_category_kind.down,
    name: '20261003_120000_help_category_kind',
  },
];
