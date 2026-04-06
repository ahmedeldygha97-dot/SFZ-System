import { BackupType } from "@prisma/client";
import { createBackup } from "./backupService.js";
import { getSystemSettings } from "./settingsService.js";

let backupIntervalRef = null;
let schedulerBusy = false;

function getNextDueDate(lastBackupAt, frequency) {
  const baseDate = lastBackupAt ? new Date(lastBackupAt) : new Date(0);
  const dueDate = new Date(baseDate);

  if (frequency === "DAILY") {
    dueDate.setDate(dueDate.getDate() + 1);
  } else if (frequency === "MONTHLY") {
    dueDate.setMonth(dueDate.getMonth() + 1);
  } else {
    dueDate.setDate(dueDate.getDate() + 7);
  }

  return dueDate;
}

async function runBackupCycle() {
  if (schedulerBusy) {
    return;
  }

  schedulerBusy = true;

  try {
    const settings = await getSystemSettings();

    if (!settings.autoBackupEnabled) {
      return;
    }

    const dueDate = getNextDueDate(settings.lastBackupAt, settings.backupFrequency);

    if (dueDate > new Date()) {
      return;
    }

    await createBackup({
      createdById: null,
      type: BackupType.AUTO,
      notes: "Automatic scheduled backup."
    });
  } catch (error) {
    console.error("Automatic backup failed:", error);
  } finally {
    schedulerBusy = false;
  }
}

export function startSchedulers() {
  if (backupIntervalRef) {
    return;
  }

  backupIntervalRef = setInterval(() => {
    runBackupCycle();
  }, 5 * 60 * 1000);

  runBackupCycle();
}
