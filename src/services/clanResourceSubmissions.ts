
import { getSupabaseClient } from './supabaseClient';

export type ClanResourceSubmission = {
  id: string;
  member_name: string;
  resources: Record<string, number | string>;
  submitted_at: string;
};

async function getClient() {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase bağlantısı bulunamadı.');
  }
  return client;
}

export async function submitClanResources(
  memberName: string,
  resources: Record<string, number | string>,
): Promise<void> {
  const client = await getClient();

  const { error } = await client.rpc('submit_clan_resources', {
    p_member_name: memberName,
    p_resources: resources,
  });

  if (error) throw new Error(error.message);
}

export async function verifyClanResourceAdmin(
  password: string,
): Promise<boolean> {
  const client = await getClient();

  const { data, error } = await client.rpc(
    'verify_clan_resource_admin',
    { p_password: password },
  );

  if (error) throw new Error(error.message);
  return data === true;
}

export async function getClanResourceSubmissions(
  password: string,
): Promise<ClanResourceSubmission[]> {
  const client = await getClient();

  const { data, error } = await client.rpc(
    'get_clan_resource_submissions',
    { p_password: password },
  );

  if (error) throw new Error(error.message);
  return Array.isArray(data)
    ? (data as ClanResourceSubmission[])
    : [];
}

export async function deleteClanResourceSubmission(
  password: string,
  id: string,
): Promise<void> {
  const client = await getClient();

  const { error } = await client.rpc(
    'delete_clan_resource_submission',
    { p_password: password, p_id: id },
  );

  if (error) throw new Error(error.message);
}
