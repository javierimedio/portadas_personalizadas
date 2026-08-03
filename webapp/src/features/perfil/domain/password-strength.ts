// Réplica exacta de checkPwdStrength() en index.html (~5883-5904): 5 niveles
// según longitud/mayúsculas+minúsculas/número/carácter especial.
export type PasswordStrengthLevel = { pct: string; color: string; text: string };

const MUY_DEBIL: PasswordStrengthLevel = { pct: "20%", color: "var(--c-red)", text: "Muy débil" };

const LEVELS: PasswordStrengthLevel[] = [
  MUY_DEBIL,
  { pct: "40%", color: "#f59e0b", text: "Débil" },
  { pct: "60%", color: "#eab308", text: "Aceptable" },
  { pct: "80%", color: "var(--c-amber)", text: "Fuerte" },
  { pct: "100%", color: "var(--c-green)", text: "Muy fuerte" },
];

export function passwordStrength(pwd: string): PasswordStrengthLevel {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return LEVELS[Math.max(0, score - 1)] ?? MUY_DEBIL;
}
