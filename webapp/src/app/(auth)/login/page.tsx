import { LoginForm } from "@/features/auth/ui/login-form";

// Réplica visual de #auth-screen (index.html ~40-45, ~455-496): foto de
// fondo con degradado oscuro, logo GOR Factory arriba, tarjeta blanca con
// el formulario, logos de marca (invertidos a blanco) debajo.
export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,.62), rgba(0,0,0,.72)), url('/images/login-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/GORFACTORY_LOGO_BLANCO.png" alt="GOR Factory" className="h-16 md:h-24" />

      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <LoginForm />
      </div>

      <div className="flex items-center gap-8 opacity-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo_Roly_2025.svg" alt="Roly" className="h-4 brightness-0 invert" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/Logo_WRK_color.svg" alt="Roly WRK" className="h-4 brightness-0 invert" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-stm-small.svg" alt="Stamina" className="h-4 brightness-0 invert" />
      </div>
    </div>
  );
}
