// Servidor de Gestión de Proyectos Ariztía
// Node.js + Express + almacenamiento en archivo JSON + sesiones + alertas por correo
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { startAlertScheduler, sendAlertEmails } = require("./mailer");

// Carpeta de datos: configurable con DATA_DIR para despliegues en la nube con disco persistente
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DATA_FILE = path.join(DATA_DIR, "data.json");
const PORT = process.env.PORT || 3000;

// ---------- Base de datos (archivo JSON) ----------
let db;
function load() {
  if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    migrate();
  } else {
    // Primera ejecución: crear admin inicial
    db = {
      users: [
        {
          id: 1,
          name: "F. Veas",
          email: "fveas@ariztia.com",
          passwordHash: bcrypt.hashSync("Holywars91", 10),
          role: "admin",
        },
      ],
      items: [],
      nextUserId: 2,
      nextItemId: 1,
    };
    save();
    console.log("Base de datos creada. Admin inicial: fveas@ariztia.com");
    console.log("IMPORTANTE: cambia la contraseña del admin después del primer ingreso.");
  }
}
// Migraciones de datos:
// 1) responsable único (assigneeId) → lista de responsables (assigneeIds)
// 2) campo "order" para ordenar ítems entre sus pares
function migrate() {
  let changed = false;
  (db.items || []).forEach((it) => {
    if (!Array.isArray(it.assigneeIds)) {
      it.assigneeIds = it.assigneeId != null ? [it.assigneeId] : [];
      delete it.assigneeId;
      changed = true;
    }
  });
  const groups = {};
  (db.items || []).forEach((it) => { (groups[it.parentId ?? "root"] ||= []).push(it); });
  Object.values(groups).forEach((list) => {
    if (list.some((it) => typeof it.order !== "number")) {
      list.forEach((it, i) => { it.order = i; });
      changed = true;
    }
  });
  if (changed) {
    save();
    console.log("Migración de datos aplicada (responsables múltiples y orden de ítems).");
  }
}
function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
load();

// ---------- App ----------
const app = express();
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 12 }, // 12 horas
  })
);
app.use(express.static(path.join(__dirname, "public")));

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "No has iniciado sesión." });
  req.user = db.users.find((u) => u.id === req.session.userId);
  if (!req.user) return res.status(401).json({ error: "Sesión inválida." });
  next();
}
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Requiere rol de administrador." });
  next();
}

// ---------- Autenticación ----------
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  const u = db.users.find((x) => x.email.toLowerCase() === String(email || "").trim().toLowerCase());
  if (!u || !bcrypt.compareSync(String(password || ""), u.passwordHash)) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos." });
  }
  req.session.userId = u.id;
  res.json({ user: publicUser(u) });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  const u = db.users.find((x) => x.id === req.session.userId);
  res.json({ user: u ? publicUser(u) : null });
});

app.post("/api/change-password", requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  if (!bcrypt.compareSync(String(current || ""), req.user.passwordHash)) {
    return res.status(400).json({ error: "La contraseña actual no es correcta." });
  }
  if (!next || String(next).length < 6) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres." });
  }
  req.user.passwordHash = bcrypt.hashSync(String(next), 10);
  save();
  res.json({ ok: true });
});

// ---------- Estado compartido ----------
app.get("/api/state", requireAuth, (req, res) => {
  res.json({ users: db.users.map(publicUser), items: db.items });
});

// ---------- Ítems (historia > épica > tarea > subtarea) ----------
const HIERARCHY = { historia: "epica", epica: "tarea", tarea: "subtarea", subtarea: null };
const VALID_STATUS = ["todo", "doing", "done"];
const VALID_PRIORITY = ["alta", "media", "baja"];

function validateItem(body, isNew) {
  const errors = [];
  if (isNew && !HIERARCHY.hasOwnProperty(body.type)) errors.push("Tipo de ítem inválido.");
  if (!body.title || !String(body.title).trim()) errors.push("El título es obligatorio.");
  if (body.status && !VALID_STATUS.includes(body.status)) errors.push("Estado inválido.");
  if (body.priority && !VALID_PRIORITY.includes(body.priority)) errors.push("Prioridad inválida.");
  if (body.startDate && body.endDate && body.endDate < body.startDate)
    errors.push("La fecha final no puede ser anterior a la fecha de inicio.");
  return errors;
}

// Normaliza una lista de responsables: números únicos que correspondan a usuarios existentes.
// Acepta también el formato antiguo (assigneeId único) por compatibilidad.
function cleanAssigneeIds(body) {
  let raw;
  if (Array.isArray(body.assigneeIds)) raw = body.assigneeIds;
  else if (body.assigneeId !== undefined) raw = body.assigneeId != null ? [body.assigneeId] : [];
  else return undefined; // no se envió el campo: no modificar
  const ids = [...new Set(raw.map(Number).filter((n) => Number.isFinite(n)))];
  return ids.filter((n) => db.users.some((u) => u.id === n));
}

app.post("/api/items", requireAuth, (req, res) => {
  const b = req.body || {};
  const errors = validateItem(b, true);
  // Validar jerarquía: el padre debe existir y su tipo debe corresponder
  let parentId = b.parentId ?? null;
  if (parentId != null) {
    const parent = db.items.find((i) => i.id === parentId);
    if (!parent) errors.push("El ítem padre no existe.");
    else if (HIERARCHY[parent.type] !== b.type)
      errors.push(`Dentro de una ${parent.type} solo se puede crear una ${HIERARCHY[parent.type]}.`);
  } else if (b.type !== "historia") {
    errors.push("En el nivel superior solo se pueden crear historias.");
  }
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });

  const siblings = db.items.filter((i) => (i.parentId ?? null) === parentId);
  const item = {
    id: db.nextItemId,
    key: "ARZ-" + db.nextItemId,
    type: b.type,
    parentId,
    title: String(b.title).trim(),
    desc: b.desc || "",
    status: b.status || "todo",
    assigneeIds: cleanAssigneeIds(b) || [],
    priority: b.priority || "media",
    startDate: b.startDate || "",
    endDate: b.endDate || "",
    order: siblings.length ? Math.max(...siblings.map((s) => s.order ?? 0)) + 1 : 0,
  };
  db.nextItemId++;
  db.items.push(item);
  save();
  res.json({ item });
});

app.put("/api/items/:id", requireAuth, (req, res) => {
  const item = db.items.find((i) => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Ítem no encontrado." });
  const b = req.body || {};
  const errors = validateItem({ ...item, ...b }, false);
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });
  ["title", "desc", "status", "priority", "startDate", "endDate"].forEach((k) => {
    if (b[k] !== undefined) item[k] = k === "title" ? String(b[k]).trim() : b[k];
  });
  const ids = cleanAssigneeIds(b);
  if (ids !== undefined) item.assigneeIds = ids;
  save();
  res.json({ item });
});

app.delete("/api/items/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!db.items.some((i) => i.id === id)) return res.status(404).json({ error: "Ítem no encontrado." });
  // Eliminar en cascada (hijos, nietos, etc.)
  const toRemove = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const it of db.items) {
      if (it.parentId != null && toRemove.has(it.parentId) && !toRemove.has(it.id)) {
        toRemove.add(it.id);
        grew = true;
      }
    }
  }
  db.items = db.items.filter((i) => !toRemove.has(i.id));
  save();
  res.json({ removed: [...toRemove] });
});

// Reordenar un ítem entre sus pares (mismo padre). Solo admin.
app.put("/api/items/:id/move", requireAuth, requireAdmin, (req, res) => {
  const item = db.items.find((i) => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Ítem no encontrado." });
  const dir = (req.body || {}).direction;
  if (dir !== "up" && dir !== "down") return res.status(400).json({ error: "Dirección inválida." });
  // Hermanos (mismo padre) ordenados por su campo order
  const siblings = db.items
    .filter((i) => (i.parentId ?? null) === (item.parentId ?? null))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const idx = siblings.findIndex((i) => i.id === item.id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return res.json({ ok: true }); // ya está en el extremo
  // Intercambiar posiciones
  siblings.splice(idx, 1);
  siblings.splice(swapIdx, 0, item);
  siblings.forEach((s, i) => { s.order = i; });
  save();
  res.json({ ok: true });
});

// ---------- Usuarios (solo admin) ----------
app.post("/api/users", requireAuth, requireAdmin, (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: "Completa nombre, correo y contraseña." });
  if (String(password).length < 6)
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  if (db.users.some((u) => u.email.toLowerCase() === String(email).trim().toLowerCase()))
    return res.status(400).json({ error: "Ya existe un usuario con ese correo." });
  const user = {
    id: db.nextUserId,
    name: String(name).trim(),
    email: String(email).trim(),
    passwordHash: bcrypt.hashSync(String(password), 10),
    role: role === "admin" ? "admin" : "miembro",
  };
  db.nextUserId++;
  db.users.push(user);
  save();
  res.json({ user: publicUser(user) });
});

app.delete("/api/users/:id", requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "No puedes eliminar tu propia cuenta." });
  const before = db.users.length;
  db.users = db.users.filter((u) => u.id !== id);
  if (db.users.length === before) return res.status(404).json({ error: "Usuario no encontrado." });
  // Quitar al usuario eliminado de los responsables de todos los ítems
  db.items.forEach((it) => {
    if (Array.isArray(it.assigneeIds)) it.assigneeIds = it.assigneeIds.filter((x) => x !== id);
  });
  save();
  res.json({ ok: true });
});

// ---------- Alertas por correo ----------
// Envío manual inmediato (solo admin). El envío automático diario lo hace el programador en mailer.js
app.post("/api/alerts/send", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await sendAlertEmails(db);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "No se pudieron enviar los correos: " + e.message });
  }
});

// SPA fallback
app.use((req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => {
  console.log(`\nGestión de Proyectos Ariztía corriendo en http://localhost:${PORT}`);
  console.log("Para que otras personas de tu red entren, comparte http://TU-IP-LOCAL:" + PORT + "\n");
  startAlertScheduler(() => db);
});
