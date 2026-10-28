import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

declare const process: any;

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  let detectedUsername = 'adir7';
  try {
    // @ts-ignore
    const os = await import('node:os');
    detectedUsername = os.userInfo().username || env.USERNAME || process.env.USERNAME || env.USER || 'adir7';
  } catch (e) {
    detectedUsername = env.USERNAME || process.env.USERNAME || env.USER || 'adir7';
  }

  // Resolve SQLite Database file path
  let rawPath = env.TASKBOARD_DATA_PATH || env.VITE_DATA_PATH || process.env.TASKBOARD_DATA_PATH || 'taskboard.db';
  if (rawPath.endsWith('.json')) {
    rawPath = rawPath.replace(/\.json$/i, '.db');
  } else if (!rawPath.endsWith('.db') && !rawPath.endsWith('.sqlite')) {
    rawPath = rawPath + '.db';
  }

  // @ts-ignore
  const path = await import('node:path');
  // @ts-ignore
  const fs = await import('node:fs');
  // @ts-ignore
  const { DatabaseSync } = await import('node:sqlite');

  const dbFile = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);

  /**
   * Helper function: opens the SQLite database file ON DEMAND for each read or write,
   * executes the operation, and IMMEDIATELY closes the connection in a finally block.
   * This guarantees that no process or user holds a persistent file lock on the .db file.
   */
  function withSqlite<T>(fn: (db: any) => T): T {
    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const db = new DatabaseSync(dbFile);
    try {
      // Wait up to 5000ms if another process is briefly writing
      db.exec('PRAGMA busy_timeout = 5000;');
      // Using DELETE journal mode ensures all data stays in .db and temporary rollback locks are released on close
      db.exec('PRAGMA journal_mode = DELETE;');
      return fn(db);
    } finally {
      try {
        db.close();
      } catch (closeErr) {
        console.error('[TaskBoard SQLite] Error closing database handle:', closeErr);
      }
    }
  }

  function initTables(db: any) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        display_name TEXT,
        role TEXT,
        computer_username TEXT,
        is_active INTEGER,
        data TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY,
        name TEXT,
        color TEXT,
        data TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY,
        team_id INTEGER,
        name TEXT,
        key TEXT,
        data TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS columns (
        id INTEGER PRIMARY KEY,
        project_id INTEGER,
        name TEXT,
        sort_order INTEGER,
        data TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY,
        project_id INTEGER,
        column_id INTEGER,
        title TEXT,
        status TEXT,
        priority TEXT,
        assignee_id INTEGER,
        data TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS versions (
        id INTEGER PRIMARY KEY,
        name TEXT,
        status TEXT,
        data TEXT,
        updated_at TEXT
      );
    `);
  }

  function saveSnapshot(db: any, payload: any) {
    initTables(db);
    const now = new Date().toISOString();
    const kvStmt = db.prepare('INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)');

    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      if (Array.isArray(payload.users)) {
        kvStmt.run('users', JSON.stringify(payload.users), now);
        db.exec('DELETE FROM users;');
        const userStmt = db.prepare(`
          INSERT OR REPLACE INTO users (id, username, display_name, role, computer_username, is_active, data, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const u of payload.users) {
          userStmt.run(
            u.id,
            u.username || u.name || '',
            u.name || u.display_name || '',
            u.role || 'USER',
            u.computer_username || u.computerUsername || '',
            u.is_active !== false ? 1 : 0,
            JSON.stringify(u),
            now
          );
        }
      }

      if (Array.isArray(payload.teams)) {
        kvStmt.run('teams', JSON.stringify(payload.teams), now);
        db.exec('DELETE FROM teams;');
        const teamStmt = db.prepare(`
          INSERT OR REPLACE INTO teams (id, name, color, data, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const t of payload.teams) {
          teamStmt.run(t.id, t.name || '', t.color || '', JSON.stringify(t), now);
        }
      }

      if (Array.isArray(payload.projects)) {
        kvStmt.run('projects', JSON.stringify(payload.projects), now);
        db.exec('DELETE FROM projects;');
        const projStmt = db.prepare(`
          INSERT OR REPLACE INTO projects (id, team_id, name, key, data, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const p of payload.projects) {
          projStmt.run(p.id, p.team_id || p.teamId || 1, p.name || '', p.key || '', JSON.stringify(p), now);
        }
      }

      if (Array.isArray(payload.columns)) {
        kvStmt.run('columns', JSON.stringify(payload.columns), now);
        db.exec('DELETE FROM columns;');
        const colStmt = db.prepare(`
          INSERT OR REPLACE INTO columns (id, project_id, name, sort_order, data, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const c of payload.columns) {
          colStmt.run(c.id, c.project_id || c.projectId || 1, c.name || '', c.sort_order || 0, JSON.stringify(c), now);
        }
      }

      if (Array.isArray(payload.tasks)) {
        kvStmt.run('tasks', JSON.stringify(payload.tasks), now);
        db.exec('DELETE FROM tasks;');
        const taskStmt = db.prepare(`
          INSERT OR REPLACE INTO tasks (id, project_id, column_id, title, status, priority, assignee_id, data, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const tk of payload.tasks) {
          taskStmt.run(
            tk.id,
            tk.project_id || tk.projectId || 1,
            tk.column_id || tk.columnId || 1,
            tk.title || '',
            tk.status || '',
            tk.priority || 'MEDIUM',
            tk.assignee_id || tk.assigneeId || null,
            JSON.stringify(tk),
            now
          );
        }
      }

      if (Array.isArray(payload.versions)) {
        kvStmt.run('versions', JSON.stringify(payload.versions), now);
        db.exec('DELETE FROM versions;');
        const verStmt = db.prepare(`
          INSERT OR REPLACE INTO versions (id, name, status, data, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const v of payload.versions) {
          verStmt.run(v.id, v.name || '', v.status || 'UNRELEASED', JSON.stringify(v), now);
        }
      }

      kvStmt.run('updatedAt', JSON.stringify(now), now);
      db.exec('COMMIT;');
    } catch (txErr) {
      try {
        db.exec('ROLLBACK;');
      } catch (rbErr) {}
      throw txErr;
    }
  }

  function readSnapshot(db: any) {
    initTables(db);
    const rows = db.prepare('SELECT key, value FROM kv_store').all();
    if (!rows || rows.length === 0) {
      return null;
    }
    const result: Record<string, any> = {};
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value);
      } catch (e) {
        result[r.key] = r.value;
      }
    }
    return result;
  }

  // Automatic Migration from legacy taskboard-data.json if exists and SQLite is fresh
  try {
    const legacyJsonPath = path.resolve(process.cwd(), 'taskboard-data.json');
    if (fs.existsSync(legacyJsonPath) && (!fs.existsSync(dbFile) || fs.statSync(dbFile).size === 0)) {
      const rawJson = fs.readFileSync(legacyJsonPath, 'utf-8');
      const parsedJson = JSON.parse(rawJson);
      withSqlite((db) => {
        saveSnapshot(db, parsedJson);
      });
      console.log(`[TaskBoard SQLite] Successfully migrated data from ${legacyJsonPath} to ${dbFile}`);
    }
  } catch (migErr) {
    console.warn('[TaskBoard SQLite] Migration check notice:', migErr);
  }

  function sqliteStoragePlugin() {
    return {
      name: 'vite-sqlite-storage-plugin',
      configureServer(server: any) {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          if (req.url === '/api/storage-info' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                engine: 'sqlite',
                filePath: dbFile,
                exists: fs.existsSync(dbFile),
                size: fs.existsSync(dbFile) ? fs.statSync(dbFile).size : 0,
              })
            );
            return;
          }

          if (req.url === '/api/storage' && req.method === 'GET') {
            try {
              if (fs.existsSync(dbFile)) {
                const data = withSqlite((db) => readSnapshot(db));
                if (data) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return;
                }
              }
            } catch (e) {
              console.error('[TaskBoard SQLite] Error reading database:', e);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({}));
            return;
          }

          if (req.url === '/api/storage' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body);
                withSqlite((db) => {
                  saveSnapshot(db, payload);
                });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, engine: 'sqlite', filePath: dbFile }));
              } catch (err: any) {
                console.error('[TaskBoard SQLite] Error writing to database:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: String(err) }));
              }
            });
            return;
          }

          next();
        });
      },
    };
  }

  return {
    plugins: [react(), sqliteStoragePlugin()],
    define: {
      __DETECTED_OS_USERNAME__: JSON.stringify(detectedUsername),
      __CONFIGURED_DATA_PATH__: JSON.stringify(dbFile),
    },
    server: {
      proxy: { '/api/v1': 'http://127.0.0.1:3000' },
    },
  };
});
