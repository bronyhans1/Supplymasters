import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  formControlClass,
  formHelpClass,
  formLabelClass,
} from "@/components/ui/form-styles";

export function FormField({
  label,
  htmlFor,
  helpText,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  helpText?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("block space-y-1.5", className)}>
      <span className={formLabelClass}>{label}</span>
      {children}
      {helpText ? <span className={formHelpClass}>{helpText}</span> : null}
    </label>
  );
}

/** Convenience labeled text input using shared control styles. */
export function FormTextInput({
  label,
  helpText,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helpText?: string;
}) {
  return (
    <FormField label={label} htmlFor={props.id} helpText={helpText}>
      <input {...props} className={cn(formControlClass, className)} />
    </FormField>
  );
}
