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
    fetch("/api/auth/me", { cache: "no-store" }).then(async (authResponse) => {
      const authResult = await authResponse.json().catch(() => ({}));
      if (!authResponse.ok || !authResult.success) return;
      setUserId(authResult.userId);
      const statusResponse = await fetch("/api/google-ads/setup/status", { cache: "no-store" });
      const statusResult = await statusResponse.json().catch(() => ({}));
      if (statusResponse.ok && statusResult.success) {
        setCredentials({
          customer_id: statusResult.credentials.customerId || null,
          manager_customer_id: statusResult.credentials.managerCustomerId || null,
          refresh_token: statusResult.credentials.hasOAuth ? "connected" : null,
          updated_at: null,
        });
      }
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
    const response = await fetch("/api/google-ads/disconnect", { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok && result.success ? "Google Ads credentials disconnected." : result.error || "Disconnect failed.");
    if (response.ok && result.success) setCredentials(null);
  }

  async function clearCachedData() {
    if (!userId) return;
    const response = await fetch("/api/data/clear-cache", { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok && result.success ? "Cached campaign logs and drafts cleared." : result.error || "Could not clear cached data.");
  }

  return (
    <div className="min-h-screen bg-background lg:pl-[240px]">
      <AppHeader />
      <main className="mx-auto max-w-screen-xl space-y-6 px-6 py-6">
        <div className="border-b border-border pb-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Owner controls</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        </div>
        {message ? <Card className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground">{message}</Card> : null}

        <Card>
          <CardHeader><CardTitle>Google Ads Connection</CardTitle></CardHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <StatusBadge status={credentials?.refresh_token ? "ENABLED" : "PAUSED"} />
            </div>
            <div className="space-y-2 rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer ID</p>
              <p className="font-semibold text-foreground">{credentials?.customer_id || "Not connected"}</p>
              {credentials?.manager_customer_id ? <p className="text-sm text-muted-foreground">Manager: {credentials.manager_customer_id}</p> : null}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="ghost" asChild><Link href="/connect"><PlugZap className="h-4 w-4" />Re-connect</Link></Button>
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
