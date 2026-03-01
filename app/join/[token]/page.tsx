import { JoinInviteForm } from "@/components/join-invite-form";

export default async function JoinByTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinInviteForm token={token} />;
}
