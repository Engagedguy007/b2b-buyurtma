import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <LoginForm />
      <div className="card text-sm text-slate-700">
        <p className="font-semibold">Demo loginlar</p>
        <p>outlet@demo.uz / Outlet123!</p>
        <p>manager@demo.uz / Manager123!</p>
        <p>courier@demo.uz / Courier123!</p>
      </div>
    </div>
  );
}
