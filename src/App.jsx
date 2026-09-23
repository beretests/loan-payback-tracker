import AuthPanel from "./components/AuthPanel";
import AuthenticatedApp from "./app/AuthenticatedApp";
import { useAuth } from "./features/auth/useAuth";

export default function App() {
  const auth = useAuth();

  if (!auth.user || auth.authView === "reset-password") {
    return (
      <AuthPanel
        authView={auth.authView}
        authEmail={auth.authEmail}
        authPassword={auth.authPassword}
        resetPassword={auth.resetPassword}
        resetPasswordConfirm={auth.resetPasswordConfirm}
        authError={auth.authError}
        authMessage={auth.authMessage}
        authBusy={auth.authBusy}
        onEmailChange={auth.setAuthEmail}
        onPasswordChange={auth.setAuthPassword}
        onResetPasswordChange={auth.setResetPassword}
        onResetPasswordConfirmChange={auth.setResetPasswordConfirm}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onRequestPasswordReset={auth.requestPasswordReset}
        onUpdatePassword={auth.updatePassword}
        onShowForgotPassword={auth.showForgotPassword}
        onBackToSignIn={auth.backToSignIn}
      />
    );
  }

  return <AuthenticatedApp user={auth.user} onSignOut={auth.signOut} />;
}
