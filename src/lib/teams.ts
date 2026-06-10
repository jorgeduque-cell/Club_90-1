// ============================================
// CLUB PYP — Teams & Players API (Supabase)
// ============================================

import { supabase } from './supabase';

// ─── Types ──────────────────────────────────

export interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  league: string;
  color: string;
  created_at: string;
  players?: Player[];
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  age: number | null;
  photo_url: string | null;
  is_captain: boolean;
  created_at: string;
}

export interface CreateTeamInput {
  name: string;
  short_name: string;
  logo_url?: string;
  league?: string;
  color?: string;
}

export interface CreatePlayerInput {
  team_id: string;
  name: string;
  age?: number;
  photo_url?: string;
  is_captain?: boolean;
}

// ─── Teams CRUD ─────────────────────────────

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*, players(count)')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Team[];
}

export async function getTeamWithPlayers(teamId: string): Promise<Team & { players: Player[] }> {
  const { data, error } = await supabase
    .from('teams')
    .select('*, players(*)')
    .eq('id', teamId)
    .single();

  if (error) throw error;
  return data as Team & { players: Player[] };
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      name: input.name,
      short_name: input.short_name,
      logo_url: input.logo_url || null,
      league: input.league || 'Torneo Local',
      color: input.color || '#d72a22',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Team;
}

export async function updateTeam(id: string, updates: Partial<CreateTeamInput>): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Team;
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Players CRUD ───────────────────────────

export async function addPlayer(input: CreatePlayerInput): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .insert({
      team_id: input.team_id,
      name: input.name,
      age: input.age || null,
      photo_url: input.photo_url || null,
      is_captain: input.is_captain || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Player;
}

export async function updatePlayer(id: string, updates: Partial<Omit<CreatePlayerInput, 'team_id'>>): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Player;
}

export async function removePlayer(id: string): Promise<void> {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
