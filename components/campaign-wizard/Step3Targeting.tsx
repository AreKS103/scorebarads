"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWizardStore } from "@/lib/store";
import type { CampaignTargeting, DeviceOption, LanguageOption } from "@/lib/types";

const languages: LanguageOption[] = ["English", "Khmer", "Korean", "French"];
const devices: DeviceOption[] = ["MOBILE", "DESKTOP", "TABLET"];

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function Step3Targeting() {
  const { formData, updateSection } = useWizardStore();
  const targeting = formData.targeting;
  const update = (patch: Partial<CampaignTargeting>) => updateSection("targeting", patch);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Location</Label>
          <Select value={targeting.locationPreset} onValueChange={(value) => update({ locationPreset: value as CampaignTargeting["locationPreset"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CAMBODIA">Cambodia</SelectItem>
              <SelectItem value="PHNOM_PENH">Phnom Penh</SelectItem>
              <SelectItem value="BKK1_5KM">BKK1 5km radius</SelectItem>
              <SelectItem value="CUSTOM">Custom geo target constant</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Uses Cambodia and Phnom Penh Google geo target constants by default.</p>
        </div>
        {targeting.locationPreset === "CUSTOM" ? (
          <div className="space-y-2">
            <Label>Custom Geo Target</Label>
            <Input value={targeting.customGeoTarget || ""} onChange={(event) => update({ customGeoTarget: event.target.value })} placeholder="geoTargetConstants/1015069" />
            <p className="text-xs text-muted-foreground">Paste a Google Ads geo target constant.</p>
          </div>
        ) : null}
        {targeting.locationPreset === "BKK1_5KM" ? (
          <div className="space-y-2">
            <Label>Geo Radius (km)</Label>
            <Input type="number" min="1" max="25" value={targeting.geoRadiusKm || 5} onChange={(event) => update({ geoRadiusKm: Number(event.target.value) })} />
            <p className="text-xs text-muted-foreground">Radius is recorded for planning and kept focused around BKK1.</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <Label>Languages</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {languages.map((language) => (
              <label key={language} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium">
                <Checkbox checked={targeting.languages.includes(language)} onCheckedChange={() => update({ languages: toggleValue(targeting.languages, language) })} />
                {language}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Common Score Bar audiences include English, Khmer, Korean and French speakers.</p>
        </div>
        <div className="space-y-3">
          <Label>Devices</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {devices.map((device) => (
              <label key={device} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium">
                <Checkbox checked={targeting.devices.includes(device)} onCheckedChange={() => update({ devices: toggleValue(targeting.devices, device) })} />
                {device.toLowerCase()}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">All devices are enabled by default for private campaign launches.</p>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Ad Schedule</Label>
        <div className="grid gap-3 lg:grid-cols-2">
          {targeting.adSchedule.map((block, index) => (
            <div key={block.day} className="grid grid-cols-[1fr_90px_90px_auto] items-center gap-2 rounded-lg border border-border bg-card p-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Checkbox checked={block.enabled} onCheckedChange={(checked) => {
                  const next = targeting.adSchedule.slice();
                  next[index] = { ...block, enabled: Boolean(checked) };
                  update({ adSchedule: next });
                }} />
                {block.day.slice(0, 3)}
              </label>
              <Input type="number" min="0" max="23" value={block.startHour} onChange={(event) => {
                const next = targeting.adSchedule.slice();
                next[index] = { ...block, startHour: Number(event.target.value) };
                update({ adSchedule: next });
              }} />
              <Input type="number" min="1" max="24" value={block.endHour} onChange={(event) => {
                const next = targeting.adSchedule.slice();
                next[index] = { ...block, endHour: Number(event.target.value) };
                update({ adSchedule: next });
              }} />
              <span className="text-xs text-muted-foreground">hours</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Friday, Saturday and Sunday evenings are preselected for match-night traffic.</p>
      </div>
    </div>
  );
}
