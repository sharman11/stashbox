// Supabase Edge Function: send-reminders
// Triggered daily via pg_cron or external cron.
// Checks each active moneybox user — if they didn't fill a cell today, sends a push.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: string;
  data?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split('T')[0];

    // Get all active moneyboxes with their users
    const { data: activeBoxes, error: boxError } = await supabase
      .from('moneyboxes')
      .select('id, user_id, name')
      .eq('status', 'active');

    if (boxError || !activeBoxes) {
      return new Response(JSON.stringify({ error: boxError?.message }), { status: 500 });
    }

    // For each box, check if any cell was filled today
    const usersToPush: Map<string, { boxName: string; boxId: string }> = new Map();

    for (const box of activeBoxes) {
      const { count } = await supabase
        .from('cells')
        .select('*', { count: 'exact', head: true })
        .eq('moneybox_id', box.id)
        .eq('is_filled', true)
        .gte('filled_at', `${today}T00:00:00Z`)
        .lt('filled_at', `${today}T23:59:59Z`);

      if (count === 0) {
        // Only keep first box per user (don't spam)
        if (!usersToPush.has(box.user_id)) {
          usersToPush.set(box.user_id, { boxName: box.name, boxId: box.id });
        }
      }
    }

    if (usersToPush.size === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'All users saved today' }));
    }

    // Get push tokens for these users
    const userIds = [...usersToPush.keys()];
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No push tokens found' }));
    }

    const nudges = [
      'Time to save! Tap a cell and keep your streak alive.',
      'Your moneybox misses you. Drop a coin in today!',
      'Small amounts become big savings. Open Stashbox!',
      'Don\'t break your streak! Save something today.',
      'Your future self will thank you. Tap to save!',
    ];

    const messages: PushMessage[] = tokens.map((t) => {
      const info = usersToPush.get(t.user_id)!;
      const nudge = nudges[Math.floor(Math.random() * nudges.length)];
      return {
        to: t.token,
        title: `💰 ${info.boxName}`,
        body: nudge,
        sound: 'default' as const,
        channelId: 'reminders',
        data: { moneyboxId: info.boxId },
      };
    });

    // Send via Expo Push API (batches of 100)
    let totalSent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) totalSent += batch.length;
    }

    return new Response(
      JSON.stringify({ sent: totalSent, skipped: activeBoxes.length - usersToPush.size })
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
