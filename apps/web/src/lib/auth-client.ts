/**
 * Better Auth client stub — platform account auth is disabled.
 * Partner / admin auth does not use this module.
 */

function disabled(): never {
  throw new Error('Platform account auth is disabled');
}

export const authClient = {
  signIn: { email: async () => disabled() },
  signUp: { email: async () => disabled() },
  signOut: async () => disabled(),
  useSession: () => ({ data: null, isPending: false, error: null }),
};

export const { signIn, signUp, signOut, useSession } = authClient;
