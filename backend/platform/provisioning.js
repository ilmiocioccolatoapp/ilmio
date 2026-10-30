const { createClient } = require('@supabase/supabase-js');
const { Problem } = require('./http');

const unavailable = () => new Problem(503, 'Supabase admin provisioning is not configured.');
const providerFailure = () => new Problem(502, 'Supabase could not complete the invitation email.');

function createProvisioningClients(env = process.env) {
  let adminClient;
  let publicClient;
  const clientOptions = { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } };
  function admin() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw unavailable();
    if (!adminClient) adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, clientOptions);
    return adminClient;
  }
  function publicAuth() {
    if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw unavailable();
    if (!publicClient) publicClient = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, clientOptions);
    return publicClient.auth;
  }
  const redirectTo = () => env.ADMIN_INVITE_REDIRECT_URL || undefined;

  return {
    async findUserByEmail(email) {
      try {
        for (let page = 1; ; page += 1) {
          const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 1000 });
          if (error) throw error;
          const users = data?.users || [];
          const user = users.find(candidate => candidate.email?.toLowerCase() === email);
          if (user) return { id: user.id, email: user.email.toLowerCase(), emailConfirmed: Boolean(user.email_confirmed_at) };
          if (users.length < 1000) return null;
        }
      } catch (error) {
        if (error instanceof Problem) throw error;
        throw providerFailure();
      }
    },
    async inviteUserByEmail(email, name) {
      try {
        const options = { data: name ? { name } : {} };
        if (redirectTo()) options.redirectTo = redirectTo();
        const { data, error } = await admin().auth.admin.inviteUserByEmail(email, options);
        if (error || !data?.user?.id) throw error || new Error('Supabase returned no user.');
        return { id: data.user.id, email: (data.user.email || email).toLowerCase(), emailConfirmed: Boolean(data.user.email_confirmed_at) };
      } catch (error) {
        if (error instanceof Problem) throw error;
        throw providerFailure();
      }
    },
    async sendSetupEmail(email, emailConfirmed) {
      try {
        let result;
        if (!emailConfirmed) {
          const options = redirectTo() ? { emailRedirectTo: redirectTo() } : undefined;
          result = await publicAuth().resend({ type: 'signup', email, ...(options ? { options } : {}) });
        } else {
          const options = redirectTo() ? { redirectTo: redirectTo() } : undefined;
          result = await publicAuth().resetPasswordForEmail(email, options);
        }
        if (result?.error) throw result.error;
      } catch (error) {
        if (error instanceof Problem) throw error;
        throw providerFailure();
      }
    }
  };
}

module.exports = { createProvisioningClients };
