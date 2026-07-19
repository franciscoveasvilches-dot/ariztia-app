// Alertas de vencimiento por correo (nodemailer + node-cron)
// Configura el SMTP en el archivo .env — ver .env.example
const nodemailer = require("nodemailer");
const cron = require("node-cron");

const DAY = 24 * 60 * 60 * 1000;

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function makeTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// Ítems no terminados que vencieron o vencen en los próximos N días (por defecto 3)
function dueItems(db) {
  const horizon = Number(process.env.ALERT_DAYS || 3);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return db.items.filter((it) => {
    if (it.status === "done" || !it.endDate) return false;
    const end = new Date(it.endDate + "T00:00:00");
    const diff = Math.round((end - today) / DAY);
    return diff <= horizon;
  });
}

function daysLabel(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(endDate + "T00:00:00") - today) / DAY);
  if (diff < 0) return `VENCIDA hace ${Math.abs(diff)} día${Math.abs(diff) === 1 ? "" : "s"}`;
  if (diff === 0) return "vence HOY";
  return `vence en ${diff} día${diff === 1 ? "" : "s"}`;
}

const TYPE_LABEL = { historia: "Historia", epica: "Épica", tarea: "Tarea", subtarea: "Subtarea" };

async function sendAlertEmails(db) {
  const items = dueItems(db);
  if (items.length === 0) return { sent: 0, message: "No hay tareas vencidas ni próximas a vencer." };

  if (!smtpConfigured()) {
    console.log("[alertas] SMTP no configurado (.env). Correos que se habrían enviado:");
    items.forEach((it) => {
      const u = db.users.find((x) => x.id === it.assigneeId);
      console.log(`  → ${u ? u.email : "sin responsable"}: ${it.key} "${it.title}" ${daysLabel(it.endDate)}`);
    });
    return { sent: 0, message: "SMTP no configurado. Revisa el archivo .env (ver .env.example). Los correos pendientes se listaron en la consola del servidor." };
  }

  // Agrupar por responsable: un solo correo por persona
  const byUser = {};
  for (const it of items) {
    if (!it.assigneeId) continue;
    (byUser[it.assigneeId] ||= []).push(it);
  }

  const transport = makeTransport();
  const from = process.env.MAIL_FROM || `"Proyectos Ariztía" <${process.env.SMTP_USER}>`;
  let sent = 0;

  for (const [userId, list] of Object.entries(byUser)) {
    const user = db.users.find((u) => u.id === Number(userId));
    if (!user) continue;
    const lines = list
      .map((it) => `• [${TYPE_LABEL[it.type]}] ${it.key} — ${it.title} (${daysLabel(it.endDate)}, fecha final: ${it.endDate})`)
      .join("\n");
    await transport.sendMail({
      from,
      to: user.email,
      subject: `[Ariztía] Tienes ${list.length} tarea${list.length === 1 ? "" : "s"} por vencer o vencida${list.length === 1 ? "" : "s"}`,
      text: `Hola ${user.name},\n\nEstas son tus tareas que requieren atención:\n\n${lines}\n\nPor favor revisa su avance en el sistema de gestión de proyectos.\n\nSaludos,\nGestión de Proyectos Ariztía`,
    });
    sent++;
  }
  console.log(`[alertas] ${sent} correo(s) de recordatorio enviados.`);
  return { sent, message: `Se enviaron ${sent} correo(s) de recordatorio.` };
}

// Revisión automática todos los días a las 08:00 (hora del servidor)
function startAlertScheduler(getDb) {
  const hour = process.env.ALERT_HOUR || "8";
  cron.schedule(`0 ${hour} * * *`, async () => {
    try {
      await sendAlertEmails(getDb());
    } catch (e) {
      console.error("[alertas] Error al enviar correos:", e.message);
    }
  });
  console.log(`Alertas automáticas programadas todos los días a las ${hour}:00 (${smtpConfigured() ? "SMTP configurado ✓" : "SMTP SIN configurar — ver .env.example"}).`);
}

module.exports = { startAlertScheduler, sendAlertEmails };
