-- public.docstore definition

-- Drop table

-- DROP TABLE public.docstore;

CREATE TABLE public.docstore (
	id serial4 NOT NULL,
	"key" text NOT NULL,
	value jsonb NULL,
	CONSTRAINT docstore_key_key UNIQUE (key),
	CONSTRAINT documents_pkey PRIMARY KEY (id)
);


-- public.files definition

-- Drop table

-- DROP TABLE public.files;

CREATE TABLE public.files (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	filename text NOT NULL,
	blob_storage_path text NOT NULL,
	vector_storage_path text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	deleted_at timestamptz NULL,
	mime_type varchar(255) NULL,
	"size" int8 NULL,
	user_id uuid NULL,
	CONSTRAINT files_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_files_created_at ON public.files USING btree (created_at);


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	email varchar(255) NOT NULL,
	"password" text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	deleted_at timestamptz NULL,
	is_admin boolean DEFAULT false NOT NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_users_email ON public.users USING btree (email);

ALTER TABLE public.files
	ADD CONSTRAINT files_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- public.groups definition

-- Drop table

-- DROP TABLE public.groups;

CREATE TABLE public.groups (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT groups_name_key UNIQUE ("name"),
	CONSTRAINT groups_pkey PRIMARY KEY (id)
);


-- public.user_groups definition

-- Drop table

-- DROP TABLE public.user_groups;

CREATE TABLE public.user_groups (
	user_id uuid NOT NULL,
	group_id uuid NOT NULL,
	CONSTRAINT user_groups_pkey PRIMARY KEY (user_id, group_id),
	CONSTRAINT user_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
	CONSTRAINT user_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE
);


-- public.file_groups definition

-- Drop table

-- DROP TABLE public.file_groups;

CREATE TABLE public.file_groups (
	file_id uuid NOT NULL,
	group_id uuid NOT NULL,
	CONSTRAINT file_groups_pkey PRIMARY KEY (file_id, group_id),
	CONSTRAINT file_groups_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE,
	CONSTRAINT file_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE
);


-- public.sessions definition

-- Drop table

-- DROP TABLE public.sessions;

CREATE TABLE public.sessions (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	"token" text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	expires_at timestamptz NOT NULL,
	revoked_at timestamptz NULL,
	CONSTRAINT sessions_pkey PRIMARY KEY (id),
	CONSTRAINT sessions_token_key UNIQUE (token),
	CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);
CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


-- public.threads definition

-- Drop table

-- DROP TABLE public.threads;

CREATE TABLE public.threads (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	"name" text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	deleted_at timestamptz NULL,
	CONSTRAINT threads_pkey PRIMARY KEY (id),
	CONSTRAINT threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_threads_updated_at ON public.threads USING btree (updated_at DESC);
CREATE INDEX idx_threads_user_id ON public.threads USING btree (user_id);


-- public.messages definition

-- Drop table

-- DROP TABLE public.messages;

CREATE TABLE public.messages (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	thread_id uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	intermediate_steps jsonb NULL,
	CONSTRAINT messages_pkey PRIMARY KEY (id),
	CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_thread_id_created_at ON public.messages USING btree (thread_id, created_at DESC);


-- public.feedbacks definition

-- Drop table

-- DROP TABLE public.feedbacks;

CREATE TABLE public.feedbacks (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	message_id uuid NOT NULL,
	rating varchar(20) NOT NULL,
	"comment" text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	deleted_at timestamptz NULL,
	CONSTRAINT feedbacks_pkey PRIMARY KEY (id),
	CONSTRAINT feedbacks_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE
);
CREATE INDEX idx_feedbacks_message_id ON public.feedbacks USING btree (message_id);
