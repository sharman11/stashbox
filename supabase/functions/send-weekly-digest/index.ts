// Supabase Edge Function: send-weekly-digest
// Triggered weekly via cron. Sends each user a summary of their week.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // Get all users with active boxes
    const { data: activeBoxes } = await supabase
      .from('moneyboxes')
      .select('user_id')
      .eq('status', 'active');

    const userIds = [...new Set((activeBoxes ?? []).map((b: { user_id: string }) => b.user_id))];
    if (userIds.length === 0) return new Response(JSON.stringify({ sent: 0 }));

    const messages: { to: string; title: string; body: string; sound: string; channelId: string }[] = [];

    for (const userId of userIds) {
      // Count cells filled this week
      const { count: cellsThisWeek } = await supabase
        .from('cells')
        .select('*', { count: 'exact', head: true })
        .eq('is_filled', true)
        .gte('filled_at', weekAgo)
        .in('moneybox_id', (
          await supabase.from('moneyboxes').select('id').eq('user_id', userId)
        ).data?.map((b: { id: string }) => b.id) ?? []);

      if (!cellsThisWeek) continue;

      // Get push token
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId);

      if (!tokens?.length) continue;

      const body = cellsThisWeek > 0
        ? `This week: ${cellsThisWeek} cell${cellsThisWeek > 1 ? 's' : ''} filled. Keep it going!`
        : `No saves this week. Open Stashbox and get back on track!`;

      for (const t of tokens) {
        messages.push({
          to: t.token,
          title: '📊 Your weekly digest',
          body,
          sound: 'default',
          channelId: 'reminders',
        });
      }
    }

    if (messages.length === 0) return new Response(JSON.stringify({ sent: 0 }));

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

    return new Response(JSON.stringify({ sent: totalSent }));
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
