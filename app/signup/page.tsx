import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <SignupForm />
      <p className="text-center text-sm text-slate-600">
        Akkauntingiz bormi? <Link href="/login" className="underline">Kirish</Link>
      </p>
    </div>
  );
}
