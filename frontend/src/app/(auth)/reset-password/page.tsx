import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams?.token;

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            This reset link is invalid or incomplete. Please request a new password reset link.
          </AlertDescription>
        </Alert>
        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">
            Request a new link
          </Button>
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}