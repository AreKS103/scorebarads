"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ExternalLink, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { createClient } from "@/lib/supabase/client";
import type { GoogleAdsCredentials } from "@/lib/types";
import { connectCredentialsSchema } from "@/lib/validations";

const formSchema = connectCredentialsSchema.extend({
  refreshTokenSaved: z.boolean().optional(),
});

type ConnectValues = z.infer<typeof formSchema>;

function normalizeCustomerId(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(Number(searchParams.get("step") || 1));
  const [message, setMessage] = useState(searchParams.get("error") || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [userId, setUserId] = useState("");
  const form = useForm<ConnectValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { developerToken: "", clientId: "", clientSecret: "", customerId: "", managerCustomerId: "" },
  });
  const values = form.watch();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
      const { data: credentials } = await supabase.rpc("get_google_ads_credentials", { p_user_id: data.user.id }).single();
      if (credentials) {
        const savedCredentials = credentials as GoogleAdsCredentials;
        form.reset({
          developerToken: savedCredentials.developer_token || "",
          clientId: savedCredentials.client_id || "",
          clientSecret: savedCredentials.client_secret || "",
          customerId: savedCredentials.customer_id || "",
          managerCustomerId: savedCredentials.manager_customer_id || "",
          refreshTokenSaved: Boolean(savedCredentials.refresh_token),
        });
        if (savedCredentials.refresh_token && !searchParams.get("step")) {
          setStep(savedCredentials.customer_id ? 5 : 4);
        }
      }
    });
  }, [form, router, searchParams]);

  const oauthUrl = useMemo(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const params = new URLSearchParams({
      client_id: values.clientId || "",
      redirect_uri: `${appUrl.replace(/\/$/, "")}/api/google-ads/auth/callback`,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/adwords",
      access_type: "offline",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }, [values.clientId]);

  async function saveCredentials(nextStep: number) {
    setMessage("");
    const valid = await form.trigger(["developerToken", "clientId", "clientSecret"]);
    if (!valid || !userId) {
      return;
    }
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("upsert_google_ads_credentials", {
      p_user_id: userId,
      p_client_id: values.clientId,
      p_client_secret: values.clientSecret,
      p_refresh_token: null,
      p_developer_token: values.developerToken,
      p_customer_id: normalizeCustomerId(values.customerId || ""),
      p_manager_customer_id: normalizeCustomerId(values.managerCustomerId || ""),
    });
    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setStep(nextStep);
  }

  async function saveCustomerId() {
    setMessage("");
    const valid = await form.trigger(["customerId"]);
    if (!valid || !userId) return;
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("upsert_google_ads_credentials", {
      p_user_id: userId,
      p_client_id: values.clientId,
      p_client_secret: values.clientSecret,
      p_refresh_token: null,
      p_developer_token: values.developerToken,
      p_customer_id: normalizeCustomerId(values.customerId),
      p_manager_customer_id: normalizeCustomerId(values.managerCustomerId || ""),
    });
    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setStep(5);
  }

  async function testConnection() {
    setMessage("");
    setIsTesting(true);
    const response = await fetch("/api/google-ads/campaigns/list", { cache: "no-store" });
    const result = await response.json();
    setIsTesting(false);
    if (!response.ok || !result.success) {
      setMessage(result.error || "Connection test failed.");
      return;
    }
    setMessage("Connection successful. Redirecting to dashboard.");
    window.setTimeout(() => router.push("/dashboard"), 800);
  }

  const stepLabels = ["Developer token", "OAuth client", "Google account", "Customer ID", "Test"];

  return (
    <main className="min-h-screen bg-background px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Private setup</p>
            <h1 className="text-3xl font-bold text-foreground">Connect Google Ads</h1>
          </div>
          <Button variant="secondary" asChild><Link href="/dashboard">Dashboard</Link></Button>
        </div>
        <ol className="grid gap-2 md:grid-cols-5">
          {stepLabels.map((label, index) => <li key={label} className={`rounded-lg px-3 py-2 text-sm font-semibold ${step === index + 1 ? "bg-primary text-primary-foreground" : step > index + 1 ? "bg-green-100 text-green-700" : "bg-card text-muted-foreground"}`}>{index + 1}. {label}</li>)}
        </ol>
        {message ? <Card className="border-orange-200 bg-orange-50 text-sm font-medium text-foreground">{message}</Card> : null}

        <Card>
          <CardHeader><CardTitle>{stepLabels[Math.max(0, step - 1)]}</CardTitle></CardHeader>
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Developer Token</Label><Input {...form.register("developerToken")} /><p className="text-xs text-muted-foreground">Get this from Google Ads API Center. Basic Access is free and required for Keyword Planner.</p></div>
              {form.formState.errors.developerToken ? <p className="text-sm text-red-600">{form.formState.errors.developerToken.message}</p> : null}
              <Button onClick={() => void saveCredentials(2)} disabled={isSaving}>{isSaving ? <LoadingSpinner /> : <KeyRound className="h-4 w-4" />}Save Developer Token</Button>
              <Button variant="ghost" asChild><a href="https://developers.google.com/google-ads/api/docs/first-call/dev-token" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />How to get it</a></Button>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>OAuth Client ID</Label><Input {...form.register("clientId")} /><p className="text-xs text-muted-foreground">Use a Google Cloud OAuth Web Application client.</p></div>
              <div className="space-y-2"><Label>OAuth Client Secret</Label><Input type="password" {...form.register("clientSecret")} /><p className="text-xs text-muted-foreground">Stored encrypted in Supabase using pgcrypto.</p></div>
              <div className="md:col-span-2"><Button onClick={() => void saveCredentials(3)} disabled={isSaving}>{isSaving ? <LoadingSpinner /> : null}Save OAuth Credentials</Button></div>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Grant this app access to the Google Ads account. The callback stores a refresh token server-side and returns here for the customer ID.</p>
              <Button asChild><a href={oauthUrl}><ExternalLink className="h-4 w-4" />Connect Google Account</a></Button>
            </div>
          ) : null}
          {step === 4 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Customer ID</Label><Input {...form.register("customerId")} placeholder="123-456-7890" /><p className="text-xs text-muted-foreground">Use the Google Ads account ID with or without hyphens.</p></div>
              <div className="space-y-2"><Label>Manager Customer ID</Label><Input {...form.register("managerCustomerId")} placeholder="Optional" /><p className="text-xs text-muted-foreground">Only needed if you access the account through an MCC manager.</p></div>
              <div className="md:col-span-2"><Button onClick={() => void saveCustomerId()} disabled={isSaving}>{isSaving ? <LoadingSpinner /> : null}Save Customer ID</Button></div>
            </div>
          ) : null}
          {step === 5 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Run a GAQL searchStream call to confirm the token, developer token, and customer ID work together.</p>
              <Button onClick={testConnection} disabled={isTesting}>{isTesting ? <LoadingSpinner /> : <CheckCircle2 className="h-4 w-4" />}Test Connection</Button>
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background px-4 py-8 lg:px-8"><Card className="mx-auto max-w-4xl">Loading connection wizard...</Card></main>}>
      <ConnectPageContent />
    </Suspense>
  );
}
