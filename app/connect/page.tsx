"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Copy, ExternalLink, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { connectCredentialsSchema } from "@/lib/validations";

const manualCredentialsSchema = connectCredentialsSchema.pick({
  developerToken: true,
  clientId: true,
  clientSecret: true,
});

type ManualCredentials = z.infer<typeof manualCredentialsSchema>;
type SetupStep = "credentials" | "google" | "customer" | "test";

type SetupStatus = {
  success: boolean;
  appConfig: {
    configured: boolean;
    missing: string[];
    warnings: string[];
    appUrl: string;
    redirectUri: string;
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasDeveloperToken: boolean;
  };
  credentials: {
    saved: boolean;
    hasOAuth: boolean;
    hasCustomerId: boolean;
    customerId: string;
    managerCustomerId: string;
  };
};

type AccessibleCustomer = {
  resourceName: string;
  id: string;
  formattedId: string;
  apiAccessible?: boolean;
  accessError?: string;
  testAccount?: boolean | null;
  descriptiveName?: string;
};

const mockCustomers: AccessibleCustomer[] = [
  { resourceName: "customers/1234567890", id: "1234567890", formattedId: "123-456-7890" },
  { resourceName: "customers/9876543210", id: "9876543210", formattedId: "987-654-3210" },
];

function normalizeCustomerId(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function chooseStep(status: SetupStatus): SetupStep {
  if (!status.appConfig.configured && !status.credentials.saved) return "credentials";
  if (!status.credentials.hasOAuth) return "google";
  if (!status.credentials.hasCustomerId) return "customer";
  return "test";
}

function stepFromSearch(value: string | null): SetupStep | null {
  if (value === "customer" || value === "4") return "customer";
  if (value === "google" || value === "3") return "google";
  if (value === "credentials" || value === "1" || value === "2") return "credentials";
  if (value === "test" || value === "5") return "test";
  return null;
}

function stepIndex(steps: Array<{ id: SetupStep }>, currentStep: SetupStep) {
  return Math.max(0, steps.findIndex((step) => step.id === currentStep));
}

function fallbackSetupStatus(): SetupStatus {
  return {
    success: true,
    appConfig: {
      configured: true,
      missing: [],
      warnings: [],
      appUrl: "http://localhost:3000",
      redirectUri: "http://localhost:3000/api/google-ads/auth/callback",
      hasClientId: true,
      hasClientSecret: true,
      hasDeveloperToken: true,
    },
    credentials: { saved: true, hasOAuth: false, hasCustomerId: false, customerId: "", managerCustomerId: "" },
  };
}

function friendlySetupMessage(message: string) {
  const normalized = message.replace(/_/g, " ");
  const lower = normalized.toLowerCase();

  if (lower.includes("redirect_uri_mismatch")) {
    return "Google rejected the redirect URI. In Google Cloud Console, add the exact redirect URI shown in this wizard to your OAuth Web Client.";
  }
  if (lower.includes("access_denied")) {
    return "Google authorization was cancelled. Click Connect Google account and approve Google Ads access.";
  }
  if (lower.includes("missing oauth state") || lower.includes("expired oauth state")) {
    return "The Google sign-in session expired. Start the Google connection again from this page.";
  }
  if (lower.includes("refresh token")) {
    return "Google did not return a refresh token. Reconnect and approve consent; if it repeats, remove this app from your Google Account third-party access page and connect again.";
  }

  return normalized;
}

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMock = process.env.NODE_ENV !== "production" && searchParams.get("mock") === "1";
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<SetupStep>("google");
  const [message, setMessage] = useState(searchParams.get("error") || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isFetchingCustomers, setIsFetchingCustomers] = useState(false);
  const [userId, setUserId] = useState("");
  const [customers, setCustomers] = useState<AccessibleCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [managerCustomerId, setManagerCustomerId] = useState("");
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const form = useForm<ManualCredentials>({
    resolver: zodResolver(manualCredentialsSchema),
    defaultValues: { developerToken: "", clientId: "", clientSecret: "" },
  });

  async function loadStatus(preferredStep?: SetupStep | null) {
    const response = await fetch("/api/google-ads/setup/status", { cache: "no-store" });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Could not load setup status.");
    }

    let nextStatus = result as SetupStatus;

    if (nextStatus.appConfig.configured && !nextStatus.credentials.saved) {
      const bootstrapResponse = await fetch("/api/google-ads/setup/bootstrap", { method: "POST" });
      const bootstrapResult = await bootstrapResponse.json();
      if (!bootstrapResponse.ok || !bootstrapResult.success) {
        throw new Error(bootstrapResult.error || "Could not prepare Google Ads app credentials.");
      }

      const refreshedResponse = await fetch("/api/google-ads/setup/status", { cache: "no-store" });
      const refreshedResult = await refreshedResponse.json();
      if (!refreshedResponse.ok || !refreshedResult.success) {
        throw new Error(refreshedResult.error || "Could not reload setup status.");
      }
      nextStatus = refreshedResult as SetupStatus;
    }

    setStatus(nextStatus);
    setSelectedCustomerId(nextStatus.credentials.customerId || "");
    setManagerCustomerId(nextStatus.credentials.managerCustomerId || "");
    setCurrentStep(preferredStep || chooseStep(nextStatus));
  }

  useEffect(() => {
    async function prepare() {
      setIsLoading(true);
      setMessage(friendlySetupMessage(searchParams.get("error") || ""));

      if (isMock) {
        setStatus(fallbackSetupStatus());
        setCurrentStep(stepFromSearch(searchParams.get("step")) || "google");
        setCustomers(mockCustomers);
        setIsLoading(false);
        return;
      }

      if (!isSupabaseConfigured()) {
        setMessage("Supabase is not configured yet. Add the anon key and service role key in Vercel and .env.local before testing real login.");
        setIsLoading(false);
        return;
      }

      const authResponse = await fetch("/api/auth/me", { cache: "no-store" });
      const authResult = await authResponse.json().catch(() => ({}));
      if (!authResponse.ok || !authResult.success) {
        router.replace("/login");
        return;
      }

      setUserId(authResult.userId);

      try {
        await loadStatus(stepFromSearch(searchParams.get("step")));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Setup status failed.";
        if (/signed in/i.test(errorMessage)) {
          router.replace("/login");
          return;
        }
        setMessage(friendlySetupMessage(errorMessage));
      } finally {
        setIsLoading(false);
      }
    }

    void prepare();
  }, [isMock, router, searchParams]);

  const steps = useMemo(() => {
    const needsManualCredentials = status ? !status.appConfig.configured : false;
    return [
      ...(needsManualCredentials ? [{ id: "credentials" as const, label: "App credentials" }] : []),
      { id: "google" as const, label: "Google account" },
      { id: "customer" as const, label: "Ads account" },
      { id: "test" as const, label: "Test" },
    ];
  }, [status]);

  async function saveManualCredentials() {
    setMessage("");
    const valid = await form.trigger();
    if (!valid || !userId) return;

    setIsSaving(true);
    const values = form.getValues();
    const response = await fetch("/api/google-ads/setup/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    setIsSaving(false);

    if (!response.ok || !result.success) {
      setMessage(friendlySetupMessage(result.error || "Could not save Google Ads credentials."));
      return;
    }

    await loadStatus("google");
  }

  function simulateGoogleConnect() {
    const connectedStatus = { ...(status || fallbackSetupStatus()), credentials: { ...(status || fallbackSetupStatus()).credentials, hasOAuth: true } };
    setStatus(connectedStatus);
    setMessage("Mock Google account connected.");
    setCurrentStep("customer");
  }

  async function fetchAccessibleCustomers() {
    setMessage("");
    setIsFetchingCustomers(true);

    if (isMock) {
      setCustomers(mockCustomers);
      setIsFetchingCustomers(false);
      return;
    }

    const response = await fetch("/api/google-ads/customers/accessible", { cache: "no-store" });
    const result = await response.json();
    setIsFetchingCustomers(false);

    if (!response.ok || !result.success) {
      setMessage(friendlySetupMessage(result.error || "Could not find accessible Google Ads accounts."));
      return;
    }

    setCustomers(result.customers || []);
    if ((result.customers || []).length === 1) {
      setSelectedCustomerId(result.customers[0].id);
    }
  }

  async function saveCustomer() {
    setMessage("");
    const customerId = normalizeCustomerId(selectedCustomerId);
    const managerId = normalizeCustomerId(managerCustomerId);

    if (!customerId) {
      setMessage("Choose a Google Ads account before continuing.");
      return;
    }

    setIsSaving(true);

    if (isMock) {
      const nextStatus = status || fallbackSetupStatus();
      setStatus({ ...nextStatus, credentials: { ...nextStatus.credentials, hasCustomerId: true, customerId, managerCustomerId: managerId } });
      setIsSaving(false);
      setCurrentStep("test");
      setMessage("Mock Ads account saved.");
      return;
    }

    const response = await fetch("/api/google-ads/setup/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, managerCustomerId: managerId }),
    });
    const result = await response.json();
    setIsSaving(false);

    if (!response.ok || !result.success) {
      setMessage(friendlySetupMessage(result.error || "Could not save the Google Ads customer ID."));
      return;
    }

    await loadStatus("test");
  }

  async function testConnection() {
    setMessage("");
    setIsTesting(true);

    if (isMock) {
      window.setTimeout(() => {
        setIsTesting(false);
        setMessage("Mock connection successful. The real test will run after Supabase and Google env vars are set.");
      }, 400);
      return;
    }

    const response = await fetch("/api/google-ads/campaigns/list", { cache: "no-store" });
    const result = await response.json();
    setIsTesting(false);

    if (!response.ok || !result.success) {
      setMessage(friendlySetupMessage(result.error || "Connection test failed."));
      return;
    }

    setMessage("Connection successful. Redirecting to dashboard.");
    window.setTimeout(() => router.push("/dashboard"), 800);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <LoadingSpinner className="text-muted-foreground" />
      </main>
    );
  }

  const activeIndex = stepIndex(steps, currentStep);
  const appConfigured = Boolean(status?.appConfig.configured);

  return (
    <div className="min-h-screen bg-background lg:pl-[240px]">
      <AppHeader />
      <main className="mx-auto grid max-w-screen-xl gap-6 px-6 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Private setup</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Connect Google Ads</h1>
          </div>
          <ol className="space-y-1">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isComplete = index < activeIndex;
              return (
                <li
                  key={step.id}
                  className={`flex h-8 items-center rounded-sm px-2 text-sm transition-colors ${isActive ? "bg-accent font-medium text-accent-foreground" : isComplete ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                >
                  {index + 1}. {step.label}
                </li>
              );
            })}
          </ol>
          <Card className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            {appConfigured || isMock ? "Google app credentials are handled by the app. You only need to connect Google and choose the Ads account." : "App credentials are missing in environment variables, so this setup includes one admin credential step."}
          </Card>
          <Button variant="ghost" asChild><Link href="/dashboard">Dashboard</Link></Button>
        </aside>

        <section className="space-y-4">
          {isMock ? <Card className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground">Mock setup mode is active for local testing.</Card> : null}
          {message ? <Card className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground">{message}</Card> : null}
          {status?.appConfig.warnings?.length ? (
            <Card className="rounded-lg border border-border bg-card p-4 text-sm text-foreground">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Setup warnings</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {status.appConfig.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </Card>
          ) : null}

          <Card className="rounded-lg border border-border bg-card p-6">
            <CardHeader><CardTitle>{steps[activeIndex]?.label || "Setup"}</CardTitle></CardHeader>

            {currentStep === "credentials" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Developer token</Label>
                  <Input {...form.register("developerToken")} autoComplete="off" />
                  {form.formState.errors.developerToken ? <p className="mt-1.5 text-xs text-destructive">{form.formState.errors.developerToken.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>OAuth client ID</Label>
                  <Input {...form.register("clientId")} autoComplete="off" />
                  {form.formState.errors.clientId ? <p className="mt-1.5 text-xs text-destructive">{form.formState.errors.clientId.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>OAuth client secret</Label>
                  <Input type="password" {...form.register("clientSecret")} autoComplete="off" />
                  {form.formState.errors.clientSecret ? <p className="mt-1.5 text-xs text-destructive">{form.formState.errors.clientSecret.message}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button onClick={() => void saveManualCredentials()} disabled={isSaving}>{isSaving ? <LoadingSpinner /> : <KeyRound className="h-4 w-4" />}Save and continue</Button>
                  <Button variant="ghost" asChild><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Google Cloud</a></Button>
                </div>
              </div>
            ) : null}

            {currentStep === "google" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                  Google will ask for access to Google Ads. After approval, Score Ads stores only the refresh token needed for API calls.
                </div>
                {!isMock && status?.appConfig.redirectUri ? (
                  <div className="rounded-lg border border-border bg-card p-4 text-sm">
                    <p className="font-semibold text-foreground">Required Google OAuth redirect URI</p>
                    <p className="mt-1 text-muted-foreground">Google Cloud Console → APIs &amp; Services → Credentials → your OAuth Web Client → Authorized redirect URIs.</p>
                    <div className="mt-3 flex flex-col gap-2 rounded-md bg-muted p-3 font-mono text-xs text-foreground sm:flex-row sm:items-center sm:justify-between">
                      <span className="break-all">{status.appConfig.redirectUri}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={async () => {
                          await navigator.clipboard.writeText(status.appConfig.redirectUri);
                          setCopiedRedirect(true);
                          window.setTimeout(() => setCopiedRedirect(false), 1600);
                        }}
                      >
                        <Copy className="h-4 w-4" />{copiedRedirect ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {isMock ? (
                    <Button onClick={simulateGoogleConnect}><ShieldCheck className="h-4 w-4" />Simulate Google connect</Button>
                  ) : (
                    <Button asChild><a href="/api/google-ads/auth/start"><ExternalLink className="h-4 w-4" />Connect Google account</a></Button>
                  )}
                  {!appConfigured && !isMock ? <Button variant="ghost" onClick={() => setCurrentStep("credentials")}>Edit app credentials</Button> : null}
                </div>
              </div>
            ) : null}

            {currentStep === "customer" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => void fetchAccessibleCustomers()} disabled={isFetchingCustomers}>
                    {isFetchingCustomers ? <LoadingSpinner /> : <RefreshCw className="h-4 w-4" />}
                    Find accessible accounts
                  </Button>
                  <Button variant="ghost" onClick={() => setCurrentStep("google")}>Reconnect Google</Button>
                </div>

                {customers.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {customers.map((customer) => (
                      <button
                        key={customer.resourceName}
                        type="button"
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className={`rounded-lg border border-border p-4 text-left text-sm transition-colors ${selectedCustomerId === customer.id ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted/50"}`}
                      >
                        <span className="block font-semibold text-foreground">{customer.descriptiveName || customer.formattedId}</span>
                        <span>{customer.formattedId} · {customer.resourceName}</span>
                        {typeof customer.apiAccessible === "boolean" ? (
                          <span className={`mt-3 block text-xs font-medium ${customer.apiAccessible ? "text-muted-foreground" : "text-destructive"}`}>
                            {customer.apiAccessible ? `${customer.testAccount ? "Test account" : "API accessible"}` : customer.accessError || "API access failed"}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">No accounts loaded yet.</div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Selected customer ID</Label>
                    <Input value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} placeholder="123-456-7890" />
                  </div>
                  <div className="space-y-2">
                    <Label>Manager customer ID</Label>
                    <Input value={managerCustomerId} onChange={(event) => setManagerCustomerId(event.target.value)} placeholder="Optional" />
                  </div>
                </div>

                <Button onClick={() => void saveCustomer()} disabled={isSaving}>{isSaving ? <LoadingSpinner /> : <CheckCircle2 className="h-4 w-4" />}Save Ads account</Button>
              </div>
            ) : null}

            {currentStep === "test" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                  The test checks OAuth, developer token, customer ID, and Google Ads API access together.
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void testConnection()} disabled={isTesting}>{isTesting ? <LoadingSpinner /> : <CheckCircle2 className="h-4 w-4" />}Test connection</Button>
                  <Button variant="ghost" asChild><Link href="/create">Create campaign</Link></Button>
                </div>
              </div>
            ) : null}
          </Card>
        </section>
      </main>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-background p-4"><LoadingSpinner className="text-muted-foreground" /></main>}>
      <ConnectPageContent />
    </Suspense>
  );
}