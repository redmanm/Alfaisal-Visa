/* eslint-disable @typescript-eslint/no-explicit-any */
// Fan AlFaisal Recruitment - Neon PostgreSQL Client Adapter
// Seamless drop-in replacement connecting UI components directly to Neon PostgreSQL via Server Functions.

import {
  getRecordsServerFn,
  insertRecordServerFn,
  updateRecordServerFn,
  deleteRecordServerFn,
  getAuditLogsServerFn,
  getCountriesServerFn,
  getAgenciesServerFn,
  getAdminsServerFn,
  getExecutiveDashboardServerFn,
  authSignInServerFn,
  authSignUpServerFn,
  type RecordPayload,
} from "@/lib/server-api";

export interface AuthSession {
  access_token: string;
  user: {
    id: string;
    email: string;
    role?: string;
    assigned_country_ids?: string[];
    assigned_countries?: Array<{ id: string; name: string; country_code: string }>;
    user_metadata?: {
      full_name?: string;
      role?: string;
      assigned_country_ids?: string[];
    };
  };
}

type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "TOKEN_REFRESHED";
type AuthListener = (event: AuthChangeEvent, session: AuthSession | null) => void;

const authListeners = new Set<AuthListener>();

function notifyAuth(event: AuthChangeEvent, session: AuthSession | null) {
  for (const listener of Array.from(authListeners)) {
    try {
      listener(event, session);
    } catch (e) {
      console.error("Auth listener callback error:", e);
    }
  }
}

const STORAGE_KEY = "falfaisal_auth_session";

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure cookie is in sync with localStorage for server requests
      if (!document.cookie.includes(`${STORAGE_KEY}=`)) {
        document.cookie = `${STORAGE_KEY}=${encodeURIComponent(raw)}; path=/; max-age=2592000; SameSite=Lax`;
      }
      return parsed;
    }
    // Fallback: check document.cookie if localStorage was empty
    const match = document.cookie.match(new RegExp(`(?:^|; )${STORAGE_KEY}=([^;]*)`));
    if (match?.[1]) {
      const val = decodeURIComponent(match[1]);
      localStorage.setItem(STORAGE_KEY, val);
      return JSON.parse(val);
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      const serialized = JSON.stringify(session);
      localStorage.setItem(STORAGE_KEY, serialized);
      document.cookie = `${STORAGE_KEY}=${encodeURIComponent(serialized)}; path=/; max-age=2592000; SameSite=Lax`;
    } else {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `${STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch (err) {
    console.error("Failed to persist session to storage:", err);
  }
}

class NeonTableQueryBuilder<T = any> implements PromiseLike<{ data: T; error: any }> {
  private tableName: string;
  private operation: "select" | "insert" | "update" | "delete" = "select";
  private payload: any = null;
  private eqFilters: Record<string, any> = {};
  private rangeFrom?: number;
  private rangeTo?: number;
  private limitCount?: number;
  private orderCol?: string;
  private orderAsc = true;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_columns?: string): this {
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  range(from: number, to: number): this {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  eq(column: string, value: any): this {
    this.eqFilters[column] = value;
    return this;
  }

  insert(values: any): this {
    this.operation = "insert";
    this.payload = values;
    return this;
  }

  update(values: any): this {
    this.operation = "update";
    this.payload = values;
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  private async execute(): Promise<{ data: any; error: any }> {
    const session = getStoredSession();
    const actorEmail = session?.user?.email ?? "system";
    const actorId = session?.user?.id;
    const actorRole = session?.user?.role;

    if (this.tableName === "records") {
      if (this.operation === "select") {
        const res = await getRecordsServerFn({
          data: { userId: actorId, role: actorRole },
        });
        let list = res.data ?? [];
        if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
          list = list.slice(this.rangeFrom, this.rangeTo + 1);
        }
        return { data: list as any, error: res.error ? { message: res.error } : null };
      }

      if (this.operation === "insert") {
        const p = {
          ...(this.payload || {}),
          actor_email: actorEmail,
          actor_id: actorId,
          actor_role: actorRole,
        };
        const res = await insertRecordServerFn({ data: p as RecordPayload });
        return { data: res.data as any, error: res.error ? { message: res.error } : null };
      }

      if (this.operation === "update") {
        const id = this.eqFilters["id"];
        if (!id) return { data: null, error: { message: "Record ID required for update" } };
        const p = { ...(this.payload || {}), actor_email: actorEmail };
        const res = await updateRecordServerFn({
          data: { id, payload: p, actorRole, actorId },
        });
        return { data: res.data as any, error: res.error ? { message: res.error } : null };
      }

      if (this.operation === "delete") {
        const id = this.eqFilters["id"];
        if (!id) return { data: null, error: { message: "Record ID required for delete" } };
        const res = await deleteRecordServerFn({
          data: { id, actorRole, actorId },
        });
        return { data: null, error: res.error ? { message: res.error } : null };
      }
    }

    if (this.tableName === "countries") {
      const res = await getCountriesServerFn();
      return { data: res.data as any, error: res.error ? { message: res.error } : null };
    }

    if (this.tableName === "agencies") {
      const countryId = this.eqFilters["country_id"];
      const res = await getAgenciesServerFn({ data: { countryId } });
      return { data: res.data as any, error: res.error ? { message: res.error } : null };
    }

    if (this.tableName === "audit_log") {
      const serialNo = this.eqFilters["serial_no"]
        ? Number(this.eqFilters["serial_no"])
        : undefined;
      const res = await getAuditLogsServerFn({ data: { serial_no: serialNo } });
      return { data: res.data as any, error: res.error ? { message: res.error } : null };
    }

    if (this.tableName === "executive_dashboard") {
      const res = await getExecutiveDashboardServerFn({
        data: { userRole: actorRole, userId: actorId },
      });
      return {
        data: res.data as any,
        error: res.error ? { message: res.error } : null,
      };
    }

    if (this.tableName === "profiles" || this.tableName === "user_roles") {
      const res = await getAdminsServerFn({ data: { userRole: actorRole } });
      return {
        data: (res.data ?? []) as any,
        error: res.error ? { message: res.error } : null,
      };
    }

    return { data: [] as any, error: null };
  }

  then<TResult1 = { data: T; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: T; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected);
  }
}

export const supabase = {
  from: (table: string) => new NeonTableQueryBuilder(table),

  auth: {
    getSession: async () => {
      const session = getStoredSession();
      return { data: { session }, error: null };
    },

    getUser: async () => {
      const session = getStoredSession();
      return { data: { user: session?.user ?? null }, error: null };
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const res = await authSignInServerFn({ data: { email, password } });
      if (res.error || !res.session) {
        return {
          data: { user: null, session: null },
          error: { message: res.error || "فشل تسجيل الدخول" },
        };
      }
      setStoredSession(res.session as AuthSession);
      notifyAuth("SIGNED_IN", res.session as AuthSession);
      return {
        data: { user: res.user, session: res.session as AuthSession },
        error: null,
      };
    },

    signUp: async ({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: { full_name?: string } };
    }) => {
      const fullName = options?.data?.full_name;
      const res = await authSignUpServerFn({ data: { email, password, fullName } });
      if (res.error || !res.session) {
        return {
          data: { user: null, session: null },
          error: { message: res.error || "فشل تسجيل الحساب" },
        };
      }
      setStoredSession(res.session as AuthSession);
      notifyAuth("SIGNED_IN", res.session as AuthSession);
      return {
        data: { user: res.user, session: res.session as AuthSession },
        error: null,
      };
    },

    signOut: async () => {
      setStoredSession(null);
      notifyAuth("SIGNED_OUT", null);
      return { error: null };
    },

    onAuthStateChange: (listener: AuthListener) => {
      authListeners.add(listener);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(listener);
            },
          },
        },
      };
    },
  },
} as any;
