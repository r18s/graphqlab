CREATE TABLE users (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  username   text NOT NULL UNIQUE,
  email      text NOT NULL UNIQUE,
  bio        text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id    integer NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id    integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX posts_user_id_idx ON posts (user_id);
CREATE INDEX comments_post_id_idx ON comments (post_id);
CREATE INDEX comments_user_id_idx ON comments (user_id);
