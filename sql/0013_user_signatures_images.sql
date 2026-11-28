-- Signatures can now also come from a photo: a cleaned ink mask stored as a
-- small PNG (data URL) in the same JSON column. Room for that, still bounded.
alter table public.user_signatures drop constraint if exists user_signatures_drawing_size;
alter table public.user_signatures
  add constraint user_signatures_drawing_size check (octet_length(drawing::text) <= 400000);
