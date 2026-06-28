#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

// Import the Aurora pool from the built app
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === '@/lib/db') {
    // Return mock auroraPool
    return {
      auroraPool: {
        query: async (sql, params) => {
          const pg = require('pg');
          const { RDSSigner } = require('@aws-sdk/rds-signer');
          const { fromEnv } = require('@aws-sdk/credential-providers');

          const credentials = await fromEnv()();
          const signer = new RDSSigner({
            region: process.env.AWS_REGION,
            hostname: process.env.PGHOST,
            port: parseInt(process.env.PGPORT || '5432'),
            username: process.env.PGUSER,
            credentials,
          });

          const token = signer.getAuthorizationHeader({
            username: process.env.PGUSER,
          });

          const pool = new pg.Pool({
            host: process.env.PGHOST,
            port: parseInt(process.env.PGPORT || '5432'),
            database: process.env.PGDATABASE,
            user: process.env.PGUSER,
            password: token,
            ssl: 'require',
          });

          try {
            const result = await pool.query(sql, params);
            return result;
          } finally {
            await pool.end();
          }
        }
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

(async () => {
  try {
    const pg = require('pg');
    const { RDSSigner } = require('@aws-sdk/rds-signer');
    const { fromEnv } = require('@aws-sdk/credential-providers');

    const credentials = await fromEnv()();
    
    const signer = new RDSSigner({
      region: process.env.AWS_REGION,
      hostname: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
      username: process.env.PGUSER,
      credentials,
    });

    const token = signer.getAuthorizationHeader({
      username: process.env.PGUSER,
    });

    const pool = new pg.Pool({
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: token,
      ssl: 'require',
    });

    console.log('[Migration] Creating game_scores table...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS game_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        game_id VARCHAR(255) NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON game_scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_game_scores_game_id ON game_scores(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_scores_created_at ON game_scores(created_at DESC);
    `;

    await pool.query(createTableSQL);
    console.log('✓ game_scores table created successfully');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Error:', err.message);
    process.exit(1);
  }
})();
