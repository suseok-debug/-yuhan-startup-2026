/**
 * Storage Layer (Supabase 기반)
 * 
 * Supabase PostgreSQL을 사용하여 데이터를 영구 저장합니다.
 * - 모든 기기/브라우저에서 데이터 공유
 * - 서버에 영구 저장 (브라우저 캐시 삭제 무관)
 * - SQL 쿼리로 근거자료 추출 가능
 * 
 * 기존 localStorage 인터페이스(get/set/del/list/exportAll)를 그대로 유지하여
 * App.jsx 코드 수정 없이 동작합니다.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mpeikishsegawzdycuml.supabase.co";
const SUPABASE_KEY = "sb_publishable_5FdRTKdI6myjY4RhsKgoqA_DEZmnwe0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const store = {
  /**
   * 데이터 읽기
   * key 패턴: "app:ID", "apps-index", "evaluations-index", "eval:appId:evalId"
   */
  async get(key) {
    try {
      // 신청서 개별 조회: app:ID
      if (key.startsWith("app:")) {
        const id = key.substring(4);
        const { data, error } = await supabase
          .from("applications")
          .select("data")
          .eq("id", id)
          .single();
        if (error || !data) return null;
        return data.data;
      }

      // 신청서 목록 (apps-index)
      if (key === "apps-index") {
        const { data, error } = await supabase
          .from("applications")
          .select("id, status, created_at, data")
          .order("created_at", { ascending: false });
        if (error || !data) return [];
        return data.map(row => ({
          id: row.id,
          createdAt: row.created_at,
          status: row.status,
          clubName: row.data?.info?.clubName || ""
        }));
      }

      // 평가 목록 (evaluations-index)
      if (key === "evaluations-index") {
        const { data, error } = await supabase
          .from("evaluations")
          .select("*")
          .order("created_at", { ascending: false });
        if (error || !data) return [];
        return data.map(row => ({
          id: row.id,
          evaluator: row.evaluator,
          appId: row.app_id,
          clubName: row.club_name,
          scores: row.scores,
          comments: row.comments,
          total: row.total,
          createdAt: row.created_at
        }));
      }

      // 개별 평가 조회: eval:appId:evalId
      if (key.startsWith("eval:")) {
        const parts = key.split(":");
        const evalId = parts.slice(1).join(":");
        const { data, error } = await supabase
          .from("evaluations")
          .select("*")
          .eq("id", evalId)
          .single();
        if (error || !data) return null;
        return {
          evaluator: data.evaluator,
          appId: data.app_id,
          clubName: data.club_name,
          scores: data.scores,
          comments: data.comments,
          total: data.total,
          createdAt: data.created_at
        };
      }

      return null;
    } catch (e) {
      console.error("Storage get error:", key, e);
      return null;
    }
  },

  /**
   * 데이터 저장
   */
  async set(key, value) {
    try {
      // 신청서 저장: app:ID
      if (key.startsWith("app:")) {
        const id = key.substring(4);
        const { error } = await supabase
          .from("applications")
          .upsert({
            id: id,
            review_token: value.reviewToken || "",
            status: value.status || "draft",
            current_step: value.currentStep || 0,
            data: value,
            created_at: value.createdAt || new Date().toISOString(),
            submitted_at: value.submittedAt || null
          }, { onConflict: "id" });
        if (error) {
          console.error("Upsert app error:", error);
          return false;
        }
        return true;
      }

      // apps-index 저장 → Supabase에서는 자동 (테이블에서 파생)
      if (key === "apps-index") {
        // 별도 저장 불필요 - applications 테이블에서 자동 조회
        return true;
      }

      // evaluations-index 저장 → Supabase에서는 자동
      if (key === "evaluations-index") {
        return true;
      }

      // 개별 평가 저장: eval:appId:evalId
      if (key.startsWith("eval:")) {
        const parts = key.split(":");
        const evalId = parts.length >= 3 ? parts.slice(1).join(":") : key;
        const { error } = await supabase
          .from("evaluations")
          .upsert({
            id: evalId,
            app_id: value.appId || "",
            evaluator: value.evaluator || "",
            club_name: value.clubName || "",
            scores: value.scores || {},
            comments: value.comments || {},
            total: value.total || 0,
            created_at: value.createdAt || new Date().toISOString()
          }, { onConflict: "id" });
        if (error) {
          console.error("Upsert eval error:", error);
          return false;
        }
        return true;
      }

      return false;
    } catch (e) {
      console.error("Storage set error:", key, e);
      return false;
    }
  },

  /**
   * 데이터 삭제
   */
  async del(key) {
    try {
      if (key.startsWith("app:")) {
        const id = key.substring(4);
        await supabase.from("applications").delete().eq("id", id);
        return true;
      }
      if (key.startsWith("eval:")) {
        const evalId = key.split(":").slice(1).join(":");
        await supabase.from("evaluations").delete().eq("id", evalId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * 키 목록 조회
   */
  async list(prefix) {
    try {
      if (prefix === "app:") {
        const { data } = await supabase.from("applications").select("id");
        return (data || []).map(r => "app:" + r.id);
      }
      if (prefix === "eval:") {
        const { data } = await supabase.from("evaluations").select("id");
        return (data || []).map(r => "eval:" + r.id);
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * 전체 데이터 JSON 내보내기 (백업용)
   */
  async exportAll() {
    try {
      const apps = await supabase.from("applications").select("*");
      const evals = await supabase.from("evaluations").select("*");
      return {
        _exportedAt: new Date().toISOString(),
        _source: "supabase",
        applications: apps.data || [],
        evaluations: evals.data || []
      };
    } catch (e) {
      console.error("Export error:", e);
      return {};
    }
  },

  /**
   * JSON 데이터 가져오기 (복원용)
   */
  async importAll(data) {
    try {
      if (data.applications) {
        for (const app of data.applications) {
          await supabase.from("applications").upsert(app, { onConflict: "id" });
        }
      }
      if (data.evaluations) {
        for (const ev of data.evaluations) {
          await supabase.from("evaluations").upsert(ev, { onConflict: "id" });
        }
      }
      return true;
    } catch (e) {
      console.error("Import error:", e);
      return false;
    }
  }
};

export default store;
