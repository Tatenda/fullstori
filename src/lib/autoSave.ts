/**
 * Auto-save utility with debouncing and localStorage backup
 */

export interface AutoSaveOptions {
  delay?: number; // Debounce delay in milliseconds (default: 5000)
  enableLocalStorage?: boolean; // Backup to localStorage (default: true)
  onSave?: () => Promise<void>; // Save function
  onSaveStart?: () => void; // Called when save starts
  onSaveSuccess?: () => void; // Called when save succeeds
  onSaveError?: (error: Error) => void; // Called when save fails
}

export class AutoSave {
  private timeoutId: NodeJS.Timeout | null = null;
  private isSaving = false;
  private options: Required<AutoSaveOptions>;

  constructor(options: AutoSaveOptions) {
    this.options = {
      delay: options.delay ?? 5000,
      enableLocalStorage: options.enableLocalStorage ?? true,
      onSave: options.onSave ?? (async () => {}),
      onSaveStart: options.onSaveStart ?? (() => {}),
      onSaveSuccess: options.onSaveSuccess ?? (() => {}),
      onSaveError: options.onSaveError ?? (() => {}),
    };
  }

  /**
   * Trigger auto-save (will be debounced)
   */
  trigger(data?: any) {
    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Store data for save (if provided)
    if (data) {
      (this as any).pendingData = data;
    }

    // Backup to localStorage immediately
    if (this.options.enableLocalStorage && data) {
      try {
        localStorage.setItem('madlanga_autosave_backup', JSON.stringify({
          data,
          timestamp: new Date().toISOString(),
        }));
      } catch (error) {
        console.warn('Failed to backup to localStorage:', error);
      }
    }

    // Set new timeout
    this.timeoutId = setTimeout(() => {
      this.save();
    }, this.options.delay);
  }

  /**
   * Immediately save (bypass debounce)
   */
  async saveImmediate() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    await this.save();
  }

  /**
   * Internal save method
   */
  private async save() {
    if (this.isSaving) {
      // If already saving, reschedule
      this.timeoutId = setTimeout(() => this.save(), this.options.delay);
      return;
    }

    this.isSaving = true;
    this.options.onSaveStart();

    try {
      // Call onSave - it should use the latest data from the closure/context
      await this.options.onSave();
      this.options.onSaveSuccess();
      
      // Clear localStorage backup on success
      if (this.options.enableLocalStorage) {
        try {
          localStorage.removeItem('madlanga_autosave_backup');
        } catch (error) {
          console.warn('Failed to clear localStorage backup:', error);
        }
      }
    } catch (error) {
      this.options.onSaveError(error as Error);
    } finally {
      this.isSaving = false;
      this.timeoutId = null;
    }
  }

  /**
   * Cancel pending auto-save
   */
  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Check if there's a localStorage backup
   */
  static hasBackup(): boolean {
    try {
      return localStorage.getItem('madlanga_autosave_backup') !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get localStorage backup
   */
  static getBackup(): any | null {
    try {
      const backup = localStorage.getItem('madlanga_autosave_backup');
      return backup ? JSON.parse(backup) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear localStorage backup
   */
  static clearBackup() {
    try {
      localStorage.removeItem('madlanga_autosave_backup');
    } catch {
      // Ignore errors
    }
  }
}
