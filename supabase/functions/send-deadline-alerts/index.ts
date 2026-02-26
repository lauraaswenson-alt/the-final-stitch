// Supabase Edge Function: send-deadline-alerts
// Runs daily via cron to check finishing order deadlines and send email alerts via Resend.
//
// Setup:
// 1. Set these secrets in Supabase Dashboard → Edge Functions → Secrets:
//    - RESEND_API_KEY: Your Resend API key
//    - SUPABASE_URL: Your Supabase project URL (auto-set)
//    - SUPABASE_SERVICE_ROLE_KEY: Your service role key (auto-set)
//
// 2. Deploy: supabase functions deploy send-deadline-alerts
//
// 3. Schedule via cron (Supabase Dashboard → Database → Extensions → pg_cron):
//    SELECT cron.schedule(
//      'send-deadline-alerts',
//      '0 9 * * *',  -- Every day at 9 AM UTC
//      $$SELECT net.http_post(
//        url := '<YOUR_SUPABASE_URL>/functions/v1/send-deadline-alerts',
//        headers := jsonb_build_object(
//          'Authorization', 'Bearer <YOUR_ANON_KEY>',
//          'Content-Type', 'application/json'
//        ),
//        body := '{}'::jsonb
//      );$$
//    );

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Use service role to bypass RLS — this function reads all users' orders
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface AlertOrder {
  id: string
  canvas_name: string
  finisher_name: string | null
  expected_return_date: string
  user_id: string
}

interface UserInfo {
  email: string
  first_name: string
  notification_prefs: { email_alerts: boolean }
}

Deno.serve(async (req) => {
  try {
    // Verify this is a POST request
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const today = new Date()
    const in7Days = new Date(today)
    in7Days.setDate(today.getDate() + 7)
    const in30Days = new Date(today)
    in30Days.setDate(today.getDate() + 30)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    const todayStr = formatDate(today)
    const in7Str = formatDate(in7Days)
    const in30Str = formatDate(in30Days)
    const yesterdayStr = formatDate(yesterday)

    // Fetch orders that need alerts:
    // 1. 30 days before expected return
    // 2. 7 days before expected return
    // 3. 1 day after expected return (overdue)
    // Only orders with alert_enabled = true and status NOT picked_up/paid_in_full
    const { data: orders, error: ordersError } = await supabase
      .from('finishing_orders')
      .select('id, canvas_name, finisher_name, expected_return_date, user_id')
      .eq('alert_enabled', true)
      .not('status', 'in', '("picked_up","paid_in_full")')
      .or(`expected_return_date.eq.${in30Str},expected_return_date.eq.${in7Str},expected_return_date.eq.${yesterdayStr}`)

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return new Response(JSON.stringify({ error: ordersError.message }), { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ message: 'No alerts to send', sent: 0 }), { status: 200 })
    }

    // Get unique user IDs and fetch their info
    const userIds = [...new Set(orders.map((o: AlertOrder) => o.user_id))]
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, notification_prefs')
      .in('id', userIds)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return new Response(JSON.stringify({ error: usersError.message }), { status: 500 })
    }

    const userMap = new Map<string, UserInfo>()
    for (const u of users || []) {
      userMap.set(u.id, u)
    }

    let sentCount = 0

    for (const order of orders as AlertOrder[]) {
      const user = userMap.get(order.user_id)
      if (!user) continue

      // Check if user has email alerts enabled globally
      if (!user.notification_prefs?.email_alerts) continue

      const daysUntil = daysBetween(todayStr, order.expected_return_date)
      let subject: string
      let body: string
      const finisherDisplay = order.finisher_name || 'your finisher'

      if (daysUntil === 30) {
        subject = `Heads up! ${order.canvas_name} is due back in 30 days`
        body = buildEmail(
          user.first_name,
          `Your canvas <strong>${order.canvas_name}</strong> is due back from ${finisherDisplay} in 30 days.`,
          'This is a friendly reminder so you can plan ahead. No action needed right now!'
        )
      } else if (daysUntil === 7) {
        subject = `${order.canvas_name} is due back in just 7 days!`
        body = buildEmail(
          user.first_name,
          `Your canvas <strong>${order.canvas_name}</strong> is due back from ${finisherDisplay} in just 7 days!`,
          'You might want to reach out to confirm it will be ready on time.'
        )
      } else if (daysUntil < 0) {
        subject = `⚠️ ${order.canvas_name} is overdue`
        body = buildEmail(
          user.first_name,
          `Your canvas <strong>${order.canvas_name}</strong> was expected back from ${finisherDisplay} yesterday and hasn't been marked as picked up yet.`,
          'Consider reaching out to check on the status. You can update the order in The Final Stitch once it\'s ready.'
        )
      } else {
        continue
      }

      // Send via Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'The Final Stitch <alerts@thefinalstitch.app>',
          to: [user.email],
          subject,
          html: body,
        }),
      })

      if (res.ok) {
        sentCount++
        console.log(`Sent alert to ${user.email} for order ${order.id}`)
      } else {
        const errBody = await res.text()
        console.error(`Failed to send to ${user.email}:`, errBody)
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sentCount} alert(s)`, sent: sentCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
})

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function daysBetween(fromStr: string, toStr: string): number {
  const from = new Date(fromStr)
  const to = new Date(toStr)
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function buildEmail(firstName: string, mainMessage: string, callToAction: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: 'Inter', Arial, sans-serif; color: #2D2D2D; background-color: #f0f5f2; margin: 0; padding: 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background-color: #7D9E8C; padding: 24px; text-align: center;">
          <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; margin: 0; font-size: 24px;">
            The Final Stitch
          </h1>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${firstName},</p>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">${mainMessage}</p>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.5;">${callToAction}</p>
        </div>
        <div style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">
            You're receiving this because you have alerts enabled for this order.
            <br>Manage alerts in your Final Stitch settings.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}
