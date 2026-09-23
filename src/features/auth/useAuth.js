import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export function useAuth() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [authView, setAuthView] = useState(() =>
    window.location.pathname === "/reset-password"
      ? "reset-password"
      : "sign-in",
  );
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setAuthView("reset-password");
        setAuthError("");
        setAuthMessage("");
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setAuthError("");
    setAuthMessage("");
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signUp() {
    setAuthError("");
    setAuthMessage("");
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) setAuthError(error.message);
      else {
        setAuthMessage(
          "Sign-up successful. Check email if confirmation is enabled.",
        );
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function requestPasswordReset() {
    const email = authEmail.trim();
    setAuthError("");
    setAuthMessage("");
    if (!email) {
      setAuthError("Enter your email address.");
      return;
    }

    setAuthBusy(true);
    try {
      const redirectTo = new URL(
        "/reset-password",
        window.location.origin,
      ).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      setAuthMessage(
        "If an account exists for that email, a password reset link has been sent.",
      );
    } catch (error) {
      setAuthError(error.message ?? String(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function updatePassword() {
    setAuthError("");
    setAuthMessage("");
    if (resetPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setAuthError("Passwords do not match.");
      return;
    }

    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: resetPassword,
      });
      if (error) throw error;

      await supabase.auth.signOut();
      navigate("/", { replace: true });
      setResetPassword("");
      setResetPasswordConfirm("");
      setAuthView("sign-in");
      setAuthMessage("Password updated. Sign in with your new password.");
    } catch (error) {
      setAuthError(
        error.message === "Auth session missing!"
          ? "This reset link is invalid or has expired. Request a new one."
          : (error.message ?? String(error)),
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function backToSignIn() {
    if (authView === "reset-password") await supabase.auth.signOut();
    navigate("/", { replace: true });
    setResetPassword("");
    setResetPasswordConfirm("");
    setAuthView("sign-in");
    setAuthError("");
    setAuthMessage("");
  }

  function showForgotPassword() {
    setAuthView("forgot-password");
    setAuthError("");
    setAuthMessage("");
  }

  return {
    user: session?.user ?? null,
    authView,
    authEmail,
    authPassword,
    resetPassword,
    resetPasswordConfirm,
    authError,
    authMessage,
    authBusy,
    setAuthEmail,
    setAuthPassword,
    setResetPassword,
    setResetPasswordConfirm,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
    showForgotPassword,
    backToSignIn,
    signOut: () => supabase.auth.signOut(),
  };
}
