import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fetch data from the voice_files table
    const { data, error } = await supabase.from('voice_files').select('*');

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}