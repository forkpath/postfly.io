-- Better Auth 1.6.26 adds persisted two-factor lockout state.
-- Both columns are nullable so this expand migration remains compatible with
-- the previous application image during rollout and rollback.
ALTER TABLE public."twoFactor"
  ADD COLUMN "failed_verification_count" INTEGER DEFAULT 0,
  ADD COLUMN "locked_until" TIMESTAMP(3);
