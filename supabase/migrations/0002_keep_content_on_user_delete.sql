-- Deleting a user (admin page) must not be blocked by, or wipe out, the
-- content they created. Keep ideas/comments/projects, just orphan the
-- author. The UI already tolerates a null author.

alter table ideas
  drop constraint ideas_submitted_by_fkey,
  add constraint ideas_submitted_by_fkey
    foreign key (submitted_by) references profiles(id) on delete set null;

alter table comments
  drop constraint comments_author_id_fkey,
  add constraint comments_author_id_fkey
    foreign key (author_id) references profiles(id) on delete set null;

alter table projects
  drop constraint projects_created_by_fkey,
  add constraint projects_created_by_fkey
    foreign key (created_by) references profiles(id) on delete set null;
