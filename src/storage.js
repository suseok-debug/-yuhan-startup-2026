/**
 * Storage Layer (localStorage 기반)
 * 
 * 현재: localStorage를 사용하여 브라우저에 데이터 저장
 * 향후: Supabase로 교체 시 이 파일만 수정하면 됩니다.
 * 
 * ⚠ localStorage 한계:
 *   - 브라우저별 약 5~10MB 용량 제한
 *   - 같은 기기/브라우저에서만 접근 가능
 *   - 브라우저 캐시 삭제 시 데이터 소실
 *   → Supabase 연동 후 해결됩니다.
 */

const PREFIX = "yuhan_startup_";

const store = {
  async get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("Storage set error:", e);
      return false;
    }
  },

  async del(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return true;
    } catch {
      return false;
    }
  },

  async list(prefix) {
    try {
      const keys = [];
      const fullPrefix = PREFIX + prefix;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(fullPrefix)) {
          keys.push(k.substring(PREFIX.length));
        }
      }
      return keys;
    } catch {
      return [];
    }
  },

  // 전체 데이터 JSON 내보내기 (백업용)
  async exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        try {
          data[k.substring(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
        } catch { /* skip */ }
      }
    }
    return data;
  },

  // JSON 데이터 가져오기 (복원용)
  async importAll(data) {
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    }
    return true;
  }
};

export default store;
