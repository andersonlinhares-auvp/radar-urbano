import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  pgEnum,
  customType,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

// PostGIS geography(Point,4326) e geometry(MultiPolygon,4326) via customType
//
// WARNING — drizzle-kit quoting issue:
// drizzle-kit's parseType() recognises "geometry" as a native PG type and emits it
// unquoted, but "geography" is NOT in its pgNativeTypes list. As a result, running
// `drizzle-kit generate` would emit  "geography(Point,4326)"  (quoted) which is
// invalid SQL and would break the migration.
//
// WORKAROUND: DO NOT delete and regenerate the migration file.  If you ever need to
// regenerate, you must manually remove the double-quotes around geography column types
// in the new *.sql file, e.g. change
//   "geography(Point,4326)"
// to
//   geography(Point,4326)
//
// The SRID and subtype constraints (Point,4326) and (MultiPolygon,4326) MUST be
// preserved exactly — they are what PostGIS needs for spatial indexing.
const geographyPoint = customType<{ data: string }>({
  dataType: () => 'geography(Point,4326)',
});
const geometryMultiPolygon = customType<{ data: string }>({
  dataType: () => 'geometry(MultiPolygon,4326)',
});

export const sourceKind = pgEnum('source_kind', ['OFFICIAL', 'COMMUNITY', 'NEWS', 'PARTNER']);
export const incidentStatus = pgEnum('incident_status', [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'RESOLVED',
]);
export const userRole = pgEnum('user_role', ['USER', 'MODERATOR', 'ADMIN']);
export const verificationKind = pgEnum('verification_kind', ['CONFIRM', 'DISPUTE']);
export const evidenceKind = pgEnum('evidence_kind', ['IMAGE', 'VIDEO']);
export const riskScope = pgEnum('risk_scope', ['STREET', 'NEIGHBORHOOD', 'REGION']);
export const notificationKind = pgEnum('notification_kind', [
  'CRITICAL',
  'ATTENTION',
  'VERIFIED',
  'CONFIRMATION',
  'DIGEST',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  role: userRole('role').notNull().default('USER'),
  reputation: integer('reputation').notNull().default(50),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }),
);

export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  kind: sourceKind('kind').notNull(),
  name: text('name').notNull(),
  baseTrust: doublePrecision('base_trust').notNull().default(0.4),
  url: text('url'),
});

export const incidentCategories = pgTable('incident_categories', {
  slug: text('slug').primaryKey(),
  label: text('label').notNull(),
  group: text('group').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  riskWeight: doublePrecision('risk_weight').notNull(),
  description: text('description').notNull(),
});

export const regions = pgTable(
  'regions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    geom: geometryMultiPolygon('geom'),
  },
  (t) => ({ geomIdx: index('regions_geom_idx').using('gist', t.geom) }),
);

export const neighborhoods = pgTable(
  'neighborhoods',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    regionId: uuid('region_id').references(() => regions.id),
    name: text('name').notNull(),
    geom: geometryMultiPolygon('geom'),
  },
  (t) => ({ geomIdx: index('neighborhoods_geom_idx').using('gist', t.geom) }),
);

export const incidents = pgTable(
  'incidents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    refCode: text('ref_code').notNull().unique(),
    categorySlug: text('category_slug')
      .notNull()
      .references(() => incidentCategories.slug),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
    authorId: uuid('author_id').references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    location: geographyPoint('location').notNull(),
    neighborhoodId: uuid('neighborhood_id').references(() => neighborhoods.id),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    status: incidentStatus('status').notNull().default('PENDING'),
    trustScore: integer('trust_score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ locIdx: index('incidents_location_idx').using('gist', t.location) }),
);

export const verifications = pgTable('verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  kind: verificationKind('kind').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  value: integer('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const evidenceAssets = pgTable('evidence_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  kind: evidenceKind('kind').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const riskScores = pgTable('risk_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  scope: riskScope('scope').notNull(),
  refId: text('ref_id').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  score: integer('score').notNull(),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const alertSubscriptions = pgTable(
  'alert_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    center: geographyPoint('center').notNull(),
    radiusKm: doublePrecision('radius_km').notNull().default(2),
    categories: text('categories').array(),
    minSeverity: text('min_severity').notNull().default('ATTENTION'),
    channels: text('channels').array().notNull().default(['IN_APP']),
    active: boolean('active').notNull().default(true),
  },
  (t) => ({ centerIdx: index('alert_center_idx').using('gist', t.center) }),
);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: notificationKind('kind').notNull(),
  incidentId: uuid('incident_id').references(() => incidents.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  body: text('body'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
