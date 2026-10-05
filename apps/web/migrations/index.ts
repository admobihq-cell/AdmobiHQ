import * as migration_20260601_164908 from './20260601_164908';
import * as migration_20260601_170426 from './20260601_170426';
import * as migration_20261003_120000_help_category_kind from './20261003_120000_help_category_kind';
import * as migration_20261005_120000_users_reset_password_requested_at from './20261005_120000_users_reset_password_requested_at';
import * as migration_20261005_130000_media_object_key from './20261005_130000_media_object_key';

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
  {
    up: migration_20261005_120000_users_reset_password_requested_at.up,
    down: migration_20261005_120000_users_reset_password_requested_at.down,
    name: '20261005_120000_users_reset_password_requested_at',
  },
  {
    up: migration_20261005_130000_media_object_key.up,
    down: migration_20261005_130000_media_object_key.down,
    name: '20261005_130000_media_object_key',
  },
];
