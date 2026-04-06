from config import settings
from supabase import Client, create_client

# Standard client — uses the publishable key, respects RLS.
# Pair with a user's JWT via the Authorization header for user-scoped operations.
supabase: Client = create_client(
    settings.supabase_url, settings.supabase_publishable_key
)

# Admin client — uses the secret key, bypasses RLS.
# Use only for server-side operations like auto-assigning users to teams.
supabase_admin: Client = create_client(
    settings.supabase_url, settings.supabase_secret_key
)
