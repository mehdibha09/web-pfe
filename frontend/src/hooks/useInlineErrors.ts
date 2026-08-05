import { useCallback, useState } from 'react';

/**
 * Gestion d'erreurs de validation inline pour formulaire MUI.
 * Les erreurs sont rendues sous les champs (helperText) au lieu d'un toast.
 */
export function useInlineErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldError = useCallback((field: string, message?: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }, []);

  const clearErrors = useCallback(() => setErrors({}), []);

  const clearFieldError = useCallback(
    (field: string) => setFieldError(field, undefined),
    [setFieldError],
  );

  const hasErrors = useCallback(() => Object.keys(errors).length > 0, [errors]);

  /** Redirige une erreur serveur vers le champ adéquat quand possible. */
  const setServerError = useCallback((error: unknown, field: string, fallback?: string) => {
    const msg =
      (error as { message?: string })?.message ||
      (error as { data?: { message?: string } })?.data?.message ||
      (error as { error?: string })?.error ||
      fallback ||
      'Une erreur est survenue';
    setFieldError(field, msg);
  }, [setFieldError]);

  return {
    errors,
    setFieldError,
    clearFieldError,
    clearErrors,
    hasErrors,
    setServerError,
    fieldProps: (field: string) => ({
      error: Boolean(errors[field]),
      helperText: errors[field] || undefined,
    }),
  };
}