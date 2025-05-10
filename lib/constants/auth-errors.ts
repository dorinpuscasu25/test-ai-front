export type AuthError = {
  code: string;
  message: string;
};

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  form_identifier_exists: "An account with this email already exists. Sign in instead.",
  form_identifier_not_found: "No account found with this email. Sign up instead.",
  form_param_format_invalid: "Please enter a valid email address.",
  network_error: "Unable to connect. Please check your internet connection.",
  rate_limit_exceeded: "Too many attempts. Please try again later.",
  oauth_account_not_found: "No account found with this email. Sign up instead.",
  default: "Something went wrong. Please try again.",
};
