import React, { useState, useMemo, useEffect } from "react";
import { createRoot } from "react-dom/client";

// ---------- API ----------
async function api(path, method = "GET", body) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error de conexión con el servidor.");
  return data;
}

// ---------- Tokens de diseño (marca Ariztía) ----------
const C = {
  bg: "#F5F4F1", surface: "#FFFFFF", ink: "#231F1C", inkSoft: "#6B655E",
  line: "#E7E3DD", sidebar: "#26160F", sidebarText: "#C9BBB0",
  accent: "#C8102E", accentSoft: "#FBE9EC", brandYellow: "#FFC72C",
  epica: "#7C4DDB", historia: "#2E9E5B", tarea: "#2775D6", subtarea: "#8A94A6",
  danger: "#C8102E", warn: "#B97D10", warnBg: "#FCF3DE",
};

const TYPES = {
  historia: { label: "Historia", short: "H", color: C.historia, child: "epica" },
  epica: { label: "Épica", short: "E", color: C.epica, child: "tarea" },
  tarea: { label: "Tarea", short: "T", color: C.tarea, child: "subtarea" },
  subtarea: { label: "Subtarea", short: "S", color: C.subtarea, child: null },
};

const STATUSES = {
  todo: { label: "Por hacer", bg: "#EFECE7", fg: "#6B655E" },
  doing: { label: "En curso", bg: "#E3EDFB", fg: "#2775D6" },
  done: { label: "Hecho", bg: "#E2F3E8", fg: "#2E9E5B" },
};

const PRIORITIES = {
  alta: { label: "Alta", icon: "↑", color: "#C8102E" },
  media: { label: "Media", icon: "→", color: "#B97D10" },
  baja: { label: "Baja", icon: "↓", color: "#2E9E5B" },
};

// ---------- Utilidades de fechas ----------
const DAY = 24 * 60 * 60 * 1000;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const parseDate = (s) => (s ? new Date(s + "T00:00:00") : null);
const fmtDate = (s) => {
  const d = parseDate(s);
  if (!d) return "—";
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
};
const dueState = (item) => {
  if (!item.endDate || item.status === "done") return "none";
  const diff = Math.round((parseDate(item.endDate) - today()) / DAY);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "soon";
  return "ok";
};
const daysLeftLabel = (item) => {
  const diff = Math.round((parseDate(item.endDate) - today()) / DAY);
  if (diff < 0) return `vencida hace ${Math.abs(diff)} día${Math.abs(diff) === 1 ? "" : "s"}`;
  if (diff === 0) return "vence hoy";
  return `vence en ${diff} día${diff === 1 ? "" : "s"}`;
};

// ---------- Responsables (soporta varios por ítem) ----------
const assigneeIdsOf = (item) =>
  Array.isArray(item.assigneeIds) ? item.assigneeIds : item.assigneeId != null ? [item.assigneeId] : [];
const assigneesOf = (item, users) =>
  assigneeIdsOf(item).map((id) => users.find((u) => u.id === id)).filter(Boolean);

// Filtra los ítems asignados a una persona, conservando sus padres para no perder la jerarquía
function filterByAssignee(items, uid) {
  if (uid === "all") return items;
  const id = Number(uid);
  const byParent = {};
  items.forEach((it) => { (byParent[it.parentId ?? "root"] ||= []).push(it); });
  const keep = new Set();
  const walk = (it) => {
    let anyChild = false;
    (byParent[it.id] || []).forEach((c) => { if (walk(c)) anyChild = true; });
    if (assigneeIdsOf(it).includes(id) || anyChild) { keep.add(it.id); return true; }
    return false;
  };
  (byParent["root"] || []).forEach(walk);
  return items.filter((it) => keep.has(it.id));
}

// ---------- Componentes pequeños ----------
function TypeChip({ type }) {
  const t = TYPES[type];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: 5, background: t.color, color: "#fff",
      fontSize: 11, fontWeight: 700, flexShrink: 0,
    }} title={t.label}>{t.short}</span>
  );
}

function DueBadge({ item }) {
  const st = dueState(item);
  if (!item.endDate) return null;
  const styles = {
    overdue: { bg: C.accentSoft, fg: C.accent },
    soon: { bg: C.warnBg, fg: C.warn },
    ok: { bg: "#EFECE7", fg: C.inkSoft },
    none: { bg: "#EFECE7", fg: C.inkSoft },
  }[st];
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: styles.bg, color: styles.fg, flexShrink: 0, whiteSpace: "nowrap",
    }}>{st === "overdue" ? "⚠ " : ""}{fmtDate(item.endDate)}</span>
  );
}

function StatusPill({ status, onChange }) {
  const s = STATUSES[status];
  return (
    <select value={status} onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()}
      style={{
        background: s.bg, color: s.fg, border: "none", borderRadius: 6,
        fontSize: 12, fontWeight: 600, padding: "3px 6px", cursor: "pointer",
        appearance: "none", WebkitAppearance: "none",
      }}>
      {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
}

function Avatar({ user, size = 24 }) {
  if (!user) return <span style={{ width: size, height: size, borderRadius: "50%", background: C.line, display: "inline-block", flexShrink: 0 }} />;
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const hue = (user.id * 67) % 360;
  return (
    <span title={user.name} style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `hsl(${hue} 45% 40%)`, color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 700,
    }}>{initials}</span>
  );
}

function AvatarGroup({ users: list, size = 24, max = 3 }) {
  if (!list || list.length === 0) {
    return <span style={{ width: size, height: size, borderRadius: "50%", background: C.line, display: "inline-block", flexShrink: 0 }} title="Sin responsable" />;
  }
  const shown = list.slice(0, max);
  const extra = list.length - shown.length;
  return (
    <span title={list.map((u) => u.name).join(", ")} style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      {shown.map((u, i) => (
        <span key={u.id} style={{
          marginLeft: i === 0 ? 0 : -Math.round(size * 0.35),
          display: "inline-flex", borderRadius: "50%",
          border: "2px solid #fff", zIndex: shown.length - i, position: "relative",
        }}>
          <Avatar user={u} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span style={{
          marginLeft: -Math.round(size * 0.35), width: size, height: size, borderRadius: "50%",
          background: C.inkSoft, color: "#fff", display: "inline-flex",
          alignItems: "center", justifyContent: "center",
          fontSize: size * 0.4, fontWeight: 700, border: "2px solid #fff",
          position: "relative", zIndex: 0, boxSizing: "content-box",
        }}>+{extra}</span>
      )}
    </span>
  );
}

function Btn({ children, onClick, kind = "primary", small, disabled, style: extra }) {
  const base = {
    primary: { background: C.accent, color: "#fff", border: "1px solid " + C.accent },
    ghost: { background: "transparent", color: C.inkSoft, border: "1px solid " + C.line },
    danger: { background: "transparent", color: C.danger, border: "1px solid " + C.line },
  }[kind];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...base, borderRadius: 7, cursor: disabled ? "default" : "pointer", fontWeight: 600,
      fontSize: small ? 12 : 13.5, padding: small ? "5px 10px" : "9px 16px",
      opacity: disabled ? 0.6 : 1, fontFamily: "inherit", ...extra,
    }}>{children}</button>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "9px 11px",
  border: "1px solid " + C.line, borderRadius: 7, fontSize: 14,
  fontFamily: "inherit", color: C.ink, background: "#fff", outline: "none",
};

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.inkSoft, marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}

function BrandMark({ size = 30 }) {
  return (
    <span style={{
      width: size * 1.5, height: size, borderRadius: size, background: C.brandYellow,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: C.accent, fontWeight: 800, fontSize: size * 0.5, fontFamily: "'Sora', sans-serif",
      letterSpacing: "-0.02em",
    }}>A</span>
  );
}

// ---------- Login ----------
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const { user } = await api("/api/login", "POST", { email, password });
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.sidebar, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
      backgroundImage: "radial-gradient(circle at 82% 12%, rgba(200,16,46,.35), transparent 45%), radial-gradient(circle at 8% 88%, rgba(255,199,44,.22), transparent 40%)",
    }}>
      <div style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <BrandMark size={44} />
          <h1 style={{ color: "#fff", fontSize: 28, margin: "14px 0 0", letterSpacing: "-0.02em", fontFamily: "'Sora', sans-serif" }}>
            Ariztía · Gestión de proyectos
          </h1>
          <p style={{ color: C.sidebarText, fontSize: 14, marginTop: 8 }}>Historias, épicas, tareas y subtareas con fechas y alertas.</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: 26, boxShadow: "0 20px 50px rgba(0,0,0,.4)" }}>
          <Field label="Correo electrónico">
            <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@ariztia.com" />
          </Field>
          <Field label="Contraseña">
            <input style={inputStyle} type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" />
          </Field>
          {error && <p style={{ color: C.danger, fontSize: 12.5, marginTop: -6 }}>{error}</p>}
          <Btn onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 4 }}>
            {busy ? "Ingresando..." : "Iniciar sesión"}
          </Btn>
          <p style={{ fontSize: 12, color: C.inkSoft, marginTop: 14, marginBottom: 0, textAlign: "center" }}>
            ¿Sin acceso? Solicita tu cuenta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Modal crear/editar ítem ----------
function ItemModal({ mode, item, parent, users, onSave, onClose, onDelete }) {
  const [title, setTitle] = useState(item?.title || "");
  const [desc, setDesc] = useState(item?.desc || "");
  const [status, setStatus] = useState(item?.status || "todo");
  const [assigneeIds, setAssigneeIds] = useState(item ? assigneeIdsOf(item) : []);
  const [priority, setPriority] = useState(item?.priority || "media");
  const [startDate, setStartDate] = useState(item?.startDate || "");
  const [endDate, setEndDate] = useState(item?.endDate || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const type = item?.type || (parent ? TYPES[parent.type].child : "historia");
  const t = TYPES[type];

  const toggleAssignee = (id) =>
    setAssigneeIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  const save = async () => {
    if (!title.trim()) return;
    if (startDate && endDate && endDate < startDate) {
      setError("La fecha final no puede ser anterior a la fecha de inicio."); return;
    }
    setBusy(true); setError("");
    try {
      await onSave({
        title: title.trim(), desc, status, assigneeIds, priority, startDate, endDate,
        type, parentId: parent ? parent.id : item?.parentId ?? null,
      });
    } catch (e) {
      setError(e.message); setBusy(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`¿Eliminar ${item.key} y todo lo que contiene? Esta acción no se puede deshacer.`)) return;
    setBusy(true); setError("");
    try { await onDelete(item.id); } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(38,22,15,.55)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, width: 500, maxWidth: "100%",
        padding: 24, maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <TypeChip type={type} />
          <h2 style={{ margin: 0, fontSize: 17, fontFamily: "'Sora', sans-serif" }}>
            {mode === "edit" ? `Editar ${t.label.toLowerCase()}` : `Nueva ${t.label.toLowerCase()}`}
          </h2>
        </div>
        {parent && (
          <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: -8, marginBottom: 14 }}>
            Dentro de <b>{parent.key}</b> · {parent.title}
          </p>
        )}
        <Field label="Título">
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            placeholder={type === "historia" ? "Como usuario quiero..." : "Describe el trabajo"} />
        </Field>
        <Field label="Descripción">
          <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Fecha de inicio">
            <input style={inputStyle} type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setError(""); }} />
          </Field>
          <Field label="Fecha final (vencimiento)">
            <input style={inputStyle} type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setError(""); }} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Estado">
            <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Prioridad">
            <select style={inputStyle} value={priority} onChange={(e) => setPriority(e.target.value)}>
              {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label={`Responsables (${assigneeIds.length} seleccionado${assigneeIds.length === 1 ? "" : "s"})`}>
          <div style={{
            border: "1px solid " + C.line, borderRadius: 7, maxHeight: 150,
            overflowY: "auto", padding: 5, background: "#fff",
          }}>
            {users.length === 0 && (
              <p style={{ margin: 0, padding: 8, fontSize: 12.5, color: C.inkSoft }}>No hay usuarios disponibles.</p>
            )}
            {users.map((u) => {
              const checked = assigneeIds.includes(u.id);
              return (
                <label key={u.id} style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "6px 8px",
                  borderRadius: 6, cursor: "pointer", marginBottom: 1,
                  background: checked ? C.accentSoft : "transparent",
                }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleAssignee(u.id)}
                    style={{ accentColor: C.accent, cursor: "pointer" }} />
                  <Avatar user={u} size={22} />
                  <span style={{ fontSize: 13.5, color: C.ink, fontWeight: checked ? 600 : 400 }}>{u.name}</span>
                </label>
              );
            })}
          </div>
        </Field>
        {error && <p style={{ color: C.danger, fontSize: 12.5, marginTop: -4, marginBottom: 10 }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <div>
            {mode === "edit" && <Btn kind="danger" onClick={del} disabled={busy}>Eliminar</Btn>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" onClick={onClose} disabled={busy}>Cancelar</Btn>
            <Btn onClick={save} disabled={busy}>{busy ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Fila del árbol ----------
function TreeRow({ item, depth, users, childrenCount, expanded, onToggle, onAddChild, onEdit, onStatus, isAdmin, onMove }) {
  const t = TYPES[item.type];
  const assignees = assigneesOf(item, users);
  const pr = PRIORITIES[item.priority];
  return (
    <div
      onClick={() => onEdit(item)}
      style={{
        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        padding: "8px 12px 8px 0", background: C.surface,
        borderBottom: "1px solid " + C.line,
        paddingLeft: 12 + depth * 26,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#FAF8F5")}
      onMouseLeave={(e) => (e.currentTarget.style.background = C.surface)}
    >
      <span style={{ width: 3, alignSelf: "stretch", background: t.color, borderRadius: 2, marginRight: 2, flexShrink: 0 }} />
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
        style={{
          width: 20, height: 20, border: "none", background: "transparent", cursor: "pointer",
          color: C.inkSoft, fontSize: 11, flexShrink: 0,
          visibility: childrenCount > 0 ? "visible" : "hidden",
          transform: expanded ? "rotate(90deg)" : "none", transition: "transform .12s",
        }}
      >▶</button>
      <TypeChip type={item.type} />
      <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, flexShrink: 0, width: 52 }}>{item.key}</span>
      <span style={{
        fontSize: 14, color: C.ink, flex: 1, minWidth: 0, overflow: "hidden",
        textOverflow: "ellipsis", whiteSpace: "nowrap",
        textDecoration: item.status === "done" ? "line-through" : "none",
        opacity: item.status === "done" ? 0.6 : 1,
      }}>{item.title}</span>
      <DueBadge item={item} />
      <span title={"Prioridad " + pr.label} style={{ color: pr.color, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{pr.icon}</span>
      <StatusPill status={item.status} onChange={(s) => onStatus(item.id, s)} />
      <AvatarGroup users={assignees} />
      {isAdmin && (
        <span style={{ display: "inline-flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); onMove(item.id, "up"); }} title="Subir"
            style={{ border: "1px solid " + C.line, background: "#fff", borderRadius: 4, width: 18, height: 13, cursor: "pointer", color: C.inkSoft, fontSize: 7, lineHeight: 1, padding: 0 }}>▲</button>
          <button onClick={(e) => { e.stopPropagation(); onMove(item.id, "down"); }} title="Bajar"
            style={{ border: "1px solid " + C.line, background: "#fff", borderRadius: 4, width: 18, height: 13, cursor: "pointer", color: C.inkSoft, fontSize: 7, lineHeight: 1, padding: 0 }}>▼</button>
        </span>
      )}
      {t.child && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddChild(item); }}
          title={"Añadir " + TYPES[t.child].label.toLowerCase()}
          style={{
            border: "1px solid " + C.line, background: "#fff", borderRadius: 6,
            width: 24, height: 24, cursor: "pointer", color: C.inkSoft, fontSize: 14,
            flexShrink: 0, lineHeight: 1,
          }}
        >+</button>
      )}
    </div>
  );
}

// ---------- Vista Cronograma (Gantt) ----------
function GanttView({ items, onEdit }) {
  const byParent = useMemo(() => {
    const m = {};
    items.forEach((it) => { (m[it.parentId ?? "root"] ||= []).push(it); });
    return m;
  }, [items]);

  const rows = useMemo(() => {
    const out = [];
    const walk = (parentId, depth) => {
      (byParent[parentId ?? "root"] || []).forEach((it) => {
        out.push({ ...it, depth });
        walk(it.id, depth + 1);
      });
    };
    walk(null, 0);
    return out;
  }, [byParent]);

  const dated = rows.filter((r) => r.startDate && r.endDate);
  if (dated.length === 0) {
    return (
      <div style={{ background: C.surface, border: "1px solid " + C.line, borderRadius: 12, padding: 30, textAlign: "center", color: C.inkSoft, fontSize: 14 }}>
        Para ver el cronograma, asigna fecha de inicio y fecha final a tus ítems.
      </div>
    );
  }

  let min = Math.min(...dated.map((r) => parseDate(r.startDate).getTime()));
  let max = Math.max(...dated.map((r) => parseDate(r.endDate).getTime()));
  min -= 4 * DAY; max += 6 * DAY;
  const span = max - min;
  const pct = (t) => ((t - min) / span) * 100;

  const months = [];
  const cursor = new Date(min);
  cursor.setDate(1);
  if (cursor.getTime() < min) cursor.setMonth(cursor.getMonth() + 1);
  while (cursor.getTime() <= max) {
    months.push({
      t: cursor.getTime(),
      label: cursor.toLocaleDateString("es-CL", { month: "short", year: months.length === 0 ? "2-digit" : undefined }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const now = today().getTime();
  const labelW = 250;

  return (
    <div style={{ background: C.surface, border: "1px solid " + C.line, borderRadius: 12, overflow: "auto" }}>
      <div style={{ minWidth: 700 }}>
        <div style={{ display: "flex", borderBottom: "1px solid " + C.line, background: "#FAF8F5" }}>
          <div style={{ width: labelW, flexShrink: 0, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: C.inkSoft }}>Ítem</div>
          <div style={{ flex: 1, position: "relative", height: 32 }}>
            {months.map((m) => (
              <span key={m.t} style={{
                position: "absolute", left: pct(m.t) + "%", top: 8,
                fontSize: 11.5, fontWeight: 600, color: C.inkSoft,
                borderLeft: "1px solid " + C.line, paddingLeft: 6, height: 24,
              }}>{m.label}</span>
            ))}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: labelW, right: 0, pointerEvents: "none" }}>
            {months.map((m) => (
              <span key={m.t} style={{ position: "absolute", left: pct(m.t) + "%", top: 0, bottom: 0, borderLeft: "1px solid " + C.line, opacity: 0.6 }} />
            ))}
            {now >= min && now <= max && (
              <span style={{ position: "absolute", left: pct(now) + "%", top: 0, bottom: 0, borderLeft: "2px solid " + C.accent }} title="Hoy" />
            )}
          </div>
          {rows.map((r) => {
            const hasDates = r.startDate && r.endDate;
            const start = hasDates ? parseDate(r.startDate).getTime() : null;
            const end = hasDates ? parseDate(r.endDate).getTime() + DAY : null;
            const st = dueState(r);
            return (
              <div key={r.id} onClick={() => onEdit(r)} style={{
                display: "flex", alignItems: "center", borderBottom: "1px solid " + C.line,
                cursor: "pointer", height: 38,
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FAF8F5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{
                  width: labelW, flexShrink: 0, padding: "0 12px 0 " + (12 + r.depth * 18) + "px",
                  display: "flex", alignItems: "center", gap: 7, overflow: "hidden",
                }}>
                  <TypeChip type={r.type} />
                  <span style={{
                    fontSize: 13, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    textDecoration: r.status === "done" ? "line-through" : "none",
                    opacity: r.status === "done" ? 0.55 : 1,
                  }}>{r.key} · {r.title}</span>
                </div>
                <div style={{ flex: 1, position: "relative", height: "100%" }}>
                  {hasDates ? (
                    <div title={`${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}`} style={{
                      position: "absolute", top: 9, height: 20,
                      left: pct(start) + "%",
                      width: Math.max(pct(end) - pct(start), 1.2) + "%",
                      background: TYPES[r.type].color,
                      opacity: r.status === "done" ? 0.35 : 0.9,
                      borderRadius: 6,
                      border: st === "overdue" ? "2px solid " + C.accent : "none",
                      boxSizing: "border-box",
                    }} />
                  ) : (
                    <span style={{ position: "absolute", top: 11, left: 8, fontSize: 11.5, color: C.inkSoft }}>sin fechas</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "10px 14px", fontSize: 11.5, color: C.inkSoft }}>
          {Object.entries(TYPES).map(([k, v]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 9, borderRadius: 3, background: v.color, display: "inline-block" }} />{v.label}
            </span>
          ))}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 2, height: 12, background: C.accent, display: "inline-block" }} />Hoy
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 9, borderRadius: 3, border: "2px solid " + C.accent, display: "inline-block", boxSizing: "border-box" }} />Vencido
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- Vista Backlog ----------
function BacklogView({ items, users, isAdmin, filterUser, onFilterUser, onAddRoot, onAddChild, onEdit, onStatus, onMove }) {
  // Por defecto todo comprimido: se ve solo el nivel de historias
  const [expandedMap, setExpandedMap] = useState({});
  const [mode, setMode] = useState("list");
  const filterActive = filterUser !== "all";
  const byParent = useMemo(() => {
    const m = {};
    items.forEach((it) => { (m[it.parentId ?? "root"] ||= []).push(it); });
    return m;
  }, [items]);

  const toggle = (id) => setExpandedMap((c) => ({ ...c, [id]: !c[id] }));
  const expandAll = () => {
    const m = {};
    items.forEach((it) => { m[it.id] = true; });
    setExpandedMap(m);
  };
  const collapseAll = () => setExpandedMap({});

  const renderBranch = (parentId, depth) => {
    const list = byParent[parentId ?? "root"] || [];
    return list.map((it) => {
      const kids = byParent[it.id] || [];
      // Con un filtro de responsable activo se expande todo para mostrar sus tareas
      const expanded = filterActive ? true : !!expandedMap[it.id];
      return (
        <div key={it.id}>
          <TreeRow item={it} depth={depth} users={users} childrenCount={kids.length}
            expanded={expanded} onToggle={toggle} onAddChild={onAddChild}
            onEdit={onEdit} onStatus={onStatus} isAdmin={isAdmin} onMove={onMove} />
          {expanded && renderBranch(it.id, depth + 1)}
        </div>
      );
    });
  };

  const tabStyle = (active) => ({
    border: "1px solid " + (active ? C.accent : C.line),
    background: active ? C.accentSoft : "#fff",
    color: active ? C.accent : C.inkSoft,
    borderRadius: 7, padding: "6px 14px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontFamily: "'Sora', sans-serif" }}>Backlog</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.inkSoft }}>
            Jerarquía: Historia → Épica → Tarea → Subtarea. Usa <b>+</b> en cada fila para crear el nivel siguiente.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={filterUser} onChange={(e) => onFilterUser(e.target.value)}
            style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 13 }}>
            <option value="all">👤 Todos los responsables</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {mode === "list" && !filterActive && (
            <>
              <button style={tabStyle(false)} onClick={expandAll} title="Expandir todo">⊞</button>
              <button style={tabStyle(false)} onClick={collapseAll} title="Contraer todo">⊟</button>
            </>
          )}
          <button style={tabStyle(mode === "list")} onClick={() => setMode("list")}>☰ Lista</button>
          <button style={tabStyle(mode === "gantt")} onClick={() => setMode("gantt")}>▤ Cronograma</button>
          <Btn onClick={onAddRoot}>+ Nueva historia</Btn>
        </div>
      </div>
      {filterActive && (
        <p style={{
          background: C.accentSoft, color: C.accent, borderRadius: 8, padding: "8px 14px",
          fontSize: 13, fontWeight: 600, marginTop: 0, marginBottom: 14,
        }}>
          Mostrando solo el trabajo de {users.find((u) => u.id === Number(filterUser))?.name || "—"}.{" "}
          <button onClick={() => onFilterUser("all")} style={{
            border: "none", background: "none", color: C.accent, cursor: "pointer",
            fontWeight: 700, textDecoration: "underline", fontFamily: "inherit", fontSize: 13,
          }}>Quitar filtro</button>
        </p>
      )}
      {mode === "gantt" ? (
        <GanttView items={items} onEdit={onEdit} />
      ) : (
        <div style={{ background: C.surface, border: "1px solid " + C.line, borderRadius: 12, overflow: "hidden" }}>
          {items.length === 0 ? (
            <p style={{ padding: 30, textAlign: "center", color: C.inkSoft, fontSize: 14 }}>
              Aún no hay trabajo planificado. Crea tu primera historia para empezar.
            </p>
          ) : renderBranch(null, 0)}
        </div>
      )}
    </div>
  );
}

// ---------- Vista Tablero ----------
function BoardView({ items, users, filterUser, onFilterUser, onStatus, onEdit }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [dragId, setDragId] = useState(null);
  const filtered = items
    .filter((it) => typeFilter === "all" || it.type === typeFilter)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontFamily: "'Sora', sans-serif" }}>Tablero</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={filterUser} onChange={(e) => onFilterUser(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="all">👤 Todos los responsables</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="all">Todos los tipos</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}s</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
        {Object.entries(STATUSES).map(([sk, sv]) => {
          const col = filtered.filter((it) => it.status === sk);
          return (
            <div key={sk}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId != null) { onStatus(dragId, sk); setDragId(null); } }}
              style={{ background: "#ECE9E3", borderRadius: 12, padding: 10, minHeight: 220 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 6px 10px" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: sv.fg }}>{sv.label}</span>
                <span style={{ fontSize: 12, color: C.inkSoft }}>{col.length}</span>
              </div>
              {col.map((it) => {
                const assignees = assigneesOf(it, users);
                const pr = PRIORITIES[it.priority];
                return (
                  <div key={it.id} draggable
                    onDragStart={() => setDragId(it.id)}
                    onClick={() => onEdit(it)}
                    style={{
                      background: "#fff", borderRadius: 9, padding: "10px 11px", marginBottom: 8,
                      cursor: "grab", border: "1px solid " + C.line,
                      borderLeft: "3px solid " + TYPES[it.type].color,
                      boxShadow: "0 1px 2px rgba(38,22,15,.06)",
                    }}
                  >
                    <div style={{ fontSize: 13.5, color: C.ink, marginBottom: 8, lineHeight: 1.35 }}>{it.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <TypeChip type={it.type} />
                      <span style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600, flex: 1 }}>{it.key}</span>
                      <DueBadge item={it} />
                      <span style={{ color: pr.color, fontWeight: 800, fontSize: 13 }}>{pr.icon}</span>
                      <AvatarGroup users={assignees} size={20} />
                    </div>
                  </div>
                );
              })}
              {col.length === 0 && (
                <p style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", marginTop: 30 }}>Arrastra tarjetas aquí</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Vista Alertas ----------
function AlertsView({ items, users, currentUser, onEdit }) {
  const [sendMsg, setSendMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const alertItems = items
    .filter((it) => ["overdue", "soon"].includes(dueState(it)))
    .sort((a, b) => (a.endDate > b.endDate ? 1 : -1));

  const sendNow = async () => {
    setBusy(true); setSendMsg("");
    try {
      const r = await api("/api/alerts/send", "POST");
      setSendMsg(r.message);
    } catch (e) {
      setSendMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontFamily: "'Sora', sans-serif" }}>Alertas de vencimiento</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.inkSoft }}>
            Trabajo vencido o que vence en los próximos 3 días. El servidor envía recordatorios por correo automáticamente cada mañana.
          </p>
        </div>
        {currentUser.role === "admin" && (
          <Btn onClick={sendNow} disabled={busy}>{busy ? "Enviando..." : "✉ Enviar recordatorios ahora"}</Btn>
        )}
      </div>
      {sendMsg && (
        <p style={{ background: C.accentSoft, color: C.accent, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600 }}>{sendMsg}</p>
      )}
      <div style={{ background: C.surface, border: "1px solid " + C.line, borderRadius: 12, overflow: "hidden" }}>
        {alertItems.length === 0 ? (
          <p style={{ padding: 30, textAlign: "center", color: C.inkSoft, fontSize: 14 }}>
            Todo al día: no hay tareas vencidas ni próximas a vencer. ✓
          </p>
        ) : alertItems.map((it) => {
          const assignees = assigneesOf(it, users);
          const st = dueState(it);
          return (
            <div key={it.id} onClick={() => onEdit(it)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderBottom: "1px solid " + C.line, cursor: "pointer",
              borderLeft: "4px solid " + (st === "overdue" ? C.accent : C.warn),
            }}>
              <TypeChip type={it.type} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.key} · {it.title}
                </div>
                <div style={{ fontSize: 12.5, color: st === "overdue" ? C.accent : C.warn, fontWeight: 600 }}>
                  {daysLeftLabel(it)} · {assignees.length > 1 ? "responsables" : "responsable"}: {assignees.map((u) => u.name).join(", ") || "sin asignar"}
                </div>
              </div>
              <AvatarGroup users={assignees} size={22} />
              <DueBadge item={it} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Vista Usuarios ----------
function UsersView({ users, currentUser, onCreate, onDelete }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("miembro");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) { setOk(false); setMsg("Completa nombre, correo y contraseña."); return; }
    setBusy(true); setMsg("");
    try {
      await onCreate({ name: name.trim(), email: email.trim(), password, role });
      setName(""); setEmail(""); setPassword(""); setRole("miembro");
      setOk(true); setMsg("Usuario creado. Ya puede iniciar sesión desde cualquier equipo.");
    } catch (e) {
      setOk(false); setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const del = async (u) => {
    if (!window.confirm(`¿Eliminar la cuenta de ${u.name}?`)) return;
    try { await onDelete(u.id); } catch (e) { setOk(false); setMsg(e.message); }
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 16px", fontSize: 20, fontFamily: "'Sora', sans-serif" }}>Usuarios</h2>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 18, alignItems: "start" }}>
        <div style={{ background: C.surface, border: "1px solid " + C.line, borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Crear usuario</h3>
          <Field label="Nombre completo">
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="María Pérez" />
          </Field>
          <Field label="Correo electrónico">
            <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@ariztia.com" />
          </Field>
          <Field label="Contraseña (mínimo 6 caracteres)">
            <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Rol">
            <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="miembro">Miembro</option>
              <option value="admin">Administrador</option>
            </select>
          </Field>
          {msg && <p style={{ fontSize: 12.5, color: ok ? C.historia : C.danger, marginTop: -4 }}>{msg}</p>}
          <Btn onClick={submit} disabled={busy} style={{ width: "100%" }}>{busy ? "Creando..." : "Crear usuario"}</Btn>
        </div>
        <div style={{ background: C.surface, border: "1px solid " + C.line, borderRadius: 12, overflow: "hidden" }}>
          {users.map((u) => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderBottom: "1px solid " + C.line,
            }}>
              <Avatar user={u} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
                  {u.name} {u.id === currentUser.id && <span style={{ fontSize: 11, color: C.inkSoft, fontWeight: 500 }}>(tú)</span>}
                </div>
                <div style={{ fontSize: 12.5, color: C.inkSoft, overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
              </div>
              <span style={{
                fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                background: u.role === "admin" ? C.accentSoft : "#EFECE7",
                color: u.role === "admin" ? C.accent : C.inkSoft,
              }}>{u.role === "admin" ? "Administrador" : "Miembro"}</span>
              {u.id !== currentUser.id && (
                <Btn kind="danger" small onClick={() => del(u)}>Eliminar</Btn>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Modal cambiar contraseña ----------
function PasswordModal({ onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setMsg("");
    try {
      await api("/api/change-password", "POST", { current, next });
      setOk(true); setMsg("Contraseña actualizada.");
      setTimeout(onClose, 1200);
    } catch (e) {
      setOk(false); setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(38,22,15,.55)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: 380, maxWidth: "100%", padding: 24 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 17, fontFamily: "'Sora', sans-serif" }}>Cambiar mi contraseña</h2>
        <Field label="Contraseña actual">
          <input style={inputStyle} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="Nueva contraseña (mínimo 6 caracteres)">
          <input style={inputStyle} type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        {msg && <p style={{ fontSize: 12.5, color: ok ? C.historia : C.danger, marginTop: -4 }}>{msg}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn kind="ghost" onClick={onClose} disabled={busy}>Cancelar</Btn>
          <Btn onClick={submit} disabled={busy}>{busy ? "Guardando..." : "Guardar"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ---------- App principal ----------
function AriztiaApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [view, setView] = useState("backlog");
  const [modal, setModal] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const refresh = async () => {
    const { users, items } = await api("/api/state");
    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setUsers(users); setItems(items);
  };

  const visibleItems = useMemo(() => filterByAssignee(items, assigneeFilter), [items, assigneeFilter]);

  // Restaurar sesión al cargar y refrescar datos cada 15 segundos
  useEffect(() => {
    (async () => {
      try {
        const { user } = await api("/api/me");
        if (user) { setCurrentUser(user); await refresh(); }
      } catch { /* sin sesión */ }
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const t = setInterval(() => refresh().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [currentUser]);

  const alertCount = items.filter((it) => ["overdue", "soon"].includes(dueState(it))).length;

  const setStatus = async (id, status) => {
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, status } : it)));
    try { await api(`/api/items/${id}`, "PUT", { status }); } catch (e) { setLoadError(e.message); refresh(); }
  };

  const saveItem = async (data) => {
    if (modal.mode === "edit") {
      await api(`/api/items/${modal.item.id}`, "PUT", data);
    } else {
      await api("/api/items", "POST", data);
    }
    await refresh();
    setModal(null);
  };

  const deleteItem = async (id) => {
    await api(`/api/items/${id}`, "DELETE");
    await refresh();
    setModal(null);
  };

  const moveItem = async (id, direction) => {
    try {
      await api(`/api/items/${id}/move`, "PUT", { direction });
      await refresh();
    } catch (e) {
      setLoadError(e.message);
    }
  };

  const createUser = async (data) => {
    await api("/api/users", "POST", data);
    await refresh();
  };

  const deleteUser = async (id) => {
    await api(`/api/users/${id}`, "DELETE");
    await refresh();
  };

  const logout = async () => {
    await api("/api/logout", "POST").catch(() => {});
    setCurrentUser(null); setUsers([]); setItems([]);
  };

  if (checking) {
    return <div style={{ minHeight: "100vh", background: C.sidebar }} />;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={async (u) => { setCurrentUser(u); setView("backlog"); await refresh(); }} />;
  }

  const navItems = [
    { id: "backlog", label: "Backlog", icon: "☰" },
    { id: "board", label: "Tablero", icon: "▦" },
    { id: "alerts", label: "Alertas", icon: "🔔", badge: alertCount },
    ...(currentUser.role === "admin" ? [{ id: "users", label: "Usuarios", icon: "◉" }] : []),
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <aside style={{
        width: 214, background: C.sidebar, color: C.sidebarText, padding: "20px 12px",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px", marginBottom: 26 }}>
          <BrandMark size={26} />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15.5, fontFamily: "'Sora', sans-serif" }}>Ariztía</span>
        </div>
        {navItems.map((n) => (
          <button key={n.id} onClick={() => setView(n.id)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
            background: view === n.id ? "rgba(200,16,46,.32)" : "transparent",
            color: view === n.id ? "#fff" : C.sidebarText,
            border: "none", borderRadius: 8, padding: "9px 10px", fontSize: 13.5,
            fontWeight: 600, cursor: "pointer", marginBottom: 3, fontFamily: "inherit",
          }}>
            <span style={{ fontSize: 15 }}>{n.icon}</span>
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge > 0 && (
              <span style={{
                background: C.accent, color: "#fff", borderRadius: 20, fontSize: 11,
                fontWeight: 700, padding: "1px 7px",
              }}>{n.badge}</span>
            )}
          </button>
        ))}
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 6px", marginBottom: 10 }}>
            <Avatar user={currentUser} size={28} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
              <div style={{ fontSize: 11 }}>{currentUser.role === "admin" ? "Administrador" : "Miembro"}</div>
            </div>
          </div>
          <button onClick={() => setShowPassword(true)} style={{
            width: "100%", background: "transparent", border: "none",
            color: C.sidebarText, padding: "4px 6px", fontSize: 12, textAlign: "left",
            cursor: "pointer", fontFamily: "inherit", marginBottom: 6,
          }}>Cambiar contraseña</button>
          <button onClick={logout} style={{
            width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,.18)",
            color: C.sidebarText, borderRadius: 8, padding: "7px 10px", fontSize: 12.5,
            cursor: "pointer", fontFamily: "inherit",
          }}>Cerrar sesión</button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "26px 30px", minWidth: 0 }}>
        {loadError && (
          <p style={{ background: C.accentSoft, color: C.accent, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600 }}>
            {loadError} <button onClick={() => setLoadError("")} style={{ border: "none", background: "none", color: C.accent, cursor: "pointer", fontWeight: 700 }}>✕</button>
          </p>
        )}
        {view === "backlog" && (
          <BacklogView items={visibleItems} users={users}
            isAdmin={currentUser.role === "admin"}
            filterUser={assigneeFilter} onFilterUser={setAssigneeFilter}
            onAddRoot={() => setModal({ mode: "create", parent: null })}
            onAddChild={(parent) => setModal({ mode: "create", parent })}
            onEdit={(item) => setModal({ mode: "edit", item })}
            onStatus={setStatus} onMove={moveItem} />
        )}
        {view === "board" && (
          <BoardView items={visibleItems} users={users}
            filterUser={assigneeFilter} onFilterUser={setAssigneeFilter}
            onStatus={setStatus} onEdit={(item) => setModal({ mode: "edit", item })} />
        )}
        {view === "alerts" && (
          <AlertsView items={items} users={users} currentUser={currentUser} onEdit={(item) => setModal({ mode: "edit", item })} />
        )}
        {view === "users" && currentUser.role === "admin" && (
          <UsersView users={users} currentUser={currentUser} onCreate={createUser} onDelete={deleteUser} />
        )}
      </main>

      {modal && (
        <ItemModal mode={modal.mode} item={modal.item} parent={modal.parent} users={users}
          onSave={saveItem} onClose={() => setModal(null)} onDelete={deleteItem} />
      )}
      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<AriztiaApp />);
