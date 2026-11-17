"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { createManagedUser } from "@/lib/admin/users/actions";
import {
  generateTemporaryPassword,
  TEMP_PASSWORD_MIN_LENGTH,
} from "@/lib/admin/users/password";
import { PROVISIONABLE_ROLES } from "@/lib/auth/roles";
import { useCreateWritePending } from "@/components/navigation/create-success";
import { useNavigationProgress } from "@/components/navigation/NavigationProgress";
import { FormDialog } from "@/components/ui/FormDialog";
import {
  formControlClass,
  formHelpClass,
  formLabelClass,
  formSecondaryButtonClass,
} from "@/components/ui/form-styles";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils/cn";

type CreatedAccount = {
  fullName: string;
  email: string;
  temporaryPassword: string;
};

export function CreateUserForm() {
  const router = useRouter();
  const toast = useToast();
  const nav = useNavigationProgress();
  const { pending, runWrite } = useCreateWritePending();
  const passwordId = useId();
  const revealId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [created, setCreated] = useState<CreatedAccount | null>(null);
  const [copied, setCopied] = useState(false);

  function closeForm() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setPassword("");
    setVisible(false);
  }

  function onSubmit(formData: FormData) {
    void runWrite(async () => {
      setError(null);
      const temporaryPassword = String(formData.get("temporaryPassword") ?? "");
      const fullName = String(formData.get("fullName") ?? "");
      const email = String(formData.get("email") ?? "");

      const result = await createManagedUser({
        fullName,
        email,
        phone: String(formData.get("phone") ?? ""),
        role: String(formData.get("role") ?? "STAFF"),
        temporaryPassword,
      });

      if (!result.ok) {
        const failure = result.userId
          ? `${result.error.message} Open the user detail page to finish activation.`
          : result.error.message;
        setError(failure);
        toast.error(failure, "User not created");
        // Partial provisioning: recover on detail — never show password success UI.
        if (result.userId) {
          setOpen(false);
          setPassword("");
          setVisible(false);
          setCreated(null);
          nav.run(() => {
            router.push(`/app/admin/users/${result.userId}`);
          });
        }
        return;
      }

      // Reveal only in React state for this success dialog — never URL/storage/logs.
      setCreated({
        fullName,
        email,
        temporaryPassword,
      });
      setOpen(false);
      setPassword("");
      setVisible(false);
      setCopied(false);
      toast.success(result.message);
    });
  }

  async function copyPassword() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
      toast.success("Temporary password copied");
    } catch {
      toast.error("Could not copy password. Select and copy it manually.");
    }
  }

  function continueToUsers() {
    setCreated(null);
    setCopied(false);
    nav.run(() => {
      router.push("/app/admin/users");
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setPassword("");
          setVisible(false);
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-accent/90"
      >
        Add user
      </button>

      {open ? (
        <FormDialog
          title="Add user"
          description="Creates an Auth account, then assigns role and activates via the administrator session. Deliver the temporary password out-of-band."
          pending={pending}
          error={error}
          onClose={closeForm}
          formAction={onSubmit}
          footer={
            <>
              <LoadingButton
                type="submit"
                pending={pending}
                idleLabel="Create user"
                pendingLabel="Creating account…"
              />
              <button
                type="button"
                onClick={closeForm}
                disabled={pending}
                className={formSecondaryButtonClass}
              >
                Cancel
              </button>
            </>
          }
        >
          <Field label="Full name" name="fullName" required />
          <Field label="Email" name="email" type="email" required autoComplete="off" />
          <Field label="Phone number (optional)" name="phone" type="tel" />

          <label className="block space-y-1.5">
            <span className={formLabelClass}>Initial role</span>
            <select name="role" defaultValue="STAFF" required className={formControlClass}>
              {PROVISIONABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <label htmlFor={passwordId} className={formLabelClass}>
              Temporary password
            </label>
            <div className="relative">
              <input
                id={passwordId}
                name="temporaryPassword"
                type={visible ? "text" : "password"}
                required
                minLength={TEMP_PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={cn(formControlClass, "pr-12")}
              />
              <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
                aria-label={visible ? "Hide password" : "Show password"}
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setPassword(generateTemporaryPassword());
                  setVisible(true);
                }}
                className={cn(formSecondaryButtonClass, "w-full sm:w-auto")}
              >
                Generate password
              </button>
              <span className={formHelpClass}>
                At least {TEMP_PASSWORD_MIN_LENGTH} characters, with a letter and a
                number. Generated passwords are longer and stronger. Temporary
                passwords are never saved in application records.
              </span>
            </div>
          </div>
        </FormDialog>
      ) : null}

      {created ? (
        <FormDialog
          title="Account created"
          titleId={revealId}
          dismissible={false}
          size="lg"
          onClose={continueToUsers}
          footer={
            <button
              type="button"
              onClick={continueToUsers}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-paper hover:bg-accent/90"
            >
              Continue to Users
            </button>
          }
        >
          <p className="text-sm leading-6 text-muted">
            Share this temporary password securely with{" "}
            <span className="font-medium text-ink">{created.fullName}</span> (
            {created.email}). They must change it on first login. It is shown only
            here — copy it now before continuing.
          </p>

          <div className="space-y-2">
            <span className={formLabelClass}>Temporary password</span>
            <div className="flex flex-wrap items-stretch gap-2">
              <code
                className="min-w-0 flex-1 break-all rounded-lg border border-line bg-white px-3 py-2.5 font-mono text-sm text-ink"
                data-testid="temporary-password-reveal"
              >
                {created.temporaryPassword}
              </code>
              <button
                type="button"
                onClick={() => void copyPassword()}
                className={cn(formSecondaryButtonClass, "gap-1.5")}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy Password"}
              </button>
            </div>
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={formLabelClass}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className={formControlClass}
      />
    </label>
  );
}
