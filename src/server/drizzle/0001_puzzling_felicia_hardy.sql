ALTER TABLE "profiles" ADD COLUMN "first_name" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_name" text;
--> statement-breakpoint
UPDATE "profiles" AS p
SET
	"first_name" = u.raw_user_meta_data->>'first_name',
	"last_name" = u.raw_user_meta_data->>'last_name'
FROM auth.users AS u
WHERE p.id = u.id;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
	insert into profiles (id, first_name, last_name, display_name, avatar_url)
	values (
		new.id,
		new.raw_user_meta_data->>'first_name',
		new.raw_user_meta_data->>'last_name',
		coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
		new.raw_user_meta_data->>'avatar_url'
	)
	on conflict (id) do nothing;
	return new;
end
$function$;