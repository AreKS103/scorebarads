"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlugZap, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { createClient } from "@/lib/supabase/client";

interface CredentialsView {
  customer_id: string | null;
  manager_customer_id: string | null;
  refresh_token: string | null;
  updated_at: string | null;
}

export default function SettingsPage() {
  const [credentials, setCredentials] = useState<CredentialsView | null>(null);
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [geoTarget, setGeoTarget] = useState("Phnom Penh");
  const [language, setLanguage] = useState("English, Khmer");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: saved } = await supabase.rpc("get_google_ads_credentials", { p_user_id: data.user.id }).single();
      setCredentials(saved as CredentialsView | null);
    });
    setCurrency(window.localStorage.getItem("score.defaultCurrency") || "USD");
    setGeoTarget(window.localStorage.getItem("score.defaultGeoTarget") || "Phnom Penh");
    setLanguage(window.localStorage.getItem("score.defaultLanguage") || "English, Khmer");
  }, []);

  function savePreferences() {
    window.localStorage.setItem("score.defaultCurrency", currency);
    window.localStorage.setItem("score.defaultGeoTarget", geoTarget);
    window.localStorage.setItem("score.defaultLanguage", language);
    setMessage("Preferences saved.");
  }

  async function disconnect() {
    if (!userId) return;
    const { error } = await createClient().from("google_ads_credentials").delete().eq("user_id", userId);
    setMessage(error ? error.message : "Google Ads credentials disconnected.");
    if (!error) setCredentials(null);
  }

  async function clearCachedData() {
    if (!userId) return;
    const supabase = createClient();
    const [campaigns, drafts] = await Promise.all([
      supabase.from("campaigns_log").delete().eq("user_id", userId),
      supabase.from("ad_drafts").delete().eq("user_id", userId),
    ]);
    setMessage(campaigns.error?.message || drafts.error?.message || "Cached campaign logs and drafts cleared.");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Owner controls</p>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>
        {message ? <Card className="border-orange-200 bg-orange-50 text-sm font-medium text-foreground">{message}</Card> : null}

        <Card>
          <CardHeader><CardTitle>Google Ads Connection</CardTitle></CardHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <StatusBadge status={credentials?.refresh_token ? "ENABLED" : "PAUSED"} />
            </div>
            <div className="space-y-2 rounded-lg bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer ID</p>
              <p className="font-semibold text-foreground">{credentials?.customer_id || "Not connected"}</p>
              {credentials?.manager_customer_id ? <p className="text-sm text-muted-foreground">Manager: {credentials.manager_customer_id}</p> : null}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" asChild><Link href="/connect"><PlugZap className="h-4 w-4" />Re-connect</Link></Button>
            <Button variant="destructive" onClick={disconnect}>Disconnect</Button>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>App Preferences</CardTitle></CardHeader>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>Default Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD ($)</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">All campaign spend is displayed in USD.</p></div>
            <div className="space-y-2"><Label>Default Geo Target</Label><Input value={geoTarget} onChange={(event) => setGeoTarget(event.target.value)} /><p className="text-xs text-muted-foreground">Used as a planning preference in new drafts.</p></div>
            <div className="space-y-2"><Label>Default Language</Label><Input value={language} onChange={(event) => setLanguage(event.target.value)} /><p className="text-xs text-muted-foreground">Common audience language defaults.</p></div>
          </div>
          <Button className="mt-5" onClick={savePreferences}>Save Preferences</Button>
        </Card>

        <Card className="border-red-200">
          <CardHeader><CardTitle>Danger Zone</CardTitle></CardHeader>
          <p className="text-sm text-muted-foreground">Clears local Supabase campaign logs and ad drafts. It does not delete campaigns from Google Ads.</p>
          <Button className="mt-4" variant="destructive" onClick={clearCachedData}><Trash2 className="h-4 w-4" />Clear all cached data</Button>
        </Card>
      </main>
    </div>
  );
}
