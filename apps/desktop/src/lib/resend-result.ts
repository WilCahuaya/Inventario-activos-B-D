export interface ResendInvitePayload {
  error?: string;
  message?: string | null;
  warning?: string | null;
  invited?: boolean;
  success?: boolean;
}

export function finalizeResendInviteResult(
  result: ResendInvitePayload | null | undefined,
): { error?: string; message?: string } {
  if (!result) {
    return { error: "No hubo respuesta al reenviar la invitación." };
  }

  if (result.error) {
    return { error: result.error };
  }

  if (result.warning && result.invited !== true) {
    return { error: result.warning };
  }

  const message = result.message ?? result.warning;
  if (message) {
    return { message };
  }

  if (result.invited === true) {
    return {
      message:
        "Correo de acceso reenviado. Podrá ingresar con Google o el enlace del correo.",
    };
  }

  return { error: "No se pudo enviar el correo de invitación." };
}
