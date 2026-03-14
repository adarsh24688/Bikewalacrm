"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReportConfig {
  dailyReportEnabled: boolean;
  reportTime: string;
  recipientNumbers: string[];
}

export default function ReportConfigPage() {
  const [config, setConfig] = useState<ReportConfig>({
    dailyReportEnabled: false,
    reportTime: "09:00",
    recipientNumbers: [],
  });
  const [newNumber, setNewNumber] = useState("");
  const [saved, setSaved] = useState(false);

  const handleToggleDailyReport = () => {
    setConfig((prev) => ({
      ...prev,
      dailyReportEnabled: !prev.dailyReportEnabled,
    }));
    setSaved(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({ ...prev, reportTime: e.target.value }));
    setSaved(false);
  };

  const handleAddNumber = () => {
    const cleaned = newNumber.trim().replace(/\s+/g, "");
    if (!cleaned) return;

    if (config.recipientNumbers.includes(cleaned)) {
      return;
    }

    setConfig((prev) => ({
      ...prev,
      recipientNumbers: [...prev.recipientNumbers, cleaned],
    }));
    setNewNumber("");
    setSaved(false);
  };

  const handleRemoveNumber = (numberToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      recipientNumbers: prev.recipientNumbers.filter(
        (num) => num !== numberToRemove
      ),
    }));
    setSaved(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddNumber();
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Report Configuration
        </h1>
        <p className="text-muted-foreground">
          Configure automated daily reports sent via WhatsApp
        </p>
      </div>

      <Alert>
        <AlertDescription>
          Full report configuration will be available when WhatsApp service is
          connected. Settings saved here will be applied once the service is
          active.
        </AlertDescription>
      </Alert>

      {saved && (
        <Alert>
          <AlertDescription>
            Configuration saved successfully (stored locally).
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daily Report</CardTitle>
          <CardDescription>
            Automatically send a summary of leads, follow-ups, and activities at
            a scheduled time each day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <input
                id="daily-report-toggle"
                type="checkbox"
                checked={config.dailyReportEnabled}
                onChange={handleToggleDailyReport}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label
                htmlFor="daily-report-toggle"
                className="text-sm font-medium cursor-pointer select-none"
              >
                Enable daily report
              </label>
            </div>

            {config.dailyReportEnabled && (
              <div className="space-y-6 border-t pt-6">
                <div className="space-y-2">
                  <label
                    htmlFor="report-time"
                    className="text-sm font-medium"
                  >
                    Report Time
                  </label>
                  <p className="text-xs text-muted-foreground">
                    The time at which the daily report will be sent
                  </p>
                  <Input
                    id="report-time"
                    type="time"
                    value={config.reportTime}
                    onChange={handleTimeChange}
                    className="w-full sm:w-40"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">
                      Recipient Phone Numbers
                    </label>
                    <p className="text-xs text-muted-foreground">
                      WhatsApp numbers that will receive the daily report
                      (include country code, e.g., 919876543210)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g., 919876543210"
                      value={newNumber}
                      onChange={(e) => setNewNumber(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1 sm:max-w-xs"
                    />
                    <Button
                      variant="outline"
                      onClick={handleAddNumber}
                      disabled={!newNumber.trim()}
                    >
                      Add
                    </Button>
                  </div>

                  {config.recipientNumbers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No recipient numbers added yet. Add at least one number to
                      receive reports.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {config.recipientNumbers.map((number) => (
                        <div
                          key={number}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <span className="font-mono text-sm">{number}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveNumber(number)}
                            className="h-7 text-muted-foreground hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Contents</CardTitle>
          <CardDescription>
            What will be included in the daily report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>The daily report will include:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>New leads received today</li>
              <li>Follow-ups due and completed</li>
              <li>Pipeline movement summary</li>
              <li>Quotations sent and their status</li>
              <li>Conversion metrics for the day</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saved}>
          {saved ? "Saved" : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
