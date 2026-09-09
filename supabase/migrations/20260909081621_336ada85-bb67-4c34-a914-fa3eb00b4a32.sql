-- 1. Developer invitation proposals -------------------------------------------------
CREATE TABLE public.developer_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  proposed_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT developer_invites_status_check CHECK (status IN ('pending','approved','rejected','expired'))
);

CREATE UNIQUE INDEX developer_invites_one_pending_per_email
  ON public.developer_invites (lower(email)) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.developer_invites TO authenticated;
GRANT ALL ON public.developer_invites TO service_role;
ALTER TABLE public.developer_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers read developer_invites" ON public.developer_invites
  FOR SELECT TO authenticated USING (public.is_developer(auth.uid()));
CREATE POLICY "Developers create developer_invites" ON public.developer_invites
  FOR INSERT TO authenticated WITH CHECK (public.is_developer(auth.uid()) AND proposed_by = auth.uid());
CREATE POLICY "Developers update developer_invites" ON public.developer_invites
  FOR UPDATE TO authenticated USING (public.is_developer(auth.uid())) WITH CHECK (public.is_developer(auth.uid()));

CREATE TRIGGER update_developer_invites_updated_at
  BEFORE UPDATE ON public.developer_invites
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Approvals ----------------------------------------------------------------------
CREATE TABLE public.developer_invite_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.developer_invites(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_id, approver_id)
);

GRANT SELECT, INSERT ON public.developer_invite_approvals TO authenticated;
GRANT ALL ON public.developer_invite_approvals TO service_role;
ALTER TABLE public.developer_invite_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers read invite approvals" ON public.developer_invite_approvals
  FOR SELECT TO authenticated USING (public.is_developer(auth.uid()));
CREATE POLICY "Developers approve invites" ON public.developer_invite_approvals
  FOR INSERT TO authenticated WITH CHECK (public.is_developer(auth.uid()) AND approver_id = auth.uid());

-- 3. Atomic finalisation check ------------------------------------------------------
-- Returns true exactly once: when every current developer has approved and the
-- invite flips from pending to approved inside the same locked transaction.
CREATE OR REPLACE FUNCTION public.claim_developer_invite(_invite_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv public.developer_invites;
  _devs int;
  _approvals int;
BEGIN
  IF NOT public.is_developer(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _inv FROM public.developer_invites WHERE id = _invite_id FOR UPDATE;
  IF _inv.id IS NULL OR _inv.status <> 'pending' THEN
    RETURN false;
  END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.developer_invites SET status = 'expired' WHERE id = _invite_id;
    RETURN false;
  END IF;

  SELECT count(DISTINCT user_id) INTO _devs FROM public.user_roles WHERE role = 'developer';
  SELECT count(*) INTO _approvals
    FROM public.developer_invite_approvals a
    JOIN public.user_roles ur ON ur.user_id = a.approver_id AND ur.role = 'developer'
    WHERE a.invite_id = _invite_id;

  IF _approvals >= _devs THEN
    UPDATE public.developer_invites SET status = 'approved' WHERE id = _invite_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_developer_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_developer_invite(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.claim_developer_invite(uuid) IS
  'Locks a pending developer invite and approves it only when every current developer has approved. Returns true once.';

-- 4. Harden user_roles ---------------------------------------------------------------
DROP POLICY "Owners insert user_roles" ON public.user_roles;
DROP POLICY "Owners update user_roles" ON public.user_roles;
DROP POLICY "Owners delete user_roles" ON public.user_roles;

CREATE POLICY "Owners insert user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()) AND (role <> 'developer' OR public.is_developer(auth.uid())));

CREATE POLICY "Owners update user_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid()) AND (role <> 'developer' OR user_id = auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()) AND (role <> 'developer' OR public.is_developer(auth.uid())));

CREATE POLICY "Owners delete user_roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_owner(auth.uid()) AND (role <> 'developer' OR user_id = auth.uid()));

-- Never leave the system without a developer.
CREATE OR REPLACE FUNCTION public.prevent_last_developer_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _remaining int;
BEGIN
  IF OLD.role <> 'developer' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.role = 'developer' AND NEW.user_id = OLD.user_id THEN
    RETURN NEW;
  END IF;
  SELECT count(DISTINCT user_id) INTO _remaining
    FROM public.user_roles WHERE role = 'developer' AND id <> OLD.id;
  IF _remaining = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last developer account.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER prevent_last_developer_removal_trg
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_developer_removal();
