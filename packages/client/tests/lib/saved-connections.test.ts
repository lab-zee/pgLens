import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedConnections,
  saveConnection,
  removeSavedConnection,
  maskConnectionString,
} from '@/lib/saved-connections';

describe('saved-connections', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getSavedConnections', () => {
    it('should return empty array when nothing is saved', () => {
      expect(getSavedConnections()).toEqual([]);
    });

    it('should return saved connections', () => {
      saveConnection('postgresql://user:pass@localhost:5432/mydb');
      const saved = getSavedConnections();
      expect(saved).toHaveLength(1);
      expect(saved[0].connectionString).toBe('postgresql://user:pass@localhost:5432/mydb');
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('pglens:connections', 'not-json');
      expect(getSavedConnections()).toEqual([]);
    });
  });

  describe('saveConnection', () => {
    it('should save a connection with a parsed label', () => {
      saveConnection('postgresql://user:pass@myhost:5432/mydb');
      const saved = getSavedConnections();
      expect(saved[0].label).toBe('mydb @ myhost:5432');
    });

    it('should deduplicate — most recent first', () => {
      saveConnection('postgresql://user:pass@host/db1');
      saveConnection('postgresql://user:pass@host/db2');
      saveConnection('postgresql://user:pass@host/db1'); // re-use db1
      const saved = getSavedConnections();
      expect(saved).toHaveLength(2);
      expect(saved[0].label).toContain('db1'); // most recent
      expect(saved[1].label).toContain('db2');
    });

    it('should cap at 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        saveConnection(`postgresql://user:pass@host/db${i}`);
      }
      expect(getSavedConnections()).toHaveLength(20);
    });

    it('should store lastUsed timestamp', () => {
      saveConnection('postgresql://user:pass@host/db');
      const saved = getSavedConnections();
      expect(saved[0].lastUsed).toBeDefined();
      expect(new Date(saved[0].lastUsed).getTime()).not.toBeNaN();
    });
  });

  describe('removeSavedConnection', () => {
    it('should remove a specific connection', () => {
      saveConnection('postgresql://user:pass@host/db1');
      saveConnection('postgresql://user:pass@host/db2');
      removeSavedConnection('postgresql://user:pass@host/db1');
      const saved = getSavedConnections();
      expect(saved).toHaveLength(1);
      expect(saved[0].label).toContain('db2');
    });

    it('should be a no-op for non-existent connections', () => {
      saveConnection('postgresql://user:pass@host/db');
      removeSavedConnection('postgresql://nonexistent');
      expect(getSavedConnections()).toHaveLength(1);
    });
  });

  describe('maskConnectionString', () => {
    it('should mask the password', () => {
      expect(maskConnectionString('postgresql://user:secretpass@host:5432/db')).toBe(
        'postgresql://user:****@host:5432/db',
      );
    });

    it('should handle connection strings without password', () => {
      expect(maskConnectionString('postgresql://user@host/db')).toBe('postgresql://user@host/db');
    });

    it('should handle complex passwords', () => {
      expect(maskConnectionString('postgresql://user:p@ss:word@host/db')).toBe(
        'postgresql://user:****@ss:word@host/db',
      );
    });
  });
});
