import { supabase, Task } from './supabase';

export async function fetchTasks(ownerName: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('owner_name', ownerName)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTask(
  ownerName: string,
  task: Omit<Task, 'id' | 'owner_name' | 'created_at' | 'updated_at'>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ ...task, owner_name: ownerName }])
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Task creation returned no data');
  return data;
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, 'id' | 'owner_name' | 'created_at' | 'updated_at'>>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Task update returned no data');
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export function advanceDate(dateString: string, recurrence: 'none' | 'daily' | 'weekly'): string {
  if (!dateString || recurrence === 'none') return dateString;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  if (recurrence === 'daily') date.setDate(date.getDate() + 1);
  if (recurrence === 'weekly') date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}
