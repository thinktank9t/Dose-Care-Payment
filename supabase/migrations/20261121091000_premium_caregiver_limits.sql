-- premium_caregiver_limits
--
-- Caregiver slot limits tied to entitlement state, plus the restrictive
-- policies that pause a caregiver's access when the patient drops to Free.
-- Captured from Dev (applied there as 20261121091000, never committed).
-- Requires premium_entitlements. Idempotent.

CREATE OR REPLACE FUNCTION public.caregiver_access_paused(p_patient_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    -- Cheapest test first: no session means no recognised caregiver, so the
    -- whole predicate short-circuits for ordinary traffic.
    auth.uid() is not null
    and public.entitlement_state(p_patient_id) = 'free'
    and exists (
      select 1
      from public.caregiver_links cl
      where cl.patient_id = p_patient_id
        and cl.caregiver_auth_id = auth.uid()
        and cl.status in ('active', 'requested')
    )
    -- Someone caring for themselves is never locked out of their own data
    -- (FR-00, FR-01). The app does not create such a link; this is belt and
    -- braces.
    and not exists (
      select 1
      from public.caregiver_links cl
      where cl.patient_id = p_patient_id
        and cl.caregiver_auth_id = auth.uid()
        and cl.patient_auth_id = auth.uid()
    );
$function$;

CREATE OR REPLACE FUNCTION public.guard_caregiver_slot_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_state text;
  v_used integer;
begin
  v_state := public.entitlement_state(new.patient_id);

  -- FR-02 / section 3: a caregiver is not a Free capability.
  if v_state = 'free' then
    raise exception
      'Adding a caregiver needs Dose Care Premium'
      using errcode = 'insufficient_privilege';
  end if;

  -- Occupied slots. An expired, never-claimed invite does not hold the slot.
  select count(*)
  into v_used
  from public.caregiver_links
  where patient_id = new.patient_id
    and (
      status in ('requested', 'active')
      or (status = 'pending' and (expires_at is null or expires_at > now()))
    );

  -- FR-12, FR-13, A1: one slot in every paying state.
  if v_used >= 1 then
    raise exception
      'You can have only one caregiver'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_caregiver_slot_revoke()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_state text;
begin
  -- Only a transition into 'revoked' is interesting.
  if new.status <> 'revoked' or old.status = 'revoked' then
    return new;
  end if;

  -- CC-11: the caregiver can always stop caring, whatever the patient's
  -- state. caregiver_leave_link() runs as definer but auth.uid() is still
  -- the caregiver, which is what distinguishes the two sides here.
  if auth.uid() is not null and auth.uid() = new.caregiver_auth_id then
    return new;
  end if;

  v_state := public.entitlement_state(new.patient_id);

  -- FR-14: during the trial the patient is locked in. The bottom sheet
  -- (FR-15) is what makes this fair, so it must be shown before the add.
  -- Q-06 / CC-09: a code nobody claimed is not "the caregiver you added",
  -- so cancelling 'pending' or 'requested' stays allowed.
  -- Q-05: once Free, cleanup is allowed again.
  if v_state = 'trial' and old.status = 'active' then
    raise exception
      'During your trial this caregiver cannot be removed'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$function$;


drop trigger if exists caregiver_links_guard_slot on public.caregiver_links;
CREATE TRIGGER caregiver_links_guard_slot BEFORE INSERT ON public.caregiver_links FOR EACH ROW EXECUTE FUNCTION guard_caregiver_slot_insert();

drop trigger if exists caregiver_links_guard_revoke on public.caregiver_links;
CREATE TRIGGER caregiver_links_guard_revoke BEFORE UPDATE ON public.caregiver_links FOR EACH ROW EXECUTE FUNCTION guard_caregiver_slot_revoke();

create unique index if not exists caregiver_links_one_slot_per_patient
  on public.caregiver_links using btree (patient_id)
  where (status = any (array['requested'::text, 'active'::text]));

drop policy if exists medicines_block_paused_caregiver on public.medicines;
create policy medicines_block_paused_caregiver on public.medicines
  as restrictive for all to public
  using (not public.caregiver_access_paused(patient_id));

drop policy if exists dose_schedules_block_paused_caregiver on public.dose_schedules;
create policy dose_schedules_block_paused_caregiver on public.dose_schedules
  as restrictive for all to public
  using (not public.caregiver_access_paused(patient_id));

drop policy if exists dose_logs_block_paused_caregiver on public.dose_logs;
create policy dose_logs_block_paused_caregiver on public.dose_logs
  as restrictive for all to public
  using (not public.caregiver_access_paused(patient_id));

grant execute on function public.caregiver_access_paused(uuid) to anon, authenticated;
