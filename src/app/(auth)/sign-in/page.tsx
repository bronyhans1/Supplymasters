import { SignInExperience } from "@/components/auth/SignInExperience";
import { SignInForm } from "@/components/auth/SignInForm";

const ERROR_MESSAGES: Record<string, string> = {
  inactive: "This account is disabled. Contact an administrator.",
  required: "Please sign in to continue.",
  password: "Your password has expired or must be changed before continuing.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const initialError = params.error ? ERROR_MESSAGES[params.error] ?? null : null;

  return (
    <SignInExperience>
      <SignInForm initialError={initialError} />
    </SignInExperience>
  );
}
